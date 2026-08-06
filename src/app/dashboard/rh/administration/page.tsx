'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Edit,
  Loader2,
  Check,
  Search,
  Lock
} from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { staff as Staff } from '@/lib/data-types';

export default function RhAdministrationPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  // États
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<(Staff & { id: string }) | null>(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Habilitations locales temporaires
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    manageUsers: false,
    manageBilling: false,
    manageClasses: false,
    manageSchedule: false,
    manageAttendance: false,
    manageGrades: false,
    manageDiscipline: false,
  });

  // Charger tous les membres du personnel de l'école
  const staffQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  const staffList = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [staffData]);

  // Filtrer pour n'afficher que les utilisateurs ayant un accès administratif potentiel
  const adminStaffList = useMemo(() => {
    return staffList.filter(s => {
      const isPotentialAdmin = s.isAdmin || ['directeur', 'directeur_pedagogique', 'secretaire', 'comptable'].includes(s.role);
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const matchSearch = searchTerm === '' || fullName.includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase());
      return isPotentialAdmin && matchSearch;
    });
  }, [staffList, searchTerm]);

  // Ouvrir la boîte de dialogue d'édition des permissions
  const handleOpenPermissions = (member: Staff & { id: string }) => {
    setSelectedStaff(member);
    
    // Déterminer les permissions existantes (ou mettre false par défaut)
    const currentPerms = (member as any).permissions || {};
    setPermissions({
      manageUsers: !!currentPerms.manageUsers,
      manageBilling: !!currentPerms.manageBilling,
      manageClasses: !!currentPerms.manageClasses,
      manageSchedule: !!currentPerms.manageSchedule,
      manageAttendance: !!currentPerms.manageAttendance,
      manageGrades: !!currentPerms.manageGrades,
      manageDiscipline: !!currentPerms.manageDiscipline,
    });
    
    setIsPermissionDialogOpen(true);
  };

  const handleTogglePermission = (key: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  // Enregistrer les modifications
  const handleSavePermissions = async () => {
    if (!schoolId || !selectedStaff) return;

    setIsSaving(true);
    try {
      const staffDocRef = doc(firestore, `ecoles/${schoolId}/personnel/${selectedStaff.id}`);
      
      // Mettre à jour l'objet permissions et isAdmin dans Firestore
      await updateDoc(staffDocRef, {
        isAdmin: Object.values(permissions).some(Boolean),
        permissions: permissions,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Habilitations mises à jour",
        description: `Les droits d'accès de ${selectedStaff.firstName} ${selectedStaff.lastName} ont été modifiés.`
      });

      setIsPermissionDialogOpen(false);
      setSelectedStaff(null);
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de modifier les droits d\'accès.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = schoolLoading || staffLoading;

  // Liste des permissions explicites à afficher
  const permissionMeta = [
    { key: 'manageUsers', label: 'Gestion des Élèves & Parents', desc: 'Inscrire, modifier et radier les élèves et profils parents.' },
    { key: 'manageBilling', label: 'Gestion Financière & Tarifs', desc: 'Définir les tarifs, enregistrer les versements et sorties de caisse.' },
    { key: 'manageClasses', label: 'Gestion Pédagogique & Classes', desc: 'Créer des classes, attribuer des matières et des cycles.' },
    { key: 'manageSchedule', label: 'Gestion des Emplois du Temps', desc: 'Éditer et attribuer les emplois du temps des classes.' },
    { key: 'manageAttendance', label: 'Suivi des Présences', desc: 'Saisir les absences et retards des élèves.' },
    { key: 'manageGrades', label: 'Gestion des Évaluations & Notes', desc: 'Saisir les notes, calculer les moyennes et imprimer les bulletins.' },
    { key: 'manageDiscipline', label: 'Suivi Disciplinaire', desc: 'Enregistrer les avertissements, exclusions et sanctions.' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Habilitations & Sécurité RH</h1>
        <p className="text-sm text-slate-500 font-medium">
          Gérez les droits d&apos;accès administratifs et les permissions des membres de la direction et du secrétariat.
        </p>
      </div>

      {/* Recherche & Filtre */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher un administrateur..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-xl border-slate-200 bg-white"
          />
        </div>
      </div>

      {/* Liste des administrateurs */}
      <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70 border-b">
              <TableRow>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Utilisateur</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Rôle Métier</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Accès Admin</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Permissions Actives</TableHead>
                <TableHead className="w-[100px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminStaffList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                    Aucun membre administratif trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                adminStaffList.map((member) => {
                  const memberPerms = (member as any).permissions || {};
                  const activePermKeys = Object.keys(memberPerms).filter(k => memberPerms[k]);
                  
                  return (
                    <TableRow key={member.id} className="hover:bg-slate-50/40">
                      <TableCell>
                        <div>
                          <p className="font-bold text-slate-900">{member.firstName} {member.lastName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{member.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-xs font-semibold text-slate-600">
                        {member.role.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        {member.isAdmin ? (
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/50 rounded-md gap-1">
                            <ShieldCheck className="h-3 w-3" /> Activé
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-200 rounded-md gap-1">
                            <Lock className="h-3 w-3" /> Restreint
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {activePermKeys.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Aucune permission active</span>
                          ) : (
                            activePermKeys.map(k => (
                              <Badge key={k} variant="secondary" className="text-[9px] font-bold bg-indigo-50 text-indigo-700 rounded-md">
                                {k.replace('manage', '')}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-xl hover:bg-slate-50 text-indigo-600 font-bold text-xs gap-1"
                          onClick={() => handleOpenPermissions(member)}
                        >
                          <Edit className="h-3.5 w-3.5" /> Habiliter
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal d'édition des habilitations */}
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white border shadow-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader className="border-b pb-4 mb-2">
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" /> Droits d&apos;accès : {selectedStaff?.firstName} {selectedStaff?.lastName}
            </DialogTitle>
            <DialogDescription className="text-xs">Configurez les habilitations de sécurité pour cet utilisateur.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {permissionMeta.map((p) => (
              <div key={p.key} className="flex items-start gap-3 p-3 border rounded-xl hover:bg-slate-50/50 transition-colors">
                <Checkbox 
                  id={p.key}
                  checked={!!permissions[p.key]}
                  onCheckedChange={(checked) => handleTogglePermission(p.key, !!checked)}
                  className="mt-1"
                />
                <div className="space-y-0.5">
                  <label htmlFor={p.key} className="text-xs font-bold text-slate-800 cursor-pointer">{p.label}</label>
                  <p className="text-[10px] text-slate-500 leading-normal">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsPermissionDialogOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button 
              onClick={handleSavePermissions}
              disabled={isSaving}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 transition-all hover:scale-105 active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
                </>
              ) : (
                <>
                  Valider les Droits <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
