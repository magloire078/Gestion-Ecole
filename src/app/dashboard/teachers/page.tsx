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
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from "react";
import { generateTeacherRecommendations, GenerateTeacherRecommendationsInput } from "@/ai/flows/generate-teacher-recommendations";
import { useToast } from "@/hooks/use-toast";
import type { Teacher } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>(mockTeacherData);
  const [isRecommendDialogOpen, setIsRecommendDialogOpen] = useState(false);
  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [recommendation, setRecommendation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [teacherSkills, setTeacherSkills] = useState('');


  const handleOpenRecommendDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setRecommendation('');
    setTeacherSkills('');
    setIsRecommendDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsDeleteDialogOpen(true);
  };

  const handleGenerateRecommendation = async () => {
    if (!selectedTeacher) return;

    setIsLoading(true);
    setRecommendation('');

    try {
      const skillsArray = teacherSkills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
      
      const input: GenerateTeacherRecommendationsInput = {
        teacherName: selectedTeacher.name,
        className: selectedTeacher.class || 'N/A', // Use optional class property
        studentPerformanceData: mockStudentPerformanceData[selectedTeacher.subject] || "Aucune donnée de performance disponible.",
        directorName: 'Jean Dupont', // Mock director name
        schoolName: 'GèreEcole',     // Mock school name
        teacherSkills: skillsArray.length > 0 ? skillsArray : ['Excellente communication', 'Pédagogie adaptée', 'Gestion de classe efficace'],
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
  
  const handleAddTeacher = () => {
    if (!newTeacherName || !newTeacherSubject || !newTeacherEmail) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Tous les champs sont requis.",
      });
      return;
    }

    const newTeacher: Teacher = {
      id: `T${teachers.length + 1}`,
      name: newTeacherName,
      subject: newTeacherSubject,
      email: newTeacherEmail,
    };

    setTeachers([...teachers, newTeacher]);

    toast({
      title: "Enseignant ajouté",
      description: `${newTeacherName} a été ajouté(e) avec succès.`,
    });

    setNewTeacherName('');
    setNewTeacherSubject('');
    setNewTeacherEmail('');
    setIsAddTeacherDialogOpen(false);
  };
  
  const handleDeleteTeacher = () => {
    if (!selectedTeacher) return;
    
    setTeachers(teachers.filter(t => t.id !== selectedTeacher.id));

    toast({
      title: "Enseignant supprimé",
      description: `${selectedTeacher.name} a été retiré(e) de la liste.`,
    });

    setIsDeleteDialogOpen(false);
    setSelectedTeacher(null);
  };


  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
              <h1 className="text-lg font-semibold md:text-2xl">Liste des Enseignants</h1>
              <p className="text-muted-foreground">Gérez les enseignants de votre école.</p>
          </div>
          <Dialog open={isAddTeacherDialogOpen} onOpenChange={setIsAddTeacherDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un enseignant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Ajouter un nouvel enseignant</DialogTitle>
                <DialogDescription>
                  Renseignez les informations du nouvel enseignant.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teacher-name" className="text-right">
                    Nom
                  </Label>
                  <Input id="teacher-name" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="col-span-3" placeholder="Ex: Marie Curie" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teacher-subject" className="text-right">
                    Matière
                  </Label>
                   <Input id="teacher-subject" value={newTeacherSubject} onChange={(e) => setNewTeacherSubject(e.target.value)} className="col-span-3" placeholder="Ex: Physique"/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teacher-email" className="text-right">
                    Email
                  </Label>
                  <Input id="teacher-email" type="email" value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)} className="col-span-3" placeholder="Ex: m.curie@ecole.com"/>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddTeacherDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddTeacher}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                  {teachers.map((teacher) => (
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
                             <DropdownMenuItem onClick={() => handleOpenRecommendDialog(teacher)}>
                              <FileText className="mr-2 h-4 w-4" />
                              <span>Recommandation</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleOpenDeleteDialog(teacher)}
                            >
                                Supprimer
                            </DropdownMenuItem>
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

      <Dialog open={isRecommendDialogOpen} onOpenChange={setIsRecommendDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Générer une Lettre de Recommandation</DialogTitle>
            <DialogDescription>
              Lettre pour <strong>{selectedTeacher?.name}</strong>, enseignant(e) de <strong>{selectedTeacher?.subject}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecommendDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'enseignant <strong>{selectedTeacher?.name}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeacher} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
