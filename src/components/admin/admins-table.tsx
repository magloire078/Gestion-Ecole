
'use client';
import { useMemo, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Loader2, UserPlus } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { UserProfile } from '@/lib/data-types';
import { revokeSuperAdmin } from '@/services/admin-services';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { GrantAdminDialog } from './grant-admin-dialog';


export function AdminsTable() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [adminToRevoke, setAdminToRevoke] = useState<UserProfile | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);


  const fetchAdmins = async () => {
      if (!firestore || !user?.profile?.isAdmin) {
          if(!userLoading) setLoading(false);
          return;
      };
      setLoading(true);
      try {
        // Find all staff members that are admins
        const staffQuery = query(collectionGroup(firestore, 'personnel'), where('isAdmin', '==', true));
        const staffSnapshot = await getDocs(staffQuery);
        
        // Use a map to avoid duplicates if a user is admin in multiple schools (though unlikely for super admin)
        const adminMap = new Map<string, UserProfile>();
        staffSnapshot.forEach(doc => {
            const adminProfile = { id: doc.id, ...doc.data() } as UserProfile;
            adminMap.set(adminProfile.uid, adminProfile);
        });

        setAdmins(Array.from(adminMap.values()));
      } catch (error) {
        console.error("Error fetching admins:", error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (!userLoading) {
      fetchAdmins();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, user?.profile?.isAdmin, userLoading]);
  
  const handleOpenRevokeDialog = (admin: UserProfile) => {
      if (admin.uid === user?.uid) {
          toast({ variant: 'destructive', title: 'Action impossible', description: "Vous ne pouvez pas révoquer vos propres privilèges."});
          return;
      }
      setAdminToRevoke(admin);
      setIsRevokeDialogOpen(true);
  }

  const handleRevoke = async () => {
    if (!adminToRevoke || !user?.uid) return;
    setIsRevoking(true);
    try {
        await revokeSuperAdmin(firestore, adminToRevoke.uid, user.uid);
        toast({ title: 'Privilèges révoqués', description: `${adminToRevoke.displayName} n'est plus super administrateur.`});
        await fetchAdmins(); // Refetch admins list
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Erreur', description: e.message || 'Impossible de révoquer les privilèges.'});
    } finally {
        setIsRevoking(false);
        setIsRevokeDialogOpen(false);
        setAdminToRevoke(null);
    }
  }


  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Administrateurs de la Plateforme</CardTitle>
            <CardDescription>Liste des utilisateurs ayant des privilèges de super administrateur.</CardDescription>
        </div>
         <Button onClick={() => setIsGrantDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Accorder des droits
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Administrateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>ID Utilisateur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                [...Array(1)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                ))
            ) : admins.length > 0 ? (
                admins.map(admin => (
                    <TableRow key={admin.uid}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={admin.photoURL || undefined} alt={admin.displayName} />
                                    <AvatarFallback>{admin.displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{admin.displayName}</span>
                            </div>
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell className="font-mono text-xs">{admin.uid}</TableCell>
                        <TableCell className="text-right">
                             <Button variant="ghost" size="sm" onClick={() => handleOpenRevokeDialog(admin)} disabled={admin.uid === user?.uid}>
                               <Trash2 className="h-4 w-4 mr-2 text-destructive" /> Révoquer
                            </Button>
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">Aucun super administrateur trouvé.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Révoquer les privilèges ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Êtes-vous sûr de vouloir révoquer les droits de super administrateur pour <strong>{adminToRevoke?.displayName}</strong> ?
                    Cette action est réversible.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleRevoke} className="bg-destructive hover:bg-destructive/90" disabled={isRevoking}>
                    {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Révoquer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    <GrantAdminDialog 
        isOpen={isGrantDialogOpen} 
        onOpenChange={setIsGrantDialogOpen}
        onAdminGranted={fetchAdmins}
    />
    </>
  );
}
