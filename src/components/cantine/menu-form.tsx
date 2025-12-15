
'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { canteenMenu as CanteenMenu } from '@/lib/data-types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { DialogFooter } from '../ui/dialog';

const menuItemSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  priceStudent: z.coerce.number().min(0, 'Le prix doit être positif'),
  priceStaff: z.coerce.number().min(0, 'Le prix doit être positif').optional(),
  allergens: z.string().optional(),
});

const menuCategorySchema = z.object({
  name: z.string().min(1, 'Le nom de la catégorie est requis'),
  items: z.array(menuItemSchema),
});

const menuFormSchema = z.object({
  categories: z.array(menuCategorySchema),
});

type MenuFormValues = z.infer<typeof menuFormSchema>;

interface MenuFormProps {
  schoolId: string;
  menu: CanteenMenu | null;
  date: Date;
  onSave: () => void;
}

export function MenuForm({ schoolId, menu, date, onSave }: MenuFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: MenuFormValues = {
    categories: menu?.categories.map(c => ({
        name: c.name || '',
        items: c.items?.map(i => ({
            name: i.name || '',
            description: i.description || '',
            priceStudent: i.priceStudent || 0,
            priceStaff: i.priceStaff || 0,
            allergens: (i.allergens || []).join(', '),
        })) || [],
    })) || [
        { name: "Entrées", items: [] },
        { name: "Plats principaux", items: [] },
        { name: "Desserts", items: [] },
    ],
  };
  
  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'categories',
  });

  const handleSubmit = async (values: MenuFormValues) => {
    setIsSubmitting(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const menuId = `${dateStr}_dejeuner`;
    const menuRef = doc(firestore, `ecoles/${schoolId}/cantine_menus/${menuId}`);

    const dataToSave: CanteenMenu = {
      date: dateStr,
      mealType: 'dejeuner',
      status: 'published',
      categories: values.categories.map(c => ({
        name: c.name,
        items: c.items.map(i => ({
            ...i,
            allergens: i.allergens ? i.allergens.split(',').map(a => a.trim()).filter(Boolean) : [],
        })),
      })),
    };
    
    try {
        await setDoc(menuRef, dataToSave, { merge: true });
        toast({
            title: 'Menu enregistré',
            description: `Le menu du ${format(date, 'd MMMM yyyy')} a été mis à jour.`
        });
        onSave();
    } catch (e) {
        const permissionError = new FirestorePermissionError({
            path: menuRef.path,
            operation: 'write',
            requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
            {fields.map((field, index) => (
                <Card key={field.id} className="relative">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-destructive"
                        onClick={() => remove(index)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <CardHeader>
                        <FormField
                            control={form.control}
                            name={`categories.${index}.name`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input {...field} className="text-lg font-semibold" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardHeader>
                    <CardContent>
                       <InnerFormItems control={form.control} categoryIndex={index} />
                    </CardContent>
                </Card>
            ))}
             <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => append({ name: 'Nouvelle Catégorie', items: [] })}
                >
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter une catégorie
            </Button>
        </div>
        <DialogFooter>
             <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer le Menu'}
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


function InnerFormItems({ control, categoryIndex }: { control: any, categoryIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `categories.${categoryIndex}.items`
  });

  return (
    <div className="space-y-4">
      {fields.map((item, itemIndex) => (
        <div key={item.id} className="p-3 border rounded-md space-y-2 relative">
           <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 text-destructive/70"
                onClick={() => remove(itemIndex)}
            >
                <Trash2 className="h-3 w-3" />
            </Button>
            <FormField
                control={control}
                name={`categories.${categoryIndex}.items.${itemIndex}.name`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nom du plat</FormLabel>
                        <FormControl><Input placeholder="Ex: Poulet Yassa" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={control}
                name={`categories.${categoryIndex}.items.${itemIndex}.description`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Input placeholder="Description courte (optionnel)" {...field} /></FormControl>
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name={`categories.${categoryIndex}.items.${itemIndex}.priceStudent`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Prix Élève (CFA)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name={`categories.${categoryIndex}.items.${itemIndex}.allergens`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Allergènes</FormLabel>
                            <FormControl><Input placeholder="lactose, gluten..." {...field} /></FormControl>
                        </FormItem>
                    )}
                />
            </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => append({ name: '', priceStudent: 0 })}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Ajouter un plat
      </Button>
    </div>
  );
}
