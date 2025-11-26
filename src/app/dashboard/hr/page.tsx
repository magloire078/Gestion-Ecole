
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, Mail, Phone, BadgeDollarSign, Calendar } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { useAuthProtection } from '@/hooks/use-auth-protection';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  salary?: number;
  hireDate: string;
}

export default function HRPage() {
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();

  // --- Firestore Data Hooks ---
  const staffQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/personnel`) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  const staff: StaffMember[] = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as StaffMember)) || [], [staffData]);

  // --- UI State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  
  const [formState, setFormState] = useState<Omit<StaffMember, 'id'>>({
      name: '',
      role: '',
      email: '',
      phone: '',
      salary: 0,
      hireDate: '',
  });

  useEffect(() => {
    if (isFormOpen && editingStaff) {
      setFormState({
        name: editingStaff.name,
        role: editingStaff.role,
        email: editingStaff.email || '',
        phone: editingStaff.phone || '',
        salary: editingStaff.salary || 0,
        hireDate: editingStaff.hireDate,
      });
    } else {
      setFormState({
        name: '',
        role: '',
        email: '',
        phone: '',
        salary: 0,
        hireDate: format(new Date(), 'yyyy-MM-dd'),
      });
    }
  }, [isFormOpen, editingStaff]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormState(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    if (!schoolId || !formState.name || !formState.role || !formState.hireDate) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Le nom, le rôle et la date d'embauche sont requis." });
      return;
    }
    
    const dataToSave = { ...formState, salary: Number(formState.salary) || 0 };

    try {
        if (editingStaff) {
            const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${editingStaff.id}`);
            await setDoc(staffDocRef, dataToSave, { merge: true });
            toast({ title: "Membre du personnel modifié", description: `Les informations de ${formState.name} ont été mises à jour.` });
        } else {
            const staffCollectionRef = collection(firestore, `ecoles/${schoolId}/personnel`);
            await addDoc(staffCollectionRef, dataToSave);
            toast({ title: "Membre du personnel ajouté", description: `${formState.name} a été ajouté(e) à la liste du personnel.` });
        }
        setIsFormOpen(false);
        setEditingStaff(null);
    } catch (error) {
        const operation = editingStaff ? 'update' : 'create';
        const path = `ecoles/${schoolId}/personnel/${editingStaff?.id || ''}`;
        const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
        errorEmitter.emit('permission-error', permissionError);
    }
  };
  
  const handleDelete = () => {
    if (!schoolId || !staffToDelete) return;
    const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${staffToDelete.id}`);
    deleteDoc(staffDocRef)
      .then(() => {
        toast({ title: "Membre du personnel supprimé", description: `${staffToDelete.name} a été retiré(e) de la liste.` });
        setIsDeleteDialogOpen(false);
        setStaffToDelete(null);
      }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: staffDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleOpenFormDialog = (staffMember: StaffMember | null) => {
    setEditingStaff(staffMember);
    setIsFormOpen(true);
  };
  
  const handleOpenDeleteDialog = (staffMember: StaffMember) => {
    setStaffToDelete(staffMember);
    setIsDeleteDialogOpen(true);
  };

  const isLoading = schoolLoading || staffLoading;

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-lg font-semibold md:text-2xl">Ressources Humaines</h1>
              <p className="text-muted-foreground">Gérez le personnel administratif et de service de votre école.</p>
          </div>
            <Button onClick={() => handleOpenFormDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Membre
            </Button>
        </div>
        
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Salaire Mensuel</TableHead>
                            <TableHead>Embauché le</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : staff.length > 0 ? (
                        staff.map((member) => {
                            const fallback = member.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
                            return (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={`https://picsum.photos/seed/${member.id}/100`} alt={member.name} data-ai-hint="person face" />
                                                <AvatarFallback>{fallback}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-xs text-muted-foreground">{member.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{member.role}</TableCell>
                                    <TableCell className="font-mono">{member.salary ? `${member.salary.toLocaleString('fr-FR')} CFA` : 'N/A'}</TableCell>
                                    <TableCell>{format(parseISO(member.hireDate), 'd MMM yyyy', { locale: fr })}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenFormDialog(member)}>Modifier</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(member)}>Supprimer</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                Aucun membre du personnel n'a été ajouté pour le moment.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
      
       <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingStaff(null); }}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStaff ? "Modifier un Membre" : "Ajouter un Membre du Personnel"}</DialogTitle>
              <DialogDescription>
                {editingStaff ? `Mettez à jour les informations de ${editingStaff.name}.` : "Renseignez les informations du nouveau membre."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nom</Label>
                    <Input id="name" value={formState.name} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">Rôle/Poste</Label>
                    <Input id="role" value={formState.role} onChange={handleInputChange} className="col-span-3" placeholder="Ex: Comptable" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input id="email" type="email" value={formState.email} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">Téléphone</Label>
                    <Input id="phone" type="tel" value={formState.phone} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="salary" className="text-right">Salaire (CFA)</Label>
                    <Input id="salary" type="number" value={formState.salary} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="hireDate" className="text-right">Date d'embauche</Label>
                    <Input id="hireDate" type="date" value={formState.hireDate} onChange={handleInputChange} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button onClick={handleSubmit}>Enregistrer</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le membre du personnel <strong>{staffToDelete?.name}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
