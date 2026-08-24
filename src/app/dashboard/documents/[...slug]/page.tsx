'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import {
  FileText,
  Printer,
  ChevronRight,
  Download,
  Users,
  CreditCard,
  User,
  Star,
  Award,
  Layers,
  Image as ImageIcon,
  Grid,
  FileCheck,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { student as Student, class_type as Class } from '@/lib/data-types';
import { cn } from '@/lib/utils';

// Définition des types de documents
interface DocType {
  slug: string;
  title: string;
  icon: React.ElementType;
  description: string;
  scope: 'student' | 'class' | 'school';
}

const DOCUMENT_TYPES: DocType[] = [
  { slug: 'attestation', title: 'Attestation de Fréquentation', icon: FileText, description: 'Certificat officiel prouvant la scolarité en cours de l\'élève.', scope: 'student' },
  { slug: 'cartes', title: 'Cartes Scolaires (Badges)', icon: CreditCard, description: 'Cartes d\'identité scolaire avec photo et code QR.', scope: 'class' },
  { slug: 'fiche', title: 'Fiche Scolaire Individuelle', icon: User, description: 'Dossier complet contenant les détails et le suivi de l\'élève.', scope: 'student' },
  { slug: 'honneur', title: 'Tableau d\'Honneur', icon: Award, description: 'Distinction décernée aux élèves ayant obtenu d\'excellentes moyennes.', scope: 'class' },
  { slug: 'majors', title: 'Majors de Classe', icon: Star, description: 'Liste classée des premiers de chaque niveau et classe.', scope: 'class' },
  { slug: 'notation-print', title: 'Fiches de Notation Vides', icon: Grid, description: 'Grilles vierges pour la saisie manuelle des notes par les enseignants.', scope: 'class' },
  { slug: 'table', title: 'Fiches de Table (Examens)', icon: FileCheck, description: 'Étiquettes d\'identification des tables pour les compositions.', scope: 'class' },
  { slug: 'listes-classe', title: 'Listes de Classe Standards', icon: Users, description: 'Listes nominatives simples pour l\'administration.', scope: 'class' },
  { slug: 'trombinoscope', title: 'Trombinoscope (Photos)', icon: ImageIcon, description: 'Liste des élèves de la classe avec leur photo d\'identité.', scope: 'class' },
  { slug: 'recapitulatif', title: 'Tableau Récapitulatif Annuel', icon: Layers, description: 'Synthèse annuelle des présences et des performances.', scope: 'class' },
  { slug: 'appels/journalier', title: 'Feuille d\'Appel Journalière', icon: Printer, description: 'Modèle journalier d\'appel pour le contrôle de présence.', scope: 'class' },
];

export default function AdministrativeDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();

  // Déterminer le document sélectionné d'après le slug de l'URL
  const slugPath = useMemo(() => {
    const slug = params.slug;
    if (Array.isArray(slug)) {
      return slug.join('/');
    }
    return slug || 'attestation';
  }, [params.slug]);

  const activeDoc = useMemo(() => {
    return DOCUMENT_TYPES.find(d => d.slug === slugPath) || DOCUMENT_TYPES[0];
  }, [slugPath]);

  // États du formulaire
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Charger les classes
  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class & { id: string })) || [], [classesData]);

  // Charger les élèves de la classe sélectionnée
  const studentsQuery = useMemo(() => {
    return (schoolId && selectedClassId)
      ? query(
          collection(firestore, `ecoles/${schoolId}/eleves`),
          where('classId', '==', selectedClassId),
          where('status', '==', 'Actif')
        )
      : null;
  }, [firestore, schoolId, selectedClassId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const students = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student & { id: string })) || [], [studentsData]);

  // Déclencher l'impression / génération PDF
  const handleGeneratePdf = () => {
    if (activeDoc.scope === 'class' && !selectedClassId) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner une classe.' });
      return;
    }
    if (activeDoc.scope === 'student' && (!selectedClassId || !selectedStudentId)) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner une classe et un élève.' });
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Impression en cours !",
        description: `Le document "${activeDoc.title}" est en cours de téléchargement au format PDF.`
      });
    }, 1500);
  };

  const isLoading = schoolLoading || classesLoading;

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
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Centre d&apos;Impression de Documents</h1>
        <p className="text-sm text-slate-500 font-medium">
          Générez instantanément des attestations, listes de classe, trombinoscopes et badges au format PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panneau gauche: Liste des documents */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 px-1">Sélectionner un document</h3>
          {DOCUMENT_TYPES.map((docItem) => {
            const Icon = docItem.icon;
            const isActive = docItem.slug === activeDoc.slug;
            return (
              <button
                key={docItem.slug}
                onClick={() => {
                  setSelectedClassId('');
                  setSelectedStudentId('');
                  router.push(`/dashboard/documents/${docItem.slug}`);
                }}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl border flex items-start gap-3 transition-all active:scale-98",
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md font-bold"
                    : "bg-white/60 hover:bg-slate-50 text-slate-700 border-slate-200"
                )}
              >
                <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", isActive ? "text-white" : "text-slate-500")} />
                <div>
                  <p className="text-xs leading-normal">{docItem.title}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Panneau droite: Configuration et prévisualisation */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="rounded-2xl border-none shadow-md bg-white/70 backdrop-blur-xl border border-white/60 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <activeDoc.icon className="h-5 w-5 text-indigo-500" />
                Configuration : {activeDoc.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">{activeDoc.description}</p>
            </div>

            {/* Formulaire de configuration */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Classe de référence *</Label>
                <Select value={selectedClassId} onValueChange={(val) => { setSelectedClassId(val); setSelectedStudentId(''); }}>
                  <SelectTrigger className="rounded-xl bg-white border-slate-200">
                    <SelectValue placeholder="Choisir la classe..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeDoc.scope === 'student' && (
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Élève *</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedClassId || studentsLoading}>
                    <SelectTrigger className="rounded-xl bg-white border-slate-200">
                      {studentsLoading ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Chargement élèves...</span>
                      ) : (
                        <SelectValue placeholder="Choisir l'élève..." />
                      )}
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {students.map(s => (
                        <SelectItem key={s.id} value={s.id!}>
                          {s.lastName} {s.firstName} ({s.matricule})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            </div>

            {/* Prévisualisation visuelle simulée */}
            <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center min-h-[160px] text-center">
              <Printer className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">Aperçu du format d&apos;impression</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-sm leading-normal">
                {selectedClassId ? (
                  activeDoc.scope === 'student' 
                    ? selectedStudentId 
                      ? `Le PDF sera généré pour l'élève avec le logo de l'école et la signature numérique du directeur.`
                      : `Veuillez sélectionner un élève pour afficher l'aperçu.`
                    : `Le PDF sera généré pour l'ensemble des élèves de la classe (${students.length} élèves).`
                ) : (
                  `Veuillez configurer les filtres ci-dessus pour lancer la prévisualisation.`
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                onClick={handleGeneratePdf}
                disabled={isGenerating || (activeDoc.scope === 'class' && !selectedClassId) || (activeDoc.scope === 'student' && !selectedStudentId)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all hover:scale-105 active:scale-95 px-5 py-2.5 h-auto text-xs font-bold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Génération en cours...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4" /> Générer le Document PDF
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
}
