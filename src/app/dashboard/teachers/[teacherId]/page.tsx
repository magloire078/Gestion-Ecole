
'use client';

import { notFound, useParams } from 'next/navigation';
import { mockTeacherData, mockStudentPerformanceData } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookUser, Mail, Book, Bot, Phone } from 'lucide-react';
import { useState } from 'react';
import { generateTeacherRecommendations, GenerateTeacherRecommendationsInput } from '@/ai/flows/generate-teacher-recommendations';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SCHOOL_NAME_KEY = 'schoolName';
const DIRECTOR_NAME_KEY = 'directorName';

export default function TeacherProfilePage() {
  const params = useParams();
  const teacherId = params.teacherId as string;

  const teacher = mockTeacherData.find(t => t.id === teacherId);

  const [recommendation, setRecommendation] = useState('');
  const [teacherSkills, setTeacherSkills] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!teacher) {
    notFound();
  }

  const handleGenerateRecommendation = async () => {
    setIsLoading(true);
    setRecommendation('');

    // Fetch school settings from localStorage
    const schoolName = localStorage.getItem(SCHOOL_NAME_KEY) || 'GèreEcole';
    const directorName = localStorage.getItem(DIRECTOR_NAME_KEY) || 'Jean Dupont';

    try {
      const skillsArray = teacherSkills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
      
      const input: GenerateTeacherRecommendationsInput = {
        teacherName: teacher.name,
        className: teacher.class || 'N/A',
        studentPerformanceData: mockStudentPerformanceData[teacher.subject] || "Aucune donnée de performance disponible.",
        directorName: directorName, 
        schoolName: schoolName,
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
      setIsLoading(false);
    }
  };
  
  const fallback = teacher.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-lg font-semibold md:text-2xl">Fiche d'information de l'enseignant</h1>
            <p className="text-muted-foreground">Vue détaillée du profil et des informations de l'enseignant.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 flex flex-col gap-6">
                 <Card>
                    <CardHeader className="flex-row items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={`https://picsum.photos/seed/${teacher.id}/100/100`} alt={teacher.name} data-ai-hint="person face" />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div>
                             <CardTitle className="text-2xl">{teacher.name}</CardTitle>
                             <CardDescription>ID Enseignant: {teacher.id}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <div className="flex items-center text-sm">
                            <Book className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Matière: <strong>{teacher.subject}</strong></span>
                        </div>
                        <div className="flex items-center text-sm">
                            <BookUser className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span>Classe principale: <strong>{teacher.class || 'N/A'}</strong></span>
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
                            <Label htmlFor="teacher-skills">Compétences clés (séparées par des virgules)</Label>
                            <Input 
                                id="teacher-skills"
                                placeholder="Ex: Excellente communication, Pédagogie adaptée, ..."
                                value={teacherSkills}
                                onChange={(e) => setTeacherSkills(e.target.value)}
                            />
                        </div>
                         <Button onClick={handleGenerateRecommendation} disabled={isLoading} className="w-full bg-accent hover:bg-accent/90">
                          <Bot className="mr-2 h-4 w-4" />
                          {isLoading ? 'Génération en cours...' : 'Générer la lettre avec l\'IA'}
                        </Button>

                        {recommendation && (
                            <div className="space-y-4 rounded-lg border bg-muted p-4 max-h-[400px] overflow-y-auto">
                                <h4 className="font-semibold text-primary">Brouillon de la lettre</h4>
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
