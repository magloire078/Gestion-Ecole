
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
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
import { allPermissionsList, permissionCategories, type PermissionId, type PermissionCategory } from '@/lib/permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, GraduationCap, Wallet, Bell, Settings, CheckSquare, Square } from 'lucide-react';

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

const categoryIcons: Record<string, any> = {
  users: Users,
  pedagogy: GraduationCap,
  finance: Wallet,
  services: Bell,
  admin: Settings,
};

export function RoleForm({ schoolId, role, onSave }: RoleFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
  });

  useEffect(() => {
    const defaultPermissions = allPermissionsList.reduce((acc, p) => {
        acc[p.id] = role?.permissions?.[p.id] || false;
        return acc;
    }, {} as Record<string, boolean>);

    form.reset({
      name: role?.name || '',
      description: role?.description || '',
      permissions: defaultPermissions,
    });
  }, [role, form]);

  const handleSelectAllCategory = (categoryId: string, value: boolean) => {
    const categoryPermissions = allPermissionsList.filter(p => p.category === categoryId);
    const currentPermissions = form.getValues('permissions');
    
    categoryPermissions.forEach(p => {
      currentPermissions[p.id] = value;
    });
    
    form.setValue('permissions', { ...currentPermissions });
  };

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
        
    try {
        await promise;
        toast({ title: `Rôle ${role ? 'modifié' : 'créé'}`, description: `Le rôle "${values.name}" a été enregistré.` });
        onSave();
    } catch(e) {
        console.error("Error saving role:", e);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer le rôle.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Rôle</FormLabel>
                  <FormControl><Input placeholder="ex: Comptable, Préfet..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Input placeholder="Bève description des responsabilités" {...field} /></FormControl>
                </FormItem>
            )}/>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Configuration des Permissions</h3>
          </div>
          
          <Tabs defaultValue={permissionCategories[0].id} className="w-full">
            <TabsList className="grid grid-cols-3 md:grid-cols-5 h-auto p-1 bg-muted">
              {permissionCategories.map(cat => {
                const Icon = categoryIcons[cat.id];
                return (
                  <TabsTrigger key={cat.id} value={cat.id} className="flex flex-col gap-1 py-2 text-xs md:text-sm">
                    {Icon && <Icon className="h-4 w-4" />}
                    <span className="hidden md:inline">{cat.label.split(' ')[0]}</span>
                    <span className="md:hidden">{cat.label.charAt(0)}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {permissionCategories.map(cat => (
              <TabsContent key={cat.id} value={cat.id} className="space-y-4 pt-4 border rounded-md p-4 mt-2">
                <div className="flex justify-between items-center mb-4 pb-2 border-b">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">{cat.label}</h4>
                    <p className="text-xs text-muted-foreground">Définissez les accès pour cette catégorie.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSelectAllCategory(cat.id, true)}
                      className="h-8 text-xs"
                    >
                      <CheckSquare className="mr-2 h-3 w-3" /> Tout
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSelectAllCategory(cat.id, false)}
                      className="h-8 text-xs"
                    >
                      <Square className="mr-2 h-3 w-3" /> Aucun
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-64">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                    {allPermissionsList.filter(p => p.category === cat.id).map((permission) => (
                      <FormField
                        key={permission.id}
                        control={form.control}
                        name={`permissions.${permission.id}`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 hover:bg-accent/50 transition-colors">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                {permission.label}
                              </FormLabel>
                              <p className="text-[10px] text-muted-foreground line-clamp-2">
                                {permission.desc}
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <Separator />
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onSave} disabled={isSubmitting}>Annuler</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer le rôle'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
