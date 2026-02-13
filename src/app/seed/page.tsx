'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase/client-provider';
import { useUser } from '@/hooks/use-user';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function SeedPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const runSeed = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté.' });
            return;
        }

        setLoading(true);
        setStatus('idle');
        setLogs([]);
        addLog("Démarrage du seeding...");

        try {
            const batch = writeBatch(firestore);
            const schoolId = `ecole-demo-${Date.now()}`;
            const schoolRef = doc(collection(firestore, 'ecoles'), schoolId);

            addLog(`Création de l'école : ${schoolId}`);

            // 1. Créer l'école
            batch.set(schoolRef, {
                name: "Lycée d'Excellence Démo",
                schoolCode: "DEMO-001",
                status: "active",
                directorId: user.uid,
                directorFirstName: user.displayName?.split(' ')[0] || "Admin",
                directorLastName: user.displayName?.split(' ')[1] || "Demo",
                createdAt: new Date().toISOString(),
                subscription: {
                    plan: "Pro",
                    status: "active",
                    startDate: new Date().toISOString(),
                    maxStudents: 250
                }
            });

            // 2. Mettre à jour l'utilisateur (Ajouter l'école)
            const userRef = doc(firestore, 'users', user.uid);
            batch.update(userRef, {
                [`schools.${schoolId}`]: 'directeur'
            });
            addLog("Mise à jour des permissions utilisateur...");

            // 3. Créer Cycles
            const cycleRef = doc(collection(schoolRef, 'cycles'));
            batch.set(cycleRef, {
                name: "Secondaire Général",
                code: "SEC-GEN",
                schoolId,
                isActive: true,
                createdAt: new Date().toISOString()
            });

            // 4. Créer Niveaux
            const niveauRef = doc(collection(schoolRef, 'niveaux'));
            batch.set(niveauRef, {
                name: "Sixième",
                code: "6EME",
                cycleId: cycleRef.id,
                schoolId,
                order: 1,
                capacity: 200,
                createdAt: new Date().toISOString()
            });

            // 5. Créer Classes
            const classRef = doc(collection(schoolRef, 'classes'));
            batch.set(classRef, {
                name: "6ème A",
                code: "6A",
                niveauId: niveauRef.id,
                cycleId: cycleRef.id,
                schoolId,
                studentCount: 50,
                maxStudents: 50,
                academicYear: "2025-2026",
                status: "active",
                createdAt: new Date().toISOString()
            });

            // 6. Créer Élèves (Lot 1 - Limite batch 500 ops)
            for (let i = 1; i <= 20; i++) {
                const studentRef = doc(collection(schoolRef, 'eleves'));
                batch.set(studentRef, {
                    firstName: `Élève ${i}`,
                    lastName: `Test`,
                    matricule: `MAT-${1000 + i}`,
                    schoolId,
                    classId: classRef.id,
                    status: "Actif",
                    dateOfBirth: "2012-01-01",
                    gender: i % 2 === 0 ? "Féminin" : "Masculin",
                    parent1FirstName: `Parent ${i}`,
                    parent1LastName: `Test`,
                    parent1Contact: `0102030405`,
                    createdAt: new Date().toISOString()
                });
            }
            addLog("Préparation de 20 élèves...");

            await batch.commit();
            addLog("Données écrites avec succès !");
            setStatus('success');
            toast({ title: "Succès", description: "Données de démo chargées." });

            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            addLog(`ERREUR: ${error.message}`);
            toast({ variant: 'destructive', title: "Erreur", description: "Échec du seeding." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Génération de Données de Démo</CardTitle>
                    <CardDescription>
                        Cette action va créer une école de démonstration et lier votre compte.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!user ? (
                        <div className="text-center text-red-500">
                            Veuillez vous connecter d'abord.
                            <Button onClick={() => router.push('/auth/login')} variant="link">Se connecter</Button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-black/5 p-4 rounded-md text-sm font-mono h-48 overflow-y-auto">
                                {logs.length === 0 ? <span className="text-muted-foreground">Prêt...</span> : logs.map((l, i) => <div key={i}>{l}</div>)}
                            </div>

                            <Button onClick={runSeed} disabled={loading} className="w-full">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? 'Génération en cours...' : 'Lancer le Seeding'}
                            </Button>
                        </>
                    )}

                    {status === 'success' && (
                        <div className="flex items-center gap-2 text-green-600 justify-center font-medium">
                            <CheckCircle className="h-5 w-5" /> Terminé avec succès
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="flex items-center gap-2 text-red-600 justify-center font-medium">
                            <XCircle className="h-5 w-5" /> Une erreur est survenue
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
