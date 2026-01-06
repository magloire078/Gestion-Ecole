
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Send,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, doc, updateDoc, arrayUnion, query, orderBy, serverTimestamp, where, getDocs, limit, Query, DocumentData } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from "@/components/ui/checkbox";
import type { class_type as Class } from '@/lib/data-types';
import { cn } from "@/lib/utils";

const messageSchema = z.object({
    title: z.string().min(1, { message: "Le titre est requis." }),
    content: z.string().min(1, { message: "Le contenu du message est requis." }),
    recipients: z.object({
        all: z.boolean().default(false),
        teachers: z.boolean().default(false),
        staff: z.boolean().default(false),
        classes: z.array(z.string()).default([]),
    }).refine(data => data.all || data.teachers || data.staff || data.classes.length > 0, {
        message: "Veuillez sélectionner au moins un destinataire.",
        path: ['all'],
    })
});

type MessageFormValues = z.infer<typeof messageSchema>;

interface Message {
    id: string;
    title: string;
    content: string;
    senderName: string;
    createdAt: { seconds: number, nanoseconds: number };
    readBy?: string[];
    recipients: MessageFormValues['recipients'];
}

export default function MessagingPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const canManageCommunication = !!user?.profile?.permissions?.manageCommunication;

  const classesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  // Requête corrigée pour ne récupérer que les messages généraux
  const messagesQuery = useMemoFirebase(() => {
    if (!schoolId) return null;
    return query(
      collection(firestore, `ecoles/${schoolId}/messagerie`),
      where('recipients.all', '==', true),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }, [firestore, schoolId]);
  const { data: messagesData, loading: messagesLoading } = useCollection(messagesQuery);
  const messages = useMemo(() => messagesData?.map(d => ({ id: d.id, ...d.data() } as Message)) || [], [messagesData]);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewedMessage, setViewedMessage] = useState<Message | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
        title: "",
        content: "",
        recipients: {
            all: false,
            teachers: false,
            staff: false,
            classes: [],
        }
    },
  });

  useEffect(() => {
    if (isFormOpen) {
        form.reset();
    }
  }, [isFormOpen, form]);
  
  const handleMessageSubmit = (values: MessageFormValues) => {
    if (!schoolId || !user?.authUser || !user.authUser.displayName) return;

    const messageData = {
        ...values,
        schoolId,
        senderId: user.authUser.uid,
        senderName: user.authUser.displayName,
        createdAt: serverTimestamp(),
        readBy: [], // Initialise as empty
    };

    const messagesCollectionRef = collection(firestore, `ecoles/${schoolId}/messagerie`);
    addDoc(messagesCollectionRef, messageData)
    .then((newDoc) => {
        toast({ title: "Message envoyé", description: `Votre message a bien été envoyé.` });
        setIsFormOpen(false);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: messagesCollectionRef.path, operation: 'create', requestResourceData: messageData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleViewMessage = async (message: Message) => {
    setViewedMessage(message);
    setIsViewOpen(true);
    // Mark as read optimistically on the client
    const isAlreadyRead = message.readBy?.includes(user?.uid || '');
    if (!isAlreadyRead) {
        const notifRef = doc(firestore, `ecoles/${schoolId}/messagerie/${message.id}`);
        await updateDoc(notifRef, { readBy: arrayUnion(user?.uid) });
    }
  };

  const getRecipientSummary = (recipients: MessageFormValues['recipients']) => {
    if (recipients.all) return 'Toute l\'école';
    const parts = [];
    if(recipients.teachers) parts.push('Enseignants');
    if(recipients.staff) parts.push('Personnel');
    if(recipients.classes && recipients.classes.length > 0) {
        const classNames = recipients.classes.map(id => classes.find(c => c.id === id)?.name || id.substring(0,5)).join(', ');
        parts.push(classNames);
    }
    return parts.join(', ');
  }

  const isLoading = schoolLoading || messagesLoading || classesLoading || userLoading;
  
  const renderFormContent = () => (
    <Form {...form}>
        <form id="message-form" onSubmit={form.handleSubmit(handleMessageSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Titre</FormLabel>
                    <FormControl>
                        <Input placeholder="Objet du message" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Rédigez votre message ici..." rows={6} {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="recipients"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Destinataires</FormLabel>
                        <FormControl>
                            <div className="p-4 border rounded-md space-y-4">
                               <FormField
                                    control={form.control}
                                    name="recipients.all"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            <FormLabel className="font-normal">Toute l'école (Parents, Enseignants, Personnel)</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-center gap-4">
                                     <FormField
                                        control={form.control}
                                        name="recipients.teachers"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                <FormLabel className="font-normal">Tous les enseignants</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="recipients.staff"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                <FormLabel className="font-normal">Tout le personnel</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Classes spécifiques</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {classes.map((c) => (
                                            <FormField
                                                key={c.id}
                                                control={form.control}
                                                name="recipients.classes"
                                                render={({ field }) => {
                                                return (
                                                  <FormItem key={c.id} className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                      <Checkbox
                                                        checked={field.value?.includes(c.id!)}
                                                        onCheckedChange={(checked) => {
                                                          return checked
                                                            ? field.onChange([...(field.value || []), c.id!])
                                                            : field.onChange(
                                                                field.value?.filter(
                                                                  (value) => value !== c.id
                                                                )
                                                              )
                                                        }}
                                                      />
                                                    </FormControl>
                                                    <FormLabel className="text-sm font-normal">{c.name}</FormLabel>
                                                  </FormItem>
                                                )
                                              }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </FormControl>
                         <FormMessage />
                    </FormItem>
                )}
            />
        </form>
    </Form>
  );

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Messagerie</h1>
          <p className="text-muted-foreground">
            Communiquez avec les parents, les enseignants et le personnel de votre école.
          </p>
        </div>

        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Boîte de réception</h2>
            {canManageCommunication && (
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setIsFormOpen(true)}>
                        <span className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" /> Nouveau Message
                        </span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Envoyer un nouveau message</DialogTitle>
                            <DialogDescription>Rédigez votre message et choisissez les destinataires.</DialogDescription>
                        </DialogHeader>
                        {renderFormContent()}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                            <Button type="submit" form="message-form" disabled={form.formState.isSubmitting}>
                            <span className="flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                {form.formState.isSubmitting ? 'Envoi...' : 'Envoyer'}
                            </span>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="w-8"><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
                            <TableCell className="w-40"><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell className="w-32"><Skeleton className="h-5 w-24" /></TableCell>
                        </TableRow>
                    ))
                ) : messages.length > 0 ? (
                    messages.map((message) => {
                        const isRead = message.readBy?.includes(user?.uid || '');
                        return (
                             <TableRow key={message.id} className={cn("cursor-pointer", !isRead && "bg-muted/50")} onClick={() => handleViewMessage(message)}>
                                <TableCell className="w-8 px-2 text-center">
                                    {!isRead && <div className="h-2.5 w-2.5 rounded-full bg-primary" title="Non lu"></div>}
                                </TableCell>
                                <TableCell className={cn("w-40 font-medium", !isRead && "font-bold")}>{message.senderName}</TableCell>
                                <TableCell>
                                    <span className={cn("font-medium", !isRead && "font-bold")}>{message.title}</span>
                                    <span className="text-muted-foreground text-sm"> - {message.content.substring(0, 100)}...</span>
                                </TableCell>
                                <TableCell className={cn("w-40 text-right text-sm", !isRead ? "text-foreground font-medium" : "text-muted-foreground")}>
                                  {message.createdAt?.seconds ? formatDistanceToNow(new Date(message.createdAt.seconds * 1000), { addSuffix: true, locale: fr }) : '...'}
                                </TableCell>
                            </TableRow>
                        )
                    })
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">Boîte de réception vide.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* View Message Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewedMessage?.title}</DialogTitle>
            <DialogDescription>
              Envoyé par {viewedMessage?.senderName} le {viewedMessage?.createdAt ? format(new Date(viewedMessage.createdAt.seconds * 1000), 'd MMMM yyyy à HH:mm', { locale: fr }) : ''}
              <br />
              À : {viewedMessage ? getRecipientSummary(viewedMessage.recipients) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 whitespace-pre-wrap text-sm max-h-[60vh] overflow-y-auto">
            {viewedMessage?.content}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
