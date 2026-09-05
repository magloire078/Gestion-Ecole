'use client';
import { useMemo, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Loader2, UserPlus } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { UserProfile } from '@/lib/data-types';
import { revokeSuperAdmin, revokeCommercialAccess } from '@/services/admin-services';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { GrantAdminDialog } from './grant-admin-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export function AdminsTable() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [commercials, setCommercials] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'admins' | 'commercials'>('admins');

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
      const usersRef = collection(firestore, 'users');
      const qAdmin = query(usersRef, where('isSuperAdmin', '==', true));
      const qComm = query(usersRef, where('commercialAccess', '==', true));
      
      const [snapAdmin, snapComm] = await Promise.all([
          getDocs(qAdmin), getDocs(qComm)
      ]);

      const superAdmins: UserProfile[] = [];
      snapAdmin.forEach((doc) => superAdmins.push({ uid: doc.id, ...doc.data() } as UserProfile));
      
      const commercialsList: UserProfile[] = [];
      snapComm.forEach((doc) => commercialsList.push({ uid: doc.id, ...doc.data() } as UserProfile));

      setAdmins(superAdmins);
      setCommercials(commercialsList);
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
      if (activeTab === 'commercials') {
          await revokeCommercialAccess(firestore, adminToRevoke.uid, user.uid);
          toast({ title: 'Privilèges révoqués', description: `${adminToRevoke.displayName} n'a plus d'accès commercial.` });
      } else {
          await revokeSuperAdmin(firestore, adminToRevoke.uid, user.uid);
          toast({ title: 'Privilèges révoqués', description: `${adminToRevoke.displayName} n'est plus super administrateur.` });
      }
      await fetchAdmins(); // Refetch admins list
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: e.message || 'Impossible de révoquer les privilèges.' });
    } finally {
      setIsRevoking(false);
      setIsRevokeDialogOpen(false);
      setAdminToRevoke(null);
    }
  }

  const renderTable = (usersList: UserProfile[], emptyMessage: string) => (
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
            ) : usersList.length > 0 ? (
            usersList.map(u => (
                <TableRow key={u.uid} className="border-blue-50/30 dark:border-white/5 transition-all hover:bg-blue-50/20 dark:hover:bg-white/5">
                <TableCell className="px-8 py-4">
                    <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 ring-4 ring-blue-50/50 dark:ring-white/5">
                        <AvatarImage src={u.photoURL || undefined} alt={u.displayName} />
                        <AvatarFallback className="bg-blue-50 dark:bg-white/10 text-[hsl(var(--admin-primary))] font-black">{u.displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full shadow-sm" />
                    </div>
                    <span className="font-black text-[hsl(var(--admin-primary-dark))] dark:text-white font-outfit">{u.displayName}</span>
                    </div>
                </TableCell>
                <TableCell className="py-4">
                    <span className="text-sm font-bold text-slate-700">{u.email}</span>
                </TableCell>
                <TableCell className="py-4">
                    <code className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    {u.uid}
                    </code>
                </TableCell>
                <TableCell className="px-8 py-4 text-right">
                    <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-4 rounded-xl text-rose-500 font-bold hover:bg-rose-50 transition-colors"
                    onClick={() => handleOpenRevokeDialog(u)}
                    disabled={u.uid === user?.uid}
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
                {emptyMessage}
                </TableCell>
            </TableRow>
            )}
        </TableBody>
        </Table>
    </div>
  );


  return (
    <>
      <div className="bg-white dark:bg-[hsl(var(--admin-card))] rounded-xl border border-blue-50/50 dark:border-white/10 shadow-sm overflow-hidden transition-colors duration-500">
        <div className="p-4 md:p-6 border-b border-blue-50/50 dark:border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30 dark:bg-white/5">
          <div>
            <h3 className="text-xl font-black text-[hsl(var(--admin-primary-dark))] dark:text-white font-outfit tracking-tight">Privilèges d'Accès</h3>
            <p className="text-sm text-slate-400 font-medium">Gestion des accès spéciaux sur la plateforme.</p>
          </div>
          <Button
            onClick={() => setIsGrantDialogOpen(true)}
            className="rounded-xl bg-[hsl(var(--admin-primary-dark))] hover:opacity-90 text-white font-bold h-11 px-6 shadow-lg shadow-blue-900/10 active:scale-95 transition-all"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Accorder droits {activeTab === 'commercials' ? 'commercial' : 'admin'}
          </Button>
        </div>
        
        <Tabs defaultValue="admins" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <div className="px-4 pt-4 border-b border-blue-50/50 dark:border-white/10 bg-slate-50/10">
                <TabsList className="bg-slate-100/50 dark:bg-slate-800/50">
                    <TabsTrigger value="admins" className="font-bold">Administrateurs Plateforme</TabsTrigger>
                    <TabsTrigger value="commercials" className="font-bold">Commerciaux (CRM)</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="admins" className="m-0 border-none outline-none">
                {renderTable(admins, "Aucun super administrateur détecté.")}
            </TabsContent>
            
            <TabsContent value="commercials" className="m-0 border-none outline-none">
                {renderTable(commercials, "Aucun profil commercial détecté.")}
            </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <AlertDialogContent className="rounded-xl border-none shadow-2xl p-4 md:p-6 dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-[hsl(var(--admin-primary-dark))] dark:text-white font-outfit">Révoquer les privilèges ?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium">
              Êtes-vous sûr de vouloir révoquer les droits {activeTab === 'commercials' ? 'commerciaux' : 'de super administrateur'} pour <strong>{adminToRevoke?.displayName}</strong> ?
              {activeTab === 'commercials' ? " Cette personne perdra l'accès au CRM prospect." : " Cette action retirera l'accès complet au système central."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 rounded-xl border-blue-100 font-bold text-slate-600">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="h-12 rounded-xl bg-rose-500 hover:bg-rose-600 border-none font-bold shadow-lg shadow-rose-900/20"
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
        roleToGrant={activeTab === 'commercials' ? 'commercial' : 'admin'}
      />
    </>
  );
}

