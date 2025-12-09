

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
  MoreHorizontal,
  Send,
  Users,
  BookUser,
  ClipboardUser,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
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
    recipients: MessageFormValues['recipients'];
}

export default function MessagingPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const messagesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/messagerie`), orderBy("createdAt", "desc")) : null, [firestore, schoolId]);
  const { data: messagesData, loading: messagesLoading } = useCollection(messagesQuery);
  const messages: Message[] = useMemo(() => messagesData?.map(d => ({ id: d.id, ...d.data() } as Message)) || [], [messagesData]);
  
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const [isFormOpen, setIsFormOpen] = useState(false);
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
    if (!schoolId || !user) return;

    const messageData = {
        ...values,
        senderId: user.uid,
        senderName: user.displayName,
        createdAt: serverTimestamp(),
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

  const isLoading = schoolLoading || messagesLoading || classesLoading;
  
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
                                                        checked={field.value?.includes(c.id)}
                                                        onCheckedChange={(checked) => {
                                                          return checked
                                                            ? field.onChange([...(field.value || []), c.id])
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
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setIsFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Nouveau Message</Button>
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
                            <Send className="mr-2 h-4 w-4" />
                            {form.formState.isSubmitting ? 'Envoi...' : 'Envoyer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
                    messages.map((message) => (
                    <TableRow key={message.id}>
                        <TableCell>{message.createdAt ? format(new Date(message.createdAt.seconds * 1000), 'd MMM yyyy', { locale: fr }) : 'N/A'}</TableCell>
                        <TableCell className="font-medium">{message.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{getRecipientSummary(message.recipients)}</TableCell>
                        <TableCell>{message.senderName}</TableCell>
                    </TableRow>
                    ))
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
    </>
  );
}

