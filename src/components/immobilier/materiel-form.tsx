

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { materiel as Materiel } from '@/lib/data-types';
import { format } from 'date-fns';
import { Combobox } from '../ui/combobox';
import { Loader2, Package, Upload } from 'lucide-react';
import { ImageUploader } from '../image-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const materielSchema = z.object({
    name: z.string().min(1, "Le nom est requis."),
    category: z.enum(["Mobilier", "Informatique", "Pédagogique", "Sportif", "Autre"]),
    quantity: z.coerce.number().min(1, "La quantité doit être au moins de 1."),
    status: z.enum(["neuf", "bon", "à réparer", "hors_service"]),
    locationId: z.string().min(1, "L'emplacement est requis."),
    acquisitionDate: z.string().optional(),
    value: z.coerce.number().min(0).optional(),
    photoURL: z.string().optional(),
});

type MaterielFormValues = z.infer<typeof materielSchema>;

interface MaterielFormProps {
    schoolId: string;
    materiel: (Materiel & { id: string }) | null;
    locationOptions: { value: string, label: string }[];
    onSave: () => void;
}

export function MaterielForm({ schoolId, materiel, locationOptions, onSave }: MaterielFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<MaterielFormValues>({
        resolver: zodResolver(materielSchema),
    });

    useEffect(() => {
        form.reset(
            materiel
                ? { ...materiel, acquisitionDate: materiel.acquisitionDate ? format(new Date(materiel.acquisitionDate), 'yyyy-MM-dd') : '' }
                : { category: "Mobilier", status: "bon", quantity: 1, locationId: '', name: '', acquisitionDate: format(new Date(), 'yyyy-MM-dd'), photoURL: '' }
        );
    }, [materiel, form]);


    const handleFormSubmit = async (values: MaterielFormValues) => {
        if (!schoolId) return;
        setIsSubmitting(true);
        const dataToSave = { ...values, schoolId };

        const promise = materiel
            ? setDoc(doc(firestore, `ecoles/${schoolId}/inventaire`, materiel.id), dataToSave, { merge: true })
            : addDoc(collection(firestore, `ecoles/${schoolId}/inventaire`), dataToSave);
        try {
            await promise;
            toast({ title: `Matériel ${materiel ? 'modifié' : 'ajouté'}`, description: `L'équipement ${values.name} a été enregistré.` });
            onSave();
        } catch (e) {
            console.error("Error saving material:", e);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer le matériel.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form id="materiel-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                    <FormField
                        control={form.control}
                        name="photoURL"
                        render={({ field }) => (
                            <FormItem className="flex flex-col items-center">
                                <FormControl>
                                    <ImageUploader
                                        onUploadComplete={(url) => field.onChange(url)}
                                        storagePath={`ecoles/${schoolId}/inventory-photos/`}
                                        currentImageUrl={field.value}
                                        resizeWidth={400}
                                    >
                                        <Avatar className="h-28 w-28 cursor-pointer hover:opacity-80 transition-all rounded-2xl border-2 border-white/10 glass shadow-xl">
                                            <AvatarImage src={field.value || undefined} alt="Photo" className="rounded-2xl object-cover" />
                                            <AvatarFallback className="rounded-2xl flex flex-col items-center justify-center space-y-1 bg-white/5">
                                                <Package className="h-10 w-10 text-muted-foreground/50" />
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Photo</span>
                                            </AvatarFallback>
                                        </Avatar>
                                    </ImageUploader>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom de l'équipement</FormLabel><FormControl><Input {...field} className="glass" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="category" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catégorie</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="glass"><SelectValue /></SelectTrigger></FormControl><SelectContent className="glass"><SelectItem value="Mobilier">Mobilier</SelectItem><SelectItem value="Informatique">Informatique</SelectItem><SelectItem value="Pédagogique">Pédagogique</SelectItem><SelectItem value="Sportif">Sportif</SelectItem><SelectItem value="Autre">Autre</SelectItem></SelectContent></Select></FormItem>} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="quantity" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantité</FormLabel><FormControl><Input type="number" {...field} className="glass" /></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="glass"><SelectValue /></SelectTrigger></FormControl><SelectContent className="glass"><SelectItem value="neuf">Neuf</SelectItem><SelectItem value="bon">Bon</SelectItem><SelectItem value="à réparer">À réparer</SelectItem><SelectItem value="hors_service">Hors service</SelectItem></SelectContent></Select></FormItem>} />
                    </div>
                    <FormField
                        control={form.control}
                        name="locationId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emplacement</FormLabel>
                                <FormControl>
                                    <Combobox
                                        placeholder="Choisir..."
                                        searchPlaceholder="Lieu..."
                                        options={locationOptions}
                                        value={field.value || ''}
                                        onValueChange={field.onChange}
                                        onCreate={(value) => {
                                            field.onChange(value);
                                            toast({ title: `Emplacement "${value}"` })
                                            return Promise.resolve({ value, label: value });
                                        }}
                                        className="glass"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="acquisitionDate" render={({ field }) => <FormItem><FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date d'acquisition</FormLabel><FormControl><Input type="date" {...field} className="glass" /></FormControl></FormItem>} />
                </div>
                <DialogFooter className="pt-6 border-t border-white/5">
                    <Button type="button" variant="ghost" onClick={onSave} className="hover:bg-white/5 font-medium">Annuler</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 transition-all active:scale-95 font-semibold px-8">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )
}
