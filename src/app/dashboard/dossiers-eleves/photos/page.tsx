'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import {
  Camera,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Users,
  Loader2,
  Trash2
} from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageUploader } from '@/components/image-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { student as Student, class_type as Class } from '@/lib/data-types';

export default function StudentPhotosPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const searchParams = useSearchParams();
  const classIdParam = searchParams.get('classId') || '';

  // Filtres
  const [selectedClassId, setSelectedClassId] = useState<string>(classIdParam);
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);

  // Synchroniser la classe si le paramètre d'URL change
  useEffect(() => {
    if (classIdParam) {
      setSelectedClassId(classIdParam);
    }
  }, [classIdParam]);

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

  const selectedClassInfo = useMemo(() => {
    return classes.find(c => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Calcul des statistiques de photos
  const photoStats = useMemo(() => {
    if (students.length === 0) return { total: 0, withPhoto: 0, missing: 0, percentage: 0 };
    const withPhoto = students.filter(s => !!s.photoURL).length;
    const missing = students.length - withPhoto;
    const percentage = Math.round((withPhoto / students.length) * 100);
    return { total: students.length, withPhoto, missing, percentage };
  }, [students]);

  // Enregistrer le lien de la photo dans Firestore
  const handlePhotoUploadSuccess = async (studentId: string, url: string) => {
    if (!schoolId) return;
    setUpdatingStudentId(studentId);
    try {
      const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`);
      await updateDoc(studentDocRef, {
        photoURL: url,
        updatedAt: new Date().toISOString()
      });
      toast({
        title: "Photo mise à jour !",
        description: "La photo d'identité de l'élève a été enregistrée."
      });
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer la photo.' });
    } finally {
      setUpdatingStudentId(null);
    }
  };

  // Supprimer la photo
  const handleRemovePhoto = async (studentId: string) => {
    if (!schoolId) return;
    setUpdatingStudentId(studentId);
    try {
      const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`);
      await updateDoc(studentDocRef, {
        photoURL: '',
        updatedAt: new Date().toISOString()
      });
      toast({
        title: "Photo supprimée",
        description: "La photo d'identité a été retirée du profil."
      });
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de retirer la photo.' });
    } finally {
      setUpdatingStudentId(null);
    }
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
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestion des Photos d&apos;Identité</h1>
        <p className="text-sm text-slate-500 font-medium">
          Associez ou mettez à jour rapidement les photos d&apos;identité scolaires des élèves par classe.
        </p>
      </div>

      {/* Cible */}
      <Card className="rounded-2xl border-none shadow-md bg-white/40 backdrop-blur-xl border border-white/60">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Classe à administrer</h3>
            <p className="text-xs text-slate-500">Sélectionnez la classe pour afficher le trombinoscope d&apos;édition.</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
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
        </CardContent>
      </Card>

      {selectedClassId ? (
        <div className="space-y-6">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-none shadow-sm bg-white/60 backdrop-blur-xl border border-white/40 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avec Photo</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{photoStats.withPhoto} / {photoStats.total} élèves</p>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-mono font-bold rounded-lg">{photoStats.percentage}%</Badge>
            </Card>
            <Card className="rounded-2xl border-none shadow-sm bg-white/60 backdrop-blur-xl border border-white/40 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Photos Manquantes</p>
                <p className="text-xl font-bold text-rose-600 mt-1">{photoStats.missing} élèves</p>
              </div>
              <AlertCircle className="h-5 w-5 text-rose-500" />
            </Card>
            <Card className="rounded-2xl border-none shadow-sm bg-white/60 backdrop-blur-xl border border-white/40 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classe active</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{selectedClassInfo?.name}</p>
              </div>
              <Users className="h-5 w-5 text-indigo-500" />
            </Card>
          </div>

          {/* Photos Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {studentsLoading ? (
              [...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)
            ) : students.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 bg-white/40 rounded-2xl border border-dashed border-slate-200">
                Aucun élève inscrit dans cette classe.
              </div>
            ) : (
              students.map((student) => (
                <Card key={student.id} className="rounded-2xl border border-slate-100 overflow-hidden bg-white hover:shadow-md transition-shadow flex flex-col items-center p-4">
                  <div className="relative group/photo w-24 h-24 mb-3 rounded-full overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={student.photoURL || ''} alt={`${student.firstName} ${student.lastName}`} className="object-cover" />
                      <AvatarFallback className="bg-slate-100 font-bold text-slate-500 text-lg">
                        {student.firstName?.[0]}{student.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Hover Overlay pour supprimer */}
                    {student.photoURL && (
                      <button
                        onClick={() => handleRemovePhoto(student.id)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white"
                        title="Supprimer la photo"
                      >
                        <Trash2 className="h-5 w-5 hover:text-rose-400 transition-colors" />
                      </button>
                    )}
                  </div>

                  <div className="text-center w-full flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1 leading-tight">{student.lastName} {student.firstName}</p>
                      <p className="text-[9px] font-mono text-slate-400 mt-0.5">{student.matricule || student.id.substring(0, 8)}</p>
                      
                      {student.photoURL ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded mt-2">
                          <Check className="h-2.5 w-2.5" /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-200/50 px-1.5 py-0.5 rounded mt-2">
                          Manquant
                        </span>
                      )}
                    </div>

                    <div className="mt-3.5 pt-2 border-t border-slate-50 w-full">
                      {updatingStudentId === student.id ? (
                        <div className="flex justify-center py-1">
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        </div>
                      ) : (
                        <ImageUploader 
                          onUploadComplete={(url: string) => handlePhotoUploadSuccess(student.id, url)}
                          className="w-full"
                          showOverlay={false}
                        >
                          <Button variant="outline" size="sm" className="w-full text-[10px] py-1 h-auto rounded-lg">Modifier</Button>
                        </ImageUploader>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center h-48 border-dashed border-2 rounded-2xl bg-white/40">
          <Camera className="h-8 w-8 text-slate-400 mb-2" />
          <p className="text-slate-500 text-sm font-medium">Veuillez sélectionner une classe pour afficher le trombinoscope.</p>
        </Card>
      )}

    </div>
  );
}
