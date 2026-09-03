'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  UserPlus,
  Table as TableIcon,
  RefreshCw,
  Search,
  Users,
  Coins,
  Receipt,
  Trash2,
  Undo2,
  Edit,
  QrCode,
  Copy,
  Check,
  Printer,
  X
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSchoolData } from '@/hooks/use-school-data';
import { formatCurrency } from '@/lib/currency-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import QRCode from 'react-qr-code';

// Importer nos nouveaux modals
import { RegistrationModal } from '@/components/inscription/registration-modal';
import { BulkRegistrationModal } from '@/components/inscription/bulk-registration-modal';
import { ReRegistrationModal } from '@/components/inscription/re-registration-modal';
import type { student as Student, class_type as Class, fee as Fee, niveau as Niveau } from '@/lib/data-types';

export default function InscriptionDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

  // États pour l'ouverture des modals
  const [isUnitaryOpen, setIsUnitaryOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isReRegistrationOpen, setIsReRegistrationOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Recherche & pagination
  const [searchTerm, setSearchTerm] = useState('');

  const currentYear = schoolData?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  
  // Calculer l'année précédente N-1
  const prevYear = useMemo(() => {
    const parts = currentYear.split('-');
    if (parts.length === 2) {
      const start = parseInt(parts[0]) - 1;
      const end = parseInt(parts[1]) - 1;
      return `${start}-${end}`;
    }
    return `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
  }, [currentYear]);

  // Chargement des données nécessaires
  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const feesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/frais_scolarite`)) : null, [firestore, schoolId]);
  const { data: feesData, loading: feesLoading } = useCollection(feesQuery);
  const fees = useMemo(() => feesData?.map(d => ({ id: d.id, ...d.data() } as Fee)) || [], [feesData]);

  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [firestore, schoolId]);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const niveaux = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau)) || [], [niveauxData]);

  // Récupérer TOUS les élèves (limité pour éviter des lectures massives, mais suffisant pour la démo/dashboard)
  const elevesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
  const { data: elevesData, loading: elevesLoading } = useCollection(elevesQuery);
  const eleves = useMemo(() => elevesData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [elevesData]);

  // Filtration des élèves par onglets
  const currentStudents = useMemo(() => {
    return eleves.filter(e => e.academicYear === currentYear && e.status !== 'Supprimé');
  }, [eleves, currentYear]);

  const prevStudents = useMemo(() => {
    return eleves.filter(e => e.academicYear === prevYear && e.status !== 'Supprimé');
  }, [eleves, prevYear]);

  const deletedStudents = useMemo(() => {
    return eleves.filter(e => e.status === 'Supprimé');
  }, [eleves]);

  // Filtre de recherche
  const filterBySearch = (list: Student[]) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(e => 
      e.lastName.toLowerCase().includes(term) || 
      e.firstName.toLowerCase().includes(term) ||
      e.matricule?.toLowerCase().includes(term) ||
      e.class?.toLowerCase().includes(term)
    );
  };

  const filteredCurrent = useMemo(() => filterBySearch(currentStudents), [currentStudents, searchTerm]);
  const filteredPrev = useMemo(() => filterBySearch(prevStudents), [prevStudents, searchTerm]);
  const filteredDeleted = useMemo(() => filterBySearch(deletedStudents), [deletedStudents, searchTerm]);

  // Agrégation des indicateurs de la comptabilité pour l'année courante
  const stats = useMemo(() => {
    let totalScolarites = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    currentStudents.forEach(e => {
      const fee = e.tuitionFee || 0;
      const due = e.amountDue || 0;
      totalScolarites += fee;
      totalRemaining += due;
      totalPaid += (fee - due);
    });

    return {
      count: currentStudents.length,
      totalScolarites,
      totalPaid,
      totalRemaining
    };
  }, [currentStudents]);

  // Supprimer un élève (Mise à jour du statut)
  const handleDeleteStudent = async (studentId: string) => {
    if (!schoolId) return;
    try {
      const docRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`);
      await updateDoc(docRef, { status: 'Supprimé' });
      toast({
        title: "Élève mis à la corbeille",
        description: "Vous pouvez restaurer ce dossier depuis l'onglet Corbeille.",
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer le dossier." });
    }
  };

  // Restaurer un élève de la corbeille
  const handleRestoreStudent = async (studentId: string) => {
    if (!schoolId) return;
    try {
      const docRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`);
      await updateDoc(docRef, { status: 'Actif' });
      toast({
        title: "Élève restauré !",
        description: "Le dossier a été replacé dans la liste active.",
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de restaurer le dossier." });
    }
  };

  // QR Code Public Inscription
  const registrationLink = typeof window !== 'undefined' && schoolId
    ? `${window.location.origin}/parent-access/register?schoolId=${schoolId}` 
    : '';

  const handleCopyLink = () => {
    if (registrationLink) {
      navigator.clipboard.writeText(registrationLink);
      setCopied(true);
      toast({
        title: "Lien copié !",
        description: "Le lien d'inscription publique a été copié.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrintQRCode = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code Inscription - ${schoolData?.name || 'Établissement'}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            h1 { color: #0C365A; margin-bottom: 5px; }
            p { color: #555; margin-bottom: 30px; font-size: 1.1em; max-width: 500px; }
            .qr-container { padding: 20px; border: 2px solid #eee; border-radius: 20px; background: white; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
            .footer { margin-top: 40px; font-size: 0.8em; color: #aaa; }
          </style>
        </head>
        <body>
          <h1>${schoolData?.name || 'Votre Établissement'}</h1>
          <p>Scannez ce code QR pour inscrire votre enfant et effectuer le paiement mobile des frais de scolarité.</p>
          <div class="qr-container">
            <svg id="qr-svg" width="250" height="250" viewBox="0 0 250 250" style="display: block;">
              ${document.getElementById('parent-qr-code')?.innerHTML || ''}
            </svg>
          </div>
          <div class="footer">Propulsé par GèreEcole</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isLoading = schoolLoading || elevesLoading || classesLoading || feesLoading || niveauxLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-1/4 bg-slate-100 animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* En-tête de la Page */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inscriptions & Admissions</h1>
          <p className="text-sm text-slate-500 font-medium">
            Gérez la rentrée scolaire de vos élèves, inscrivez en lot ou réinscrivez depuis les archives.
          </p>
        </div>

        {/* Boutons d'actions supérieurs */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap lg:flex-nowrap gap-2 items-center w-full sm:w-auto">
          {schoolId && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto rounded-xl border-slate-200/80 hover:bg-slate-50 gap-2 transition-all hover:scale-105 active:scale-95">
                  <QrCode className="h-4 w-4 text-slate-600" /> Inscription En Ligne
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-2xl bg-white border border-white shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">QR Code d&apos;Inscription</DialogTitle>
                  <DialogDescription>
                    Permettez aux parents de procéder à la pré-inscription et au règlement depuis leur smartphone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                  <div id="parent-qr-code" className="p-4 bg-white border border-slate-200 rounded-2xl shadow-md">
                    <QRCode 
                      value={registrationLink} 
                      size={200}
                      className="h-auto max-w-full w-full"
                    />
                  </div>
                  <div className="w-full space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Lien direct d&apos;inscription</p>
                    <div className="flex items-center gap-2">
                      <Input 
                        readOnly 
                        value={registrationLink} 
                        className="rounded-xl font-mono text-xs bg-slate-50 border-slate-200"
                      />
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={handleCopyLink}
                        className="rounded-xl transition-all hover:scale-105 active:scale-95 shrink-0"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button 
                    variant="outline" 
                    onClick={handlePrintQRCode} 
                    className="rounded-xl gap-2 transition-all hover:scale-105 active:scale-95 text-slate-600"
                  >
                    <Printer className="h-4 w-4" /> Imprimer le QR Code
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Button 
            onClick={() => setIsUnitaryOpen(true)}
            className="w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <UserPlus className="h-4 w-4" /> Nouvelle Inscription
          </Button>

          <Button 
            onClick={() => setIsBulkOpen(true)}
            className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <TableIcon className="h-4 w-4" /> Saisie en Lot
          </Button>

          <Button 
            onClick={() => setIsReRegistrationOpen(true)}
            className="w-full sm:w-auto rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100/70 border border-indigo-100 gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" /> Réinscrire
          </Button>
        </div>
      </div>

      {/* Cartes d'indicateurs de performance (Stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Élèves Inscrits</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{stats.count}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Année scolaire {currentYear}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Scolarités</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1 font-mono">{formatCurrency(stats.totalScolarites)}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Attendu pour l&apos;année</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Receipt className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Encaissé</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1 font-mono">{formatCurrency(stats.totalPaid)}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Montant perçu en versements</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Coins className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Restes à Payer</p>
              <h3 className="text-2xl font-black text-rose-600 tracking-tight mt-1 font-mono">{formatCurrency(stats.totalRemaining)}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Solde restant à recouvrer</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
              <Coins className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau de bord interactif avec onglets */}
      <Tabs defaultValue="inscrits" className="w-full">
        
        {/* Barre d'outils (Onglets + Recherche) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <TabsList className="bg-slate-100 rounded-xl p-1 self-start">
            <TabsTrigger value="inscrits" className="rounded-lg text-xs font-bold px-4 py-2">
              Élèves Inscrits ({currentStudents.length})
            </TabsTrigger>
            <TabsTrigger value="precedent" className="rounded-lg text-xs font-bold px-4 py-2">
              Fichier Précédent ({prevYear}) ({prevStudents.length})
            </TabsTrigger>
            <TabsTrigger value="corbeille" className="rounded-lg text-xs font-bold px-4 py-2">
              Corbeille ({deletedStudents.length})
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full lg:max-w-xs shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher élève, classe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-xl border-slate-200/80 bg-white"
            />
          </div>
        </div>

        {/* CONTENU : Onglet 1 - Élèves Inscrits */}
        <TabsContent value="inscrits" className="border-none p-0 mt-0 focus-visible:ring-0">
          <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b">
                  <TableRow>
                    <TableHead className="w-[80px] text-xs font-black uppercase tracking-widest text-slate-400">Photo</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Matricule</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Nom & Prénoms</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Classe</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Sexe</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Date Nais.</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Statut CI</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Redoub.</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Scolarité (F)</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Reste (F)</TableHead>
                    <TableHead className="w-[100px] text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCurrent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-slate-400">
                        Aucun élève trouvé pour cette recherche.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCurrent.map(student => (
                      <TableRow key={student.id} className="hover:bg-slate-50/40">
                        <TableCell>
                          <Avatar className="h-9 w-9 ring-1 ring-slate-100">
                            <AvatarImage src={student.photoURL} alt={student.firstName} />
                            <AvatarFallback className="bg-slate-50 text-[10px]">{student.lastName.slice(0,2)}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-500">{student.matricule}</TableCell>
                        <TableCell className="font-bold text-slate-900">{student.lastName} {student.firstName}</TableCell>
                        <TableCell className="font-medium text-slate-600">{student.class}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-500">{student.gender}</TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono">{student.dateOfBirth}</TableCell>
                        <TableCell className="text-xs">
                          <span className={student.statusAff === 'Affecté' ? 'text-indigo-600 font-bold' : 'text-slate-600'}>
                            {student.statusAff || 'Non-Affecté'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{student.isRepeater ? 'Oui' : 'Non'}</TableCell>
                        <TableCell className="font-mono text-xs">{formatCurrency(student.tuitionFee)}</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-rose-600">{formatCurrency(student.amountDue)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-end gap-2 pr-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => student.id && handleDeleteStudent(student.id)}
                              className="text-rose-600 hover:bg-rose-50 rounded-xl h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTENU : Onglet 2 - Fichier Précédent */}
        <TabsContent value="precedent" className="border-none p-0 mt-0 focus-visible:ring-0">
          <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b">
                  <TableRow>
                    <TableHead className="w-[80px] text-xs font-black uppercase tracking-widest text-slate-400">Photo</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Matricule</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Nom & Prénoms</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Classe Précédente</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Sexe</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Nationalité</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Statut CI</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Parent Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrev.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                        Aucun élève trouvé de l&apos;année précédente ({prevYear}).
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPrev.map(student => (
                      <TableRow key={student.id} className="hover:bg-slate-50/40">
                        <TableCell>
                          <Avatar className="h-9 w-9 ring-1 ring-slate-100">
                            <AvatarImage src={student.photoURL} alt={student.firstName} />
                            <AvatarFallback className="bg-slate-50 text-[10px]">{student.lastName.slice(0,2)}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-500">{student.matricule}</TableCell>
                        <TableCell className="font-bold text-slate-900">{student.lastName} {student.firstName}</TableCell>
                        <TableCell className="font-medium text-slate-600">{student.class}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-500">{student.gender}</TableCell>
                        <TableCell className="text-xs font-medium text-slate-600">{student.nationality || 'Ivoirienne'}</TableCell>
                        <TableCell className="text-xs">{student.statusAff || 'Non-Affecté'}</TableCell>
                        <TableCell className="font-mono text-xs font-medium text-slate-500">{student.parent1Contact}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTENU : Onglet 3 - Corbeille */}
        <TabsContent value="corbeille" className="border-none p-0 mt-0 focus-visible:ring-0">
          <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b">
                  <TableRow>
                    <TableHead className="w-[80px] text-xs font-black uppercase tracking-widest text-slate-400">Photo</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Matricule</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Nom & Prénoms</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Classe</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Sexe</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Année Acad.</TableHead>
                    <TableHead className="w-[100px] text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeleted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                        La corbeille est vide.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDeleted.map(student => (
                      <TableRow key={student.id} className="hover:bg-slate-50/40">
                        <TableCell>
                          <Avatar className="h-9 w-9 grayscale opacity-60">
                            <AvatarImage src={student.photoURL} alt={student.firstName} />
                            <AvatarFallback className="bg-slate-50 text-[10px]">{student.lastName.slice(0,2)}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-400">{student.matricule}</TableCell>
                        <TableCell className="font-bold text-slate-400 line-through">{student.lastName} {student.firstName}</TableCell>
                        <TableCell className="font-medium text-slate-400">{student.class}</TableCell>
                        <TableCell className="text-xs text-slate-400">{student.gender}</TableCell>
                        <TableCell className="text-xs text-slate-400">{student.academicYear}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-end gap-2 pr-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => student.id && handleRestoreStudent(student.id)}
                              className="text-indigo-600 hover:bg-indigo-50 rounded-xl h-8 w-8"
                              title="Restaurer"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals intégrés */}
      {schoolId && (
        <>
          <RegistrationModal
            isOpen={isUnitaryOpen}
            onClose={() => setIsUnitaryOpen(false)}
            onSuccess={() => {}}
            schoolId={schoolId}
            schoolData={schoolData}
            classes={classes}
            niveaux={niveaux}
            fees={fees}
          />
          <BulkRegistrationModal
            isOpen={isBulkOpen}
            onClose={() => setIsBulkOpen(false)}
            onSuccess={() => {}}
            schoolId={schoolId}
            schoolData={schoolData}
            classes={classes}
            niveaux={niveaux}
            fees={fees}
          />
          <ReRegistrationModal
            isOpen={isReRegistrationOpen}
            onClose={() => setIsReRegistrationOpen(false)}
            onSuccess={() => {}}
            schoolId={schoolId}
            schoolData={schoolData}
            classes={classes}
          />
        </>
      )}

    </div>
  );
}
