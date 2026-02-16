'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { staff as Staff } from '@/lib/data-types';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ImageUploader } from '../image-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Upload } from 'lucide-react';

const profileSchema = z.object({
    firstName: z.string().min(1, "Le prénom est requis."),
    lastName: z.string().min(1, "Le nom est requis."),
    phone: z.string().optional(),
    photoURL: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function UserProfileForm() {
    const { user, loading, reloadUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phone: '',
            photoURL: '',
        }
    });

    useEffect(() => {
        if (user) {
            form.reset({
                firstName: user.profile?.firstName || '',
                lastName: user.profile?.lastName || '',
                phone: user.profile?.phone || '',
                photoURL: user.photoURL || '',
            });
        }
    }, [user, form]);

    const [photoUrl, setPhotoUrl] = useState<string | null>(user?.photoURL || null);

    useEffect(() => {
        setPhotoUrl(user?.photoURL || null);
    }, [user?.photoURL]);


    const handleSaveChanges = async (values: ProfileFormValues) => {
        if (!user || !user.schoolId || !user.uid) return;

        setIsSaving(true);
        const staffRef = doc(firestore, `ecoles/${user.schoolId}/personnel/${user.uid}`);

        const dataToUpdate = {
            ...values,
            displayName: `${values.firstName} ${values.lastName}`,
            photoURL: photoUrl,
        };

        try {
            await updateDoc(staffRef, dataToUpdate);
            await reloadUser();
            toast({ title: "Profil mis à jour", description: "Vos informations ont été enregistrées." });
        } catch (e) {
            console.error("Error updating profile:", e);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour votre profil." });
        } finally {
            setIsSaving(false);
        }
    };

    const fullName = `${form.getValues('firstName')} ${form.getValues('lastName')}`;
    const fallback = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    if (loading) {
        return <p>Chargement du formulaire...</p>
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Informations Personnelles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="photoURL"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-6">
                                    <FormControl>
                                        <ImageUploader
                                            onUploadComplete={(url) => {
                                                field.onChange(url);
                                                setPhotoUrl(url);
                                            }}
                                            storagePath={`ecoles/${user?.schoolId || 'global'}/staff/${user?.uid}/avatars`}
                                            currentImageUrl={photoUrl}
                                            resizeWidth={400}
                                        >
                                            <Avatar className="h-24 w-24 cursor-pointer border-2 border-muted">
                                                <AvatarImage src={photoUrl || undefined} alt="Photo de profil" />
                                                <AvatarFallback className="text-xl font-bold bg-primary/5 text-primary">
                                                    {fallback}
                                                </AvatarFallback>
                                            </Avatar>
                                        </ImageUploader>
                                    </FormControl>
                                    <div className="flex-1 space-y-1">
                                        <p className="font-semibold">{fullName}</p>
                                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Numéro de téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer les modifications
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    )
}
