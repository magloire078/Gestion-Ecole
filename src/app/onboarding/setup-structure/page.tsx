
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSchoolData } from '@/hooks/use-school-data';
import { applySchoolTemplate } from '@/services/structure-creation';
import { useFirestore } from '@/firebase';
import { SCHOOL_TEMPLATES } from '@/lib/templates';
import { Loader2, ArrowRight, SkipForward, Library, GraduationCap } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function SetupStructurePage() {
    const router = useRouter();
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApplyTemplate = async () => {
        if (!schoolId || !firestore) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Informations de l\'école non disponibles.' });
            return;
        }
        setIsProcessing(true);
        try {
            await applySchoolTemplate(firestore, schoolId, SCHOOL_TEMPLATES.IVORIAN_SYSTEM);
            toast({ title: 'Structure appliquée !', description: 'Les cycles et niveaux ont été créés.' });
            router.push('/dashboard');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'appliquer le modèle.' });
            setIsProcessing(false);
        }
    };
    
    const handleSkip = () => {
        router.push('/dashboard');
    };

    if (schoolLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Library className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Configurez votre structure</CardTitle>
                    <CardDescription>
                        Gagnez du temps en appliquant une structure pédagogique prédéfinie.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg bg-background">
                        <div className="flex items-start gap-4">
                            <GraduationCap className="h-8 w-8 text-primary mt-1" />
                            <div>
                                <h3 className="font-semibold">Modèle du Système Éducatif Ivoirien</h3>
                                <p className="text-sm text-muted-foreground">
                                    Crée automatiquement tous les cycles (Maternelle, Primaire, Collège, Lycée...) et les niveaux correspondants (CP1, 6ème, Terminale A...) pour vous.
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button className="w-full h-12" onClick={handleApplyTemplate} disabled={isProcessing}>
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Application en cours...
                            </>
                        ) : (
                            'Appliquer le modèle et continuer'
                        )}
                    </Button>
                </CardContent>
                <CardFooter>
                    <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSkip} disabled={isProcessing}>
                        <SkipForward className="mr-2 h-4 w-4" />
                        Ignorer et configurer manuellement plus tard
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

    