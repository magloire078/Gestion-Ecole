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
import { Card, CardContent } from "@/components/ui/card";
import { mockTeacherData, mockStudentPerformanceData } from "@/lib/data";
import { PlusCircle, FileText, MoreHorizontal, Bot } from "lucide-react";
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
  DialogFooter
} from "@/components/ui/dialog";
import { useState } from "react";
import { generateTeacherRecommendations, GenerateTeacherRecommendationsInput } from "@/ai/flows/generate-teacher-recommendations";
import { useToast } from "@/hooks/use-toast";
import type { Teacher } from "@/lib/data";

export default function TeachersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [recommendation, setRecommendation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleOpenDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setRecommendation('');
    setIsDialogOpen(true);
  };

  const handleGenerateRecommendation = async () => {
    if (!selectedTeacher) return;

    setIsLoading(true);
    setRecommendation('');

    try {
      const input: GenerateTeacherRecommendationsInput = {
        teacherName: selectedTeacher.name,
        className: selectedTeacher.class || 'N/A', // Use optional class property
        studentPerformanceData: mockStudentPerformanceData[selectedTeacher.subject] || "Aucune donnée de performance disponible.",
        directorName: 'Jean Dupont', // Mock director name
        schoolName: 'GèreEcole',     // Mock school name
        teacherSkills: ['Excellente communication', 'Pédagogie adaptée', 'Gestion de classe efficace'], // Mock skills
      };

      const result = await generateTeacherRecommendations(input);
      setRecommendation(result.recommendationLetterDraft);
       toast({
        title: "Lettre de recommandation générée",
        description: `La lettre pour ${selectedTeacher.name} est prête.`,
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


  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-lg font-semibold md:text-2xl">Liste des Enseignants</h1>
              <p className="text-muted-foreground">Gérez les enseignants de votre école.</p>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un enseignant
          </Button>
        </div>
        <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden md:table-cell">Classe Principale</TableHead>
                    <TableHead className="hidden lg:table-cell">Matière</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTeacherData.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{teacher.class || 'N/A'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{teacher.subject}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Modifier</DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleOpenDialog(teacher)}>
                              <FileText className="mr-2 h-4 w-4" />
                              <span>Recommandation</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Générer une Lettre de Recommandation</DialogTitle>
            <DialogDescription>
              Lettre pour <strong>{selectedTeacher?.name}</strong>, enseignant(e) de <strong>{selectedTeacher?.subject}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
