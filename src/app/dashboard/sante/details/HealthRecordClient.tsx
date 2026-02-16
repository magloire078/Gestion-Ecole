'use client';

import { notFound, useSearchParams, useRouter } from 'next/navigation';
import { useState, useMemo, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDoc, useFirestore, useCollection, useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, collection, query, type DocumentReference } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusCircle, Syringe, Stethoscope, HeartPulse, Users, ArrowLeft } from 'lucide-react';
import type { student as Student, dossierMedical as DossierMedical, vaccination as Vaccination, consultation as Consultation } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ConsultationForm } from '@/components/sante/consultation-form';
import { VaccinationForm } from '@/components/sante/vaccination-form';
import { DossierMedicalForm } from '@/components/sante/dossier-medical-form';
import { LoadingScreen } from '@/components/ui/loading-screen';

function HealthRecordSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-32" />
            <div className="flex items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-96 w-full lg:col-span-2" />
            </div>
        </div>
    )
}

function HealthRecordContent({ eleveId, schoolId }: { eleveId: string, schoolId: string }) {
    const firestore = useFirestore();
    const router = useRouter();
    const { user } = useUser();
    const canManageContent = !!user?.profile?.permissions?.manageMedical;

    const [isVaccinFormOpen, setIsVaccinFormOpen] = useState(false);
    const [isConsultationFormOpen, setIsConsultationFormOpen] = useState(false);
    const [isDossierFormOpen, setIsDossierFormOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleSave = () => {
        setIsVaccinFormOpen(false);
        setIsConsultationFormOpen(false);
        setIsDossierFormOpen(false);
        setRefreshKey(prev => prev + 1);
    }

    const studentRef = useMemo(() => doc(firestore, `ecoles/${schoolId}/eleves/${eleveId}`) as DocumentReference<Student>, [firestore, schoolId, eleveId]);
    const { data: studentData, loading: studentLoading } = useDoc<Student>(studentRef);

    const dossierRef = useMemo(() => doc(firestore, `ecoles/${schoolId}/eleves/${eleveId}/dossier_medical/${eleveId}`) as DocumentReference<DossierMedical>, [firestore, schoolId, eleveId, refreshKey]);
    const { data: dossierData, loading: dossierLoading } = useDoc<DossierMedical>(dossierRef);

    const vaccinsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves/${eleveId}/dossier_medical/${eleveId}/vaccins`)), [firestore, schoolId, eleveId, refreshKey]);
    const { data: vaccinsData, loading: vaccinsLoading } = useCollection(vaccinsQuery);

    const consultationsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves/${eleveId}/dossier_medical/${eleveId}/consultations`)), [firestore, schoolId, eleveId, refreshKey]);
    const { data: consultationsData, loading: consultationsLoading } = useCollection(consultationsQuery);

    const student = studentData as Student | null;
    const dossier = dossierData as DossierMedical | null;
    const vaccins = useMemo(() => vaccinsData?.map(d => ({ id: d.id, ...d.data() } as Vaccination & { id: string })) || [], [vaccinsData]);
    const consultations = useMemo(() => consultationsData?.map(d => ({ id: d.id, ...d.data() } as Consultation & { id: string })) || [], [consultationsData]);

    const isLoading = studentLoading || dossierLoading || vaccinsLoading || consultationsLoading;

    if (isLoading) {
        return <HealthRecordSkeleton />;
    }

    if (!student) {
        notFound();
    }

    const studentFullName = `${student.firstName} ${student.lastName}`;
    const fallback = studentFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <>
            <div className="space-y-6">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour
                </Button>

                <div className="flex items-center gap-4">
                    <Avatar className="h-24 w-24 border">
                        <AvatarImage src={student.photoUrl || ''} alt={studentFullName} />
                        <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold">Dossier Médical de {studentFullName}</h1>
                        <p className="text-muted-foreground">Classe: {student.class} | Matricule: {student.matricule}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5" />Informations Générales</CardTitle>
                                {canManageContent && <Button variant="outline" size="sm" onClick={() => setIsDossierFormOpen(true)}>Modifier</Button>}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p><strong>Groupe Sanguin:</strong> {dossier?.groupeSanguin || 'Non renseigné'}</p>
                            <p><strong>Allergies:</strong> {dossier?.allergies?.join(', ') || 'Aucune connue'}</p>
                            <p><strong>Maladies Chroniques:</strong> {dossier?.maladiesChroniques?.join(', ') || 'Aucune connue'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Contacts d'Urgence</CardTitle></CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p><strong>Contact d'urgence:</strong> {dossier?.urgences?.contact1 || 'Non renseigné'}</p>
                            <p><strong>Assurance:</strong> {dossier?.urgences?.assurance || 'Non renseigné'}</p>
                            <p><strong>N° de police:</strong> {dossier?.urgences?.numeroPolice || 'Non renseigné'}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2"><Syringe className="h-5 w-5" />Carnet de Vaccination</CardTitle>
                            {canManageContent && <Button size="sm" onClick={() => setIsVaccinFormOpen(true)}><PlusCircle className="h-4 w-4 mr-2" />Ajouter un vaccin</Button>}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {vaccins.length > 0 ? (
                            <ul className="space-y-2">
                                {vaccins.map(v => (
                                    <li key={v.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                                        <span>{v.nom} (fait le {format(new Date(v.date), 'dd/MM/yyyy', { locale: fr })})</span>
                                        {v.rappel && <Badge>Rappel: {format(new Date(v.rappel), 'dd/MM/yyyy', { locale: fr })}</Badge>}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-muted-foreground text-center py-4">Aucun vaccin enregistré.</p>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5" />Historique des Consultations</CardTitle>
                            {canManageContent && <Button size="sm" onClick={() => setIsConsultationFormOpen(true)}><PlusCircle className="h-4 w-4 mr-2" />Ajouter une consultation</Button>}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {consultations.length > 0 ? (
                            <ul className="space-y-4">
                                {consultations.map((c) => (
                                    <li key={c.id} className="p-3 border rounded-lg">
                                        <p className="font-semibold">{format(new Date(c.date), 'd MMMM yyyy', { locale: fr })} - {c.medecin}</p>
                                        <p><strong>Motif:</strong> {c.motif}</p>
                                        <p><strong>Diagnostic:</strong> {c.diagnostic}</p>
                                        {c.traitement && <p><strong>Traitement:</strong> {c.traitement}</p>}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-muted-foreground text-center py-4">Aucune consultation enregistrée.</p>}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDossierFormOpen} onOpenChange={setIsDossierFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mettre à jour le dossier médical</DialogTitle>
                    </DialogHeader>
                    <DossierMedicalForm schoolId={schoolId} studentId={eleveId} dossier={dossier} onSave={handleSave} />
                </DialogContent>
            </Dialog>

            <Dialog open={isVaccinFormOpen} onOpenChange={setIsVaccinFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter un vaccin</DialogTitle>
                    </DialogHeader>
                    < VaccinationForm schoolId={schoolId} studentId={eleveId} onSave={handleSave} />
                </DialogContent>
            </Dialog>

            <Dialog open={isConsultationFormOpen} onOpenChange={setIsConsultationFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter une consultation</DialogTitle>
                    </DialogHeader>
                    <ConsultationForm schoolId={schoolId} studentId={eleveId} onSave={handleSave} />
                </DialogContent>
            </Dialog>
        </>
    )
}

function PageContent() {
    const searchParams = useSearchParams();
    const eleveId = searchParams.get('id') as string;
    const { schoolId, loading: schoolLoading } = useSchoolData();

    if (schoolLoading) {
        return <HealthRecordSkeleton />;
    }

    if (!schoolId) {
        return <div>École non trouvée.</div>;
    }

    if (!eleveId) {
        return <div>ID de l'élève manquant.</div>;
    }

    return <HealthRecordContent eleveId={eleveId} schoolId={schoolId} />;
}

export default function HealthRecordClient() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <PageContent />
        </Suspense>
    );
}
