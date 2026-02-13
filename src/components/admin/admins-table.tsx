
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
      if (!userLoading) setLoading(false);
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
        const adminProfile = { id: doc.id, ...doc.data() } as unknown as UserProfile;
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
      toast({ variant: 'destructive', title: 'Action impossible', description: "Vous ne pouvez pas révoquer vos propres privilèges." });
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
      toast({ title: 'Privilèges révoqués', description: `${adminToRevoke.displayName} n'est plus super administrateur.` });
      await fetchAdmins(); // Refetch admins list
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: e.message || 'Impossible de révoquer les privilèges.' });
    } finally {
      setIsRevoking(false);
      setIsRevokeDialogOpen(false);
      setAdminToRevoke(null);
    }
  }


  return (
    <>
      <div className="bg-white rounded-[40px] border border-blue-50/50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-blue-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30">
          <div>
            <h3 className="text-xl font-black text-[#0C365A] font-outfit tracking-tight">Administrateurs Plateforme</h3>
            <p className="text-sm text-slate-400 font-medium">Gestion des accès super-utilisateur du système.</p>
          </div>
          <Button
            onClick={() => setIsGrantDialogOpen(true)}
            className="rounded-2xl bg-[#0C365A] hover:bg-[#0C365A]/90 text-white font-bold h-11 px-6 shadow-lg shadow-blue-900/10 active:scale-95 transition-all"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Accorder des droits
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Collaborateur</TableHead>
                <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Email</TableHead>
                <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Identifiant Unique</TableHead>
                <TableHead className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Sécurité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i} className="border-blue-50/30">
                    <TableCell colSpan={4} className="px-8 py-4"><Skeleton className="h-10 w-full rounded-xl" /></TableCell>
                  </TableRow>
                ))
              ) : admins.length > 0 ? (
                admins.map(admin => (
                  <TableRow key={admin.uid} className="border-blue-50/30 transition-all hover:bg-blue-50/20">
                    <TableCell className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative group">
                          <Avatar className="h-12 w-12 border-2 border-white ring-4 ring-blue-50/50">
                            <AvatarImage src={admin.photoURL || undefined} alt={admin.displayName} />
                            <AvatarFallback className="bg-blue-50 text-[#2D9CDB] font-black">{admin.displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                        </div>
                        <span className="font-black text-[#0C365A] font-outfit">{admin.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm font-bold text-slate-700">{admin.email}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <code className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        {admin.uid}
                      </code>
                    </TableCell>
                    <TableCell className="px-8 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-4 rounded-xl text-rose-500 font-bold hover:bg-rose-50 transition-colors"
                        onClick={() => handleOpenRevokeDialog(admin)}
                        disabled={admin.uid === user?.uid}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Révoquer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="px-8 py-16 text-center text-slate-400 font-bold italic">
                    Aucun super administrateur détecté.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-[#0C365A] font-outfit">Révoquer les privilèges ?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium">
              Êtes-vous sûr de vouloir révoquer les droits de super administrateur pour <strong>{adminToRevoke?.displayName}</strong> ?
              Cette action retirera l'accès complet au système central.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 rounded-2xl border-blue-100 font-bold text-slate-600">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 border-none font-bold shadow-lg shadow-rose-900/20"
              disabled={isRevoking}
            >
              {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer la Révocation
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
