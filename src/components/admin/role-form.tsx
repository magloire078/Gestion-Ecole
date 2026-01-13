
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useFirestore } from '@/firebase';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import type { admin_role as AdminRole } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { DialogFooter } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { allPermissionsList, type PermissionId } from '@/lib/permissions';

const roleFormSchema = z.object({
  name: z.string().min(2, "Le nom du rôle est requis."),
  description: z.string().optional(),
  permissions: z.record(z.boolean()).default({}),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

interface RoleFormProps {
  schoolId: string;
  role: (AdminRole & { id: string }) | null;
  onSave: () => void;
}

export function RoleForm({ schoolId, role, onSave }: RoleFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
  });

  useEffect(() => {
    const defaultPermissions = allPermissionsList.reduce((acc, p) => {
        acc[p.id as PermissionId] = role?.permissions?.[p.id as PermissionId] || false;
        return acc;
    }, {} as Record<PermissionId, boolean>);

    form.reset({
      name: role?.name || '',
      description: role?.description || '',
      permissions: defaultPermissions,
    });
  }, [role, form]);

  const handleSubmit = async (values: RoleFormValues) => {
    setIsSubmitting(true);

    const dataToSave = {
        name: values.name,
        description: values.description || '',
        permissions: values.permissions,
        schoolId: schoolId,
        isSystem: false,
    };
    
    const collectionRef = collection(firestore, `ecoles/${schoolId}/admin_roles`);
    const promise = role 
        ? setDoc(doc(collectionRef, role.id), dataToSave, { merge: true })
        : addDoc(collectionRef, dataToSave);
        
    promise
        .then(() => {
            toast({ title: `Rôle ${role ? 'modifié' : 'créé'}`, description: `Le rôle "${values.name}" a été enregistré.` });
            onSave();
        })
        .catch(e => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `ecoles/${schoolId}/admin_roles/${role?.id || ''}`,
                operation: 'write',
                requestResourceData: dataToSave
            }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nom du Rôle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )}/>
        </div>
        
        <Separator />
        
        <h3 className="font-semibold">Permissions</h3>
        <ScrollArea className="h-72">
            <div className="space-y-4 pr-4">
                {allPermissionsList.map((permission) => (
                  <FormField
                    key={permission.id}
                    control={form.control}
                    name={`permissions.${permission.id}`}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {permission.label}
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">{permission.desc}</p>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onSave}>Annuler</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
