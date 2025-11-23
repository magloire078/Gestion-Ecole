
'use client';

import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookUser, Mail, Book, Bot, Phone } from 'lucide-react';
import { useState, useMemo } from 'react';
import { generateTeacherRecommendations, GenerateTeacherRecommendationsInput } from '@/ai/flows/generate-teacher-recommendations';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSchoolData } from '@/hooks/use-school-data';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthProtection } from '@/hooks/use-auth-protection.tsx';
import type { Class } from '@/lib/data';

interface Teacher {
  name: string;
  subject: string;
  email: string;
  phone?: string;
  classId?: string;
}

const mockStudentPerformanceData: Record<string, string> = {
  'Mathématiques': 'Les résultats des élèves en mathématiques montrent une nette amélioration ce semestre, avec une moyenne de classe en hausse de 15%. 80% des élèves ont obtenu une note supérieure à la moyenne. Les points faibles restent la géométrie dans l\'espace.',
  'Français': 'Excellente participation en classe et des résultats solides à l\'écrit. La moyenne de la classe est de 14/20. Quelques difficultés persistent en orthographe pour un petit groupe d\'élèves.',
  'Physique-Chimie': 'Très bon semestre avec des résultats remarquables en travaux pratiques. La moyenne générale est de 16/20. La section sur la thermodynamique a été particulièrement bien réussie par les élèves.',
  'Histoire-Géographie': 'Les élèves montrent un grand intérêt pour la matière. Les dissertations sont de bonne qualité, mais les connaissances sur les dates clés pourraient être améliorées. La moyenne de la classe est stable à 13/20.'
};


export default function TeacherProfilePage() {
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const params = useParams();
  const teacherId = params.teacherId as string;
  const { schoolId, schoolName, directorName, loading: schoolDataLoading } = useSchoolData();
  const firestore = useFirestore();

  const teacherRef = useMemoFirebase(() => 
    (schoolId && teacherId) ? doc(firestore, `ecoles/${schoolId}/enseignants/${teacherId}`) : null
  , [firestore, schoolId, teacherId]);

  const { data: teacherData, loading: teacherLoading } = useDoc(teacherRef);
  const teacher = teacherData as Teacher | null;

  const classRef = useMemoFirebase(() =>
    (schoolId && teacher?.classId) ? doc(firestore, `ecoles/${schoolId}/classes/${teacher.classId}`) : null
  , [firestore, schoolId, teacher?.classId]);

  const { data: classData, loading: classLoading } = useDoc(classRef);
  const mainClass = classData as Class | null;

  const [recommendation, setRecommendation] = useState('');
  const [teacherSkills, setTeacherSkills] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateRecommendation = async () => {
    if (!teacher) return;
    setIsGenerating(true);
    setRecommendation('');

    try {
      const skillsArray = teacherSkills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
      
      const input: GenerateTeacherRecommendationsInput = {
        teacherName: teacher.name,
        className: mainClass?.name || 'N/A',
        studentPerformanceData: mockStudentPerformanceData[teacher.subject] || "Aucune donnée de performance disponible.",
        directorName: directorName || 'Le Directeur/La Directrice', 
        schoolName: schoolName || 'GèreEcole',
        teacherSkills: skillsArray.length > 0 ? skillsArray : ['Excellente communication', 'Pédagogie adaptée', 'Gestion de classe efficace'],
      };

      const result = await generateTeacherRecommendations(input);
      setRecommendation(result.recommendationLetterDraft);
       toast({
        title: "Lettre de recommandation générée",
        description: `La lettre pour ${teacher.name} est prête.`,
      });
    } catch (error) {
      console.error("Failed to generate recommendation:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de générer la lettre de recommandation.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = teacherLoading || schoolDataLoading || classLoading;

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }
  
  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-96" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-6">
                    <Skeleton className="h-56 w-full" />
                </div>
                <div className="lg:col-span-2">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
    );
  }

  if (!teacher) {
    notFound();
  }
  
  const fallback = teacher.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-lg font-semibold md:text-2xl">Fiche d'Information de l'Enseignant</h1>
            <p className="text-muted-foreground">Vue détaillée du profil et des informations de l'enseignant.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 flex flex-col gap-6">
                 <Card>
                    <CardHeader className="flex-row items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={`https://picsum.photos/seed/${teacherId}/100`} alt={teacher.name} data-ai-hint="person face" />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div>
                             <CardTitle className="text-2xl">{teacher.name}</CardTitle>
                             <CardDescription>ID Enseignant: {teacherId}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <div className="flex items-center text-sm">
                            <Book className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Matière: <strong>{teacher.subject}</strong></span>
                        </div>
                        <div className="flex items-center text-sm">
                            <BookUser className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Classe principale: <strong>{mainClass?.name || 'N/A'}</strong></span>
                        </div>
                        <div className="flex items-center text-sm">
                            <Mail className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Email: <a href={`mailto:${teacher.email}`} className="text-primary hover:underline">{teacher.email}</a></span>
                        </div>
                        {teacher.phone && (
                        <div className="flex items-center text-sm">
                            <Phone className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Tél: <a href={`tel:${teacher.phone}`} className="text-primary hover:underline">{teacher.phone}</a></span>
                        </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Générer une Lettre de Recommandation</CardTitle>
                        <CardDescription>
                          Utilisez l'IA pour rédiger une lettre de recommandation personnalisée pour cet enseignant.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="grid gap-2">
                            <Label htmlFor="teacher-skills">Compétences Clés (séparées par des virgules)</Label>
                            <Input 
                                id="teacher-skills"
                                placeholder="Ex: Excellente communication, Pédagogie adaptée, ..."
                                value={teacherSkills}
                                onChange={(e) => setTeacherSkills(e.target.value)}
                            />
                        </div>
                         <Button onClick={handleGenerateRecommendation} disabled={isGenerating} className="w-full bg-accent hover:bg-accent/90">
                          <Bot className="mr-2 h-4 w-4" />
                          {isGenerating ? 'Génération en cours...' : 'Générer la Lettre avec l\'IA'}
                        </Button>

                        {recommendation && (
                            <div className="space-y-4 rounded-lg border bg-muted p-4 max-h-[400px] overflow-y-auto">
                                <h4 className="font-semibold text-primary">Brouillon de la Lettre</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{recommendation}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}

    