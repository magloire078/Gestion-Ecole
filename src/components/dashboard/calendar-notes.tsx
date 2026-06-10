'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { useUserSession } from '@/hooks/use-user-session';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Save, CalendarDays, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CalendarNotes() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const firestore = useFirestore();
  const { schoolId } = useUserSession();
  const { toast } = useToast();

  const formattedDate = date ? format(date, 'yyyy-MM-dd') : null;

  useEffect(() => {
    async function fetchNote() {
      if (!schoolId || !formattedDate) return;
      
      setLoading(true);
      try {
        const noteRef = doc(firestore, `ecoles/${schoolId}/notes/${formattedDate}`);
        const noteSnap = await getDoc(noteRef);
        
        if (noteSnap.exists()) {
          setNote(noteSnap.data().content || '');
        } else {
          setNote('');
        }
      } catch (error) {
        console.error('Error fetching note:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchNote();
  }, [schoolId, formattedDate, firestore]);

  const handleSave = async () => {
    if (!schoolId || !formattedDate) return;
    
    setSaving(true);
    try {
      const noteRef = doc(firestore, `ecoles/${schoolId}/notes/${formattedDate}`);
      await setDoc(noteRef, {
        content: note,
        date: formattedDate,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      toast({
        title: 'Note enregistrée',
        description: `La note pour le ${format(date!, 'dd MMMM yyyy', { locale: fr })} a été sauvegardée.`,
      });
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder la note.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="glass-card border-white/10 bg-card/40 backdrop-blur-2xl shadow-2xl overflow-hidden relative">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-black flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-indigo-500" />
          Calendrier & Notes
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex justify-center border border-white/10 rounded-xl bg-white/5 p-2">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            locale={fr}
            className="rounded-md"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              {date ? format(date, 'EEEE d MMMM yyyy', { locale: fr }) : 'Sélectionnez une date'}
            </label>
            {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          </div>
          
          <Textarea
            placeholder="Prenez des notes pour cette journée..."
            className="min-h-[100px] resize-none bg-white/5 border-white/10 rounded-xl focus-visible:ring-indigo-500 placeholder:text-muted-foreground/30 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={!date || loading}
          />
          
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9"
            onClick={handleSave}
            disabled={!date || saving || loading}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
