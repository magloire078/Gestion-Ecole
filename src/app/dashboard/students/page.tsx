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
import { mockStudentData } from "@/lib/data";
import { PlusCircle, Bot, Smile, Meh, Frown } from "lucide-react";
import { useState, useEffect } from "react";
import { summarizeStudentFeedback } from "@/ai/flows/summarize-student-feedback";
import { analyzeStudentSentiment } from "@/ai/flows/analyze-student-sentiment";
import { useToast } from "@/hooks/use-toast";

type Summary = {
    summary: string;
    keyImprovementAreas: string;
};

type Sentiment = 'Positif' | 'Neutre' | 'Négatif';

export default function StudentsPage() {
  const [feedbackText, setFeedbackText] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sentiments, setSentiments] = useState<Record<string, Sentiment | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchSentiments = async () => {
      const newSentiments: Record<string, Sentiment | null> = {};
      for (const student of mockStudentData) {
        try {
          const result = await analyzeStudentSentiment({ feedbackText: student.feedback });
          newSentiments[student.id] = result.sentiment as Sentiment;
        } catch (error) {
          console.error(`Failed to analyze sentiment for student ${student.id}:`, error);
          newSentiments[student.id] = null;
        }
      }
      setSentiments(newSentiments);
    };

    fetchSentiments();
  }, []);


  const handleSummarize = async () => {
    if (!feedbackText.trim()) return;
    setIsLoading(true);
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
      setIsLoading(false);
    }
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
        return null;
    }
  };


  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Liste des Élèves</h1>
            <p className="text-muted-foreground">Consultez et gérez les élèves inscrits.</p>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un élève
          </Button>
        </div>
        <Card>
            <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead className="hidden md:table-cell">Feedback Récent</TableHead>
                      <TableHead className="text-center">Sentiment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockStudentData.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell className="text-muted-foreground italic hidden md:table-cell">"{student.feedback}"</TableCell>
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
            <Button onClick={handleSummarize} disabled={isLoading || !feedbackText.trim()} className="w-full bg-accent hover:bg-accent/90">
              <Bot className="mr-2 h-4 w-4" />
              {isLoading ? 'Analyse en cours...' : 'Générer le résumé'}
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
