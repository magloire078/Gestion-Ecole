
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { mockStudentData, mockClassData } from "@/lib/data";
import { PlusCircle, Bot, Smile, Meh, Frown, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { summarizeStudentFeedback } from "@/ai/flows/summarize-student-feedback";
import { analyzeStudentSentiment } from "@/ai/flows/analyze-student-sentiment";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Student } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

type Summary = {
    summary: string;
    keyImprovementAreas: string;
};

type Sentiment = 'Positif' | 'Neutre' | 'Négatif';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(mockStudentData);
  const [feedbackText, setFeedbackText] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sentiments, setSentiments] = useState<Record<string, Sentiment | null>>({});
  const { toast } = useToast();

  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClassId, setNewStudentClassId] = useState('');
  const [newStudentFeedback, setNewStudentFeedback] = useState('');
  const [newStudentAmountDue, setNewStudentAmountDue] = useState('');
  const [newStudentTuitionStatus, setNewStudentTuitionStatus] = useState<'Payé' | 'En retard' | 'Partiel'>('Payé');

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAnalyzeSentiments = async () => {
    setIsAnalyzing(true);
    const newSentiments: Record<string, Sentiment | null> = {};
    for (const student of students) {
      if (student.feedback && !sentiments[student.id]) { // Avoid re-analyzing
          try {
            await new Promise(resolve => setTimeout(resolve, 500)); // Add a small delay between requests
            const result = await analyzeStudentSentiment({ feedbackText: student.feedback });
            newSentiments[student.id] = result.sentiment as Sentiment;
          } catch (error) {
            console.error(`Failed to analyze sentiment for student ${student.id}:`, error);
            newSentiments[student.id] = null;
            toast({
              variant: "destructive",
              title: "Erreur d'analyse",
              description: `Impossible d'analyser le sentiment pour ${student.name}.`,
            });
          }
      }
    }
    setSentiments(prev => ({...prev, ...newSentiments}));
    setIsAnalyzing(false);
    toast({
        title: "Analyse terminée",
        description: "Les sentiments des feedbacks ont été analysés.",
      });
  };


  const handleSummarize = async () => {
    if (!feedbackText.trim()) return;
    setIsSummarizing(true);
    setSummary(null);
    try {
      const result = await summarizeStudentFeedback({ feedbackText });
      setSummary(result);
      toast({
        title: "Résumé généré",
        description: "Le feedback a été analysé avec succès.",
      });
    } catch (error) {
      console.error("Failed to summarize feedback:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de générer le résumé.",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentName || !newStudentClassId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom et la classe de l'élève sont requis.",
      });
      return;
    }

    const newStudent: Student = {
      id: `S${String(students.length + 1).padStart(3, '0')}`,
      name: newStudentName,
      class: mockClassData.find(c => c.id === newStudentClassId)?.name || 'N/A',
      feedback: newStudentFeedback,
      amountDue: parseFloat(newStudentAmountDue) || 0,
      tuitionStatus: newStudentTuitionStatus,
    };

    setStudents([...students, newStudent]);
    
    toast({
      title: "Élève ajouté",
      description: `${newStudentName} a été ajouté(e) à la liste.`,
    });

    setNewStudentName('');
    setNewStudentClassId('');
    setNewStudentFeedback('');
    setNewStudentAmountDue('');
    setNewStudentTuitionStatus('Payé');
    setIsAddStudentDialogOpen(false);
  };


  const SentimentIcon = ({ sentiment }: { sentiment: Sentiment | null }) => {
    switch (sentiment) {
      case 'Positif':
        return <Smile className="h-5 w-5 text-emerald-500" />;
      case 'Neutre':
        return <Meh className="h-5 w-5 text-amber-500" />;
      case 'Négatif':
        return <Frown className="h-5 w-5 text-red-500" />;
      default:
        return <span className="text-muted-foreground">-</span>;
    }
  };
  
  const TuitionStatusBadge = ({ status }: { status: 'Payé' | 'En retard' | 'Partiel' }) => {
    switch (status) {
      case 'Payé':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Payé</Badge>;
      case 'En retard':
        return <Badge variant="destructive">En retard</Badge>;
      case 'Partiel':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Partiel</Badge>;
      default:
        return null;
    }
  };


  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Liste des Élèves</h1>
            <p className="text-muted-foreground">Consultez et gérez les élèves inscrits.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAnalyzeSentiments} disabled={isAnalyzing}>
              <Sparkles className="mr-2 h-4 w-4" />
              {isAnalyzing ? "Analyse..." : "Analyser les sentiments"}
            </Button>
            <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un élève
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouvel élève</DialogTitle>
                  <DialogDescription>
                    Renseignez les informations du nouvel élève.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="student-name" className="text-right">
                      Nom
                    </Label>
                    <Input id="student-name" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="col-span-3" placeholder="Ex: Jean Dupont" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="student-class" className="text-right">
                      Classe
                    </Label>
                    <Select onValueChange={setNewStudentClassId} value={newStudentClassId}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Sélectionner une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockClassData.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="student-amount" className="text-right">
                      Solde (CFA)
                    </Label>
                    <Input id="student-amount" type="number" value={newStudentAmountDue} onChange={(e) => setNewStudentAmountDue(e.target.value)} className="col-span-3" placeholder="Ex: 50000" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="student-tuition-status" className="text-right">
                      Statut
                    </Label>
                    <Select onValueChange={(value) => setNewStudentTuitionStatus(value as any)} value={newStudentTuitionStatus}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Statut du paiement" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Payé">Payé</SelectItem>
                          <SelectItem value="En retard">En retard</SelectItem>
                          <SelectItem value="Partiel">Partiel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="student-feedback" className="text-right pt-2">
                      Feedback
                    </Label>
                    <Textarea id="student-feedback" value={newStudentFeedback} onChange={(e) => setNewStudentFeedback(e.target.value)} className="col-span-3" placeholder="Feedback initial (optionnel)"/>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddStudentDialogOpen(false)}>Annuler</Button>
                  <Button onClick={handleAddStudent}>Ajouter l'élève</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <Card>
            <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead className="text-center">Statut Paiement</TableHead>
                      <TableHead className="text-right">Solde Scolarité</TableHead>
                      <TableHead className="text-center">Sentiment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.class}</TableCell>
                         <TableCell className="text-center">
                            <TuitionStatusBadge status={student.tuitionStatus} />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {student.amountDue > 0 ? (isClient ? `${student.amountDue.toLocaleString()} CFA` : `${student.amountDue} CFA`) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <SentimentIcon sentiment={sentiments[student.id]} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Résumé du Feedback</CardTitle>
            <CardDescription>
              Utilisez l'IA pour analyser et résumer le feedback des élèves.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="feedback-text">Collez le feedback ici</Label>
              <Textarea 
                placeholder="Entrez un ou plusieurs feedbacks d'élèves..." 
                id="feedback-text"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={5}
              />
            </div>
            <Button onClick={handleSummarize} disabled={isSummarizing || !feedbackText.trim()} className="w-full bg-accent hover:bg-accent/90">
              <Bot className="mr-2 h-4 w-4" />
              {isSummarizing ? 'Analyse en cours...' : 'Générer le résumé'}
            </Button>
            {summary && (
              <div className="space-y-4 rounded-lg border bg-muted p-4">
                <div>
                  <h4 className="font-semibold text-primary">Résumé</h4>
                  <p className="text-sm text-muted-foreground">{summary.summary}</p>
                </div>
                <div className="pt-2">
                  <h4 className="font-semibold text-primary">Axes d'amélioration</h4>
                  <p className="text-sm text-muted-foreground">{summary.keyImprovementAreas}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
