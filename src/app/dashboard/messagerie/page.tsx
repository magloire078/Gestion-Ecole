
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Send, Loader2, Users, Briefcase } from "lucide-react";
import { useState, useMemo } from "react";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useSchoolData } from "@/hooks/use-school-data";
import { collection, query, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import type { message as Message, class_type as Class } from "@/lib/data-types";
import { ScrollArea } from "@/components/ui/scroll-area";


const messageSchema = z.object({
  title: z.string().min(3, "Le sujet est requis."),
  content: z.string().min(10, "Le message est trop court."),
  recipients: z.object({
      all: z.boolean().default(false),
      teachers: z.boolean().default(false),
      staff: z.boolean().default(false),
      classes: z.array(z.string()).default([]),
  }).refine(data => data.all || data.teachers || data.staff || data.classes.length > 0, {
      message: "Veuillez sélectionner au moins un destinataire.",
      path: ["all"],
  })
});

type MessageFormValues = z.infer<typeof messageSchema>;

export default function MessagingPage() {
    const { user } = useUser();
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const canManageCommunication = !!user?.profile?.permissions?.manageCommunication;
    const { toast } = useToast();

    const form = useForm<MessageFormValues>({
        resolver: zodResolver(messageSchema),
        defaultValues: { title: '', content: '', recipients: { all: true, teachers: false, staff: false, classes: [] } },
    });

    const messagesQuery = useMemo(() => 
      schoolId ? query(collection(firestore, `ecoles/${schoolId}/messagerie`), orderBy('createdAt', 'desc'), limit(10)) : null,
    [firestore, schoolId]);
    const { data: messagesData, loading: messagesLoading } = useCollection(messagesQuery);
    
    const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
    const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
    const classes = useMemo(() => classesData?.map(d => ({id: d.id, ...d.data()} as Class & {id: string})) || [], [classesData]);

    const messages = useMemo(() => messagesData?.map(d => ({ id: d.id, ...d.data() } as Message & { id: string })) || [], [messagesData]);
    const isLoading = schoolLoading || messagesLoading || classesLoading;

    const handleSendMessage = async (values: MessageFormValues) => {
        if (!user || !user.uid || !schoolId) return;

        const messageData = {
            ...values,
            schoolId,
            senderId: user.uid,
            senderName: user.displayName || 'Administration',
            createdAt: serverTimestamp(),
            readBy: [],
        };
        
        try {
            await addDoc(collection(firestore, `ecoles/${schoolId}/messagerie`), messageData);
            toast({ title: 'Message envoyé', description: 'Votre message a été envoyé avec succès.' });
            form.reset();
        } catch (error) {
             const permissionError = new FirestorePermissionError({
                path: `ecoles/${schoolId}/messagerie`,
                operation: 'create',
                requestResourceData: messageData
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Messagerie & Annonces</h1>
                <p className="text-muted-foreground">
                    Communiquez avec les parents, les enseignants et le personnel de votre école.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {canManageCommunication && (
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Nouveau Message</CardTitle>
                            <CardDescription>Rédigez et envoyez une nouvelle annonce.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleSendMessage)} className="space-y-6">
                                    <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Sujet</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} rows={6} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="recipients" render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Destinataires</FormLabel>
                                          <div className="p-3 border rounded-md space-y-3">
                                            <div className="flex items-center space-x-2"><Checkbox id="all" checked={field.value.all} onCheckedChange={checked => form.setValue('recipients.all', !!checked)}/><Label htmlFor="all">Toute l'école</Label></div>
                                            <div className="flex items-center space-x-2"><Checkbox id="teachers" checked={field.value.teachers} onCheckedChange={checked => form.setValue('recipients.teachers', !!checked)} /><Label htmlFor="teachers">Enseignants</Label></div>
                                            <div className="flex items-center space-x-2"><Checkbox id="staff" checked={field.value.staff} onCheckedChange={checked => form.setValue('recipients.staff', !!checked)} /><Label htmlFor="staff">Personnel non-enseignant</Label></div>
                                            <div>
                                                <Label>Classes spécifiques</Label>
                                                <ScrollArea className="h-32 mt-2 border rounded-md p-2">
                                                    {classes.map(c => (
                                                         <FormField key={c.id} control={form.control} name="recipients.classes" render={({ field }) => (
                                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 my-2">
                                                              <FormControl>
                                                                <Checkbox
                                                                  checked={field.value?.includes(c.id!)}
                                                                  onCheckedChange={(checked) => {
                                                                    return checked
                                                                      ? field.onChange([...field.value, c.id!])
                                                                      : field.onChange(field.value?.filter((value) => value !== c.id!))
                                                                  }}
                                                                />
                                                              </FormControl>
                                                              <FormLabel className="font-normal">{c.name}</FormLabel>
                                                            </FormItem>
                                                         )} />
                                                    ))}
                                                </ScrollArea>
                                            </div>
                                          </div>
                                          <FormMessage />
                                        </FormItem>
                                    )} />
                                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                                        Envoyer le message
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                )}

                <Card className={canManageCommunication ? "lg:col-span-2" : "lg:col-span-3"}>
                    <CardHeader>
                        <CardTitle>Messages Récents</CardTitle>
                        <CardDescription>Liste des 10 dernières annonces envoyées.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full"/>)
                            ) : messages.length > 0 ? (
                                messages.map(message => (
                                    <div key={message.id} className="p-4 border rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold">{message.title}</h3>
                                            <p className="text-xs text-muted-foreground">{message.createdAt ? formatDistanceToNow(new Date(message.createdAt.seconds * 1000), { addSuffix: true, locale: fr }) : ''}</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{message.content}</p>
                                        <p className="text-xs text-muted-foreground mt-2">Envoyé par : <strong>{message.senderName}</strong></p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground py-8">Aucun message n'a encore été envoyé.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
