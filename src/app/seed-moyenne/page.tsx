'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase/client-provider';
import { useUser } from '@/hooks/use-user';
import { doc, writeBatch, collection, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const studentsData = [
  {"n": 1, "name": "KONAN FAMIEN AXEL", "scolarite": 250000, "payments": [50000, 50000, 50000, 100000]},
  {"n": 2, "name": "KOFFI CHRIST MOH CHAHINA", "scolarite": 250000, "payments": [50000, 45000, 55000, 20000]},
  {"n": 3, "name": "KOUYATE EBENEZER MAÏSANE", "scolarite": 225000, "payments": [25000, 30000, 30000, 40000, 100000]},
  {"n": 4, "name": "AMANI STELLA MARIE FLORIANE", "scolarite": 250000, "payments": [50000, 50000, 50000, 50000, 50000]},
  {"n": 5, "name": "AKAPKO YAO MERVIN RAYANE", "scolarite": 250000, "payments": [50000, 50000, 50000, 50000, 50000]},
  {"n": 6, "name": "KAKOU JEREMIE", "scolarite": 250000, "payments": [50000, 50000, 50000, 0, 100000]},
  {"n": 7, "name": "ABE SYDNEY ZOE BERAKA", "scolarite": 250000, "payments": [50000, 30000, 50000]},
  {"n": 8, "name": "AYE MBOUAFOUE LIAM EMMANUEL EUNICE", "scolarite": 250000, "payments": [50000, 50000, 50000, 100000]},
  {"n": 9, "name": "DOUMBIA NAIMA BERAKA", "scolarite": 250000, "payments": [50000, 50000, 100000]},
  {"n": 10, "name": "N’GORAN MIEMOH NAIKE SERAH", "scolarite": 250000, "payments": [50000, 50000, 50000, 100000]},
  {"n": 11, "name": "KOFFI ECLOÏE ARCHANGE", "scolarite": 250000, "payments": [50000, 40000, 50000, 50000, 40000, 20000]},
  {"n": 12, "name": "N’GUESSAN LIAM NATHANAËL", "scolarite": 250000, "payments": [50000, 70000, 60000, 70000]},
  {"n": 13, "name": "KOUADIO KOUAME KAYLA", "scolarite": 250000, "payments": [50000, 50000, 50000, 50000, 50000]},
  {"n": 14, "name": "KONAN MARIE ANGE SOURALAI", "scolarite": 250000, "payments": [50000, 50000, 50000, 70000, 30000]},
  {"n": 15, "name": "AMONKOU YAEL", "scolarite": 250000, "payments": [50000, 50000, 50000, 100000]}
];

export default function SeedMoyennePage() {
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
        addLog("Démarrage de l'intégration...");

        try {
            // Find school
            addLog("Recherche de l'école 'Le Mini Monde'...");
            const ecolesSnap = await getDocs(collection(firestore, 'ecoles'));
            let schoolId = null;
            let schoolName = null;
            ecolesSnap.forEach(doc => {
              const name = doc.data().name || '';
              if (name.toLowerCase().includes('mini monde') || name.toLowerCase().includes('demo')) {
                schoolId = doc.id;
                schoolName = doc.data().name;
              }
            });

            if (!schoolId) {
                // Default to the first one just in case
                schoolId = ecolesSnap.docs[0].id;
                schoolName = ecolesSnap.docs[0].data().name;
            }
            addLog(`École trouvée : ${schoolName} (${schoolId})`);

            // Find class
            addLog("Recherche de la classe 'Moyenne Section'...");
            const classesSnap = await getDocs(collection(firestore, `ecoles/${schoolId}/classes`));
            let classId = null;
            let className = null;
            classesSnap.forEach(doc => {
              const name = doc.data().name || '';
              if (name.toLowerCase().includes('moyenne section')) {
                classId = doc.id;
                className = doc.data().name;
              }
            });

            // If class doesn't exist, create it
            if (!classId) {
                addLog("Classe 'Moyenne Section' non trouvée. Création...");
                classId = doc(collection(firestore, `ecoles/${schoolId}/classes`)).id;
                className = "Moyenne Section";
                await setDoc(doc(firestore, `ecoles/${schoolId}/classes/${classId}`), {
                    name: className,
                    capacity: 30,
                    level: "Préscolaire",
                    tuitionFee: 250000,
                    createdAt: serverTimestamp()
                });
                addLog(`Classe créée : ${className} (${classId})`);
            } else {
                addLog(`Classe trouvée : ${className} (${classId})`);
            }

            // Batches
            addLog("Préparation des élèves et des paiements...");
            const batch1 = writeBatch(firestore);
            
            for (const s of studentsData) {
                const parts = s.name.split(' ');
                const lastName = parts[0];
                const firstName = parts.slice(1).join(' ');

                const totalPaid = s.payments.reduce((a, b) => a + b, 0);
                const amountDue = s.scolarite - totalPaid;
                const tuitionStatus = amountDue <= 0 ? 'Soldé' : 'Partiel';

                const studentRef = doc(collection(firestore, `ecoles/${schoolId}/eleves`));
                batch1.set(studentRef, {
                    schoolId: schoolId,
                    matricule: `MAT-2025-${String(s.n).padStart(3, '0')}`,
                    lastName: lastName,
                    firstName: firstName,
                    gender: 'Masculin',
                    dateOfBirth: '2020-01-01',
                    placeOfBirth: 'Abidjan',
                    nationality: 'Ivoirienne',
                    statusAff: 'Non-Affecté',
                    isRepeater: false,
                    classId: classId,
                    class: className,
                    grade: 'Moyenne Section',
                    cycle: 'Préscolaire',
                    parent1LastName: lastName,
                    parent1FirstName: 'Parent',
                    parent1Contact: '+225 0700000000',
                    status: 'Actif',
                    tuitionFee: s.scolarite,
                    amountDue: amountDue,
                    tuitionStatus: tuitionStatus,
                    inscriptionYear: 2025,
                    academicYear: '2025-2026',
                    createdAt: serverTimestamp(),
                });
                
                addLog(`Élève préparé : ${s.name}`);

                s.payments.forEach((amt, index) => {
                    if (amt > 0) {
                        const paymentRef = doc(collection(firestore, `ecoles/${schoolId}/eleves/${studentRef.id}/paiements`));
                        batch1.set(paymentRef, {
                            studentId: studentRef.id,
                            amount: amt,
                            date: new Date().toISOString().split('T')[0],
                            method: 'Espèce',
                            reference: `REC-2025-${Date.now().toString().slice(-6)}-${index}`,
                            academicYear: '2025-2026',
                            notes: index === 0 ? "Frais Inscription" : `Versement ${index}`,
                            createdAt: serverTimestamp(),
                        });
                    }
                });
            }

            addLog("Enregistrement dans la base de données...");
            await batch1.commit();

            addLog("Terminé avec succès ! 15 élèves ajoutés.");
            setStatus('success');
            toast({
                title: "Intégration réussie",
                description: "Les 15 élèves de la Moyenne Section ont été ajoutés à la base.",
            });

        } catch (error: any) {
            console.error("Erreur Seed:", error);
            addLog(`ERREUR FATALE: ${error.message}`);
            setStatus('error');
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
            <Card className="w-full max-w-2xl shadow-xl">
                <CardHeader className="border-b bg-white/50 backdrop-blur-sm rounded-t-xl">
                    <CardTitle className="text-2xl font-black text-indigo-900">
                        Intégration Élèves - Moyenne Section 2025/2026
                    </CardTitle>
                    <CardDescription>
                        Ce script va importer la liste des 15 élèves de l'école "Le Mini Monde" avec tous leurs versements.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="bg-slate-900 rounded-xl p-4 min-h-[300px] max-h-[400px] overflow-y-auto font-mono text-sm shadow-inner">
                        {logs.length === 0 ? (
                            <div className="text-slate-500 h-full flex items-center justify-center italic">
                                En attente de démarrage...
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {logs.map((log, i) => (
                                    <div key={i} className={log.includes('ERREUR') ? 'text-rose-400' : log.includes('succès') ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                                        <span className="text-slate-500 text-xs mr-2">{'>'}</span> {log}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                        <Button variant="outline" onClick={() => router.push('/dashboard/inscription')}>
                            Retour aux Inscriptions
                        </Button>

                        <Button 
                            onClick={runSeed} 
                            disabled={loading || status === 'success'}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px]"
                        >
                            {loading ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importation...</>
                            ) : status === 'success' ? (
                                <><CheckCircle className="h-4 w-4 mr-2" /> Intégration Terminée</>
                            ) : status === 'error' ? (
                                <><XCircle className="h-4 w-4 mr-2" /> Réessayer</>
                            ) : (
                                "Lancer l'Intégration"
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
