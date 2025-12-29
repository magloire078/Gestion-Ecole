
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);

  const classesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

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
    if (!firestore || !schoolId || !user) return;

    const fetchMessages = async () => {
        setMessagesLoading(true);
        const messageCollection = collection(firestore, `ecoles/${schoolId}/messagerie`);
        const queries: Query<DocumentData>[] = [];
        
        // 1. Messages for everyone
        queries.push(query(messageCollection, where('recipients.all', '==', true), orderBy('createdAt', 'desc'), limit(50)));

        // 2. Messages for staff/teachers if user is one
        if (user.profile) {
            queries.push(query(messageCollection, where('recipients.teachers', '==', true), orderBy('createdAt', 'desc'), limit(50)));
            queries.push(query(messageCollection, where('recipients.staff', '==', true), orderBy('createdAt', 'desc'), limit(50)));
        }

        // 3. Messages for the user's class
        if (user.profile?.classId) {
            queries.push(query(messageCollection, where('recipients.classes', 'array-contains', user.profile.classId), orderBy('createdAt', 'desc'), limit(50)));
        }
        
        try {
            const querySnapshots = await Promise.all(queries.map(q => getDocs(q)));
            const allMessages = new Map<string, Message>();
            
            querySnapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    if (!allMessages.has(doc.id)) {
                        allMessages.set(doc.id, { id: doc.id, ...doc.data() } as Message);
                    }
                });
            });

            const sortedMessages = Array.from(allMessages.values()).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
            setMessages(sortedMessages);
        } catch (error) {
            console.error("Error fetching messages:", error);
            toast({ variant: 'destructive', title: "Erreur de chargement", description: "Impossible de récupérer les messages." });
        } finally {
            setMessagesLoading(false);
        }
    };

    fetchMessages();
  }, [firestore, schoolId, user, toast]);

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
    .then(() => {
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
    if (!message.readBy?.includes(user?.uid || '')) {
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
            <h2 className="text-xl font-semibold">Historique des envois</h2>
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
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Destinataires</TableHead>
                  <TableHead>Auteur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        </TableRow>
                    ))
                ) : messages.length > 0 ? (
                    messages.map((message) => {
                        const isRead = message.readBy?.includes(user?.uid || '');
                        return (
                             <TableRow key={message.id} className="cursor-pointer" onClick={() => handleViewMessage(message)}>
                                <TableCell className={!isRead ? 'font-bold' : ''}>{message.createdAt ? formatDistanceToNow(new Date(message.createdAt.seconds * 1000), { addSuffix: true, locale: fr }) : '...'}</TableCell>
                                <TableCell className={cn("font-medium", !isRead && 'font-bold')}>{message.title}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{getRecipientSummary(message.recipients)}</TableCell>
                                <TableCell>{message.senderName}</TableCell>
                            </TableRow>
                        )
                    })
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">Aucun message envoyé pour le moment.</TableCell>
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
