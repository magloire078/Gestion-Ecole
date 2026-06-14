'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Search, ShieldCheck, X } from 'lucide-react';
import { BulkImport } from '@/components/data/bulk-import';
import type { school as School, student as Student, class_type as Class } from '@/lib/data-types';
import { cn } from '@/lib/utils';

interface SchoolWithId extends School { id: string; }
interface StudentWithId extends Student { id: string; }
interface ClassWithId extends Class { id: string; }

export default function AdminBulkImportPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const schoolsQuery = useMemo(
        () => (user?.profile?.isAdmin ? query(collection(firestore, 'ecoles'), orderBy('name', 'asc')) : null),
        [firestore, user?.profile?.isAdmin],
    );
    const { data: schoolsData, loading: schoolsLoading } = useCollection(schoolsQuery);

    const schools: SchoolWithId[] = useMemo(
        () => schoolsData?.map(d => ({ id: d.id, ...d.data() } as SchoolWithId)) || [],
        [schoolsData],
    );

    const selectedSchool = useMemo(
        () => schools.find(s => s.id === selectedSchoolId) ?? null,
        [schools, selectedSchoolId],
    );

    const filteredSchools = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return schools;
        return schools.filter(s =>
            (s.name ?? '').toLowerCase().includes(term) ||
            s.id.toLowerCase().includes(term),
        );
    }, [schools, search]);

    const studentsQuery = useMemo(
        () => (selectedSchoolId ? query(collection(firestore, `ecoles/${selectedSchoolId}/eleves`)) : null),
        [firestore, selectedSchoolId],
    );
    const classesQuery = useMemo(
        () => (selectedSchoolId ? query(collection(firestore, `ecoles/${selectedSchoolId}/classes`)) : null),
        [firestore, selectedSchoolId],
    );
    const { data: studentsData } = useCollection(studentsQuery);
    const { data: classesData } = useCollection(classesQuery);

    const students: StudentWithId[] = useMemo(
        () => studentsData?.map(d => ({ id: d.id, ...d.data() } as StudentWithId)) || [],
        [studentsData],
    );
    const classes: ClassWithId[] = useMemo(
        () => classesData?.map(d => ({ id: d.id, ...d.data() } as ClassWithId)) || [],
        [classesData],
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black tracking-tight">Import pour le compte d&apos;une école</h1>
                <p className="text-sm text-muted-foreground">
                    Sélectionnez une école puis utilisez le module d&apos;importation comme si vous en étiez le directeur.
                    Idéal pour les écoles qui n&apos;arrivent pas à finaliser leur migration de données.
                </p>
            </div>

            <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Action effectuée en tant que super-administrateur</AlertTitle>
                <AlertDescription>
                    Les documents importés porteront <code className="text-xs">updatedBy = {user?.uid ?? '—'}</code>{' '}
                    et seront tracés dans le journal d&apos;audit. Vérifiez l&apos;année cible et le plan d&apos;abonnement
                    de l&apos;école avant de lancer l&apos;import.
                </AlertDescription>
            </Alert>

            {!selectedSchool ? (
                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Choisir une école</CardTitle>
                            <CardDescription>
                                {schoolsLoading ? 'Chargement…' : `${filteredSchools.length} école${filteredSchools.length > 1 ? 's' : ''} disponible${filteredSchools.length > 1 ? 's' : ''}`}
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Rechercher par nom ou ID…"
                                className="pl-9"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {schoolsLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : filteredSchools.length === 0 ? (
                            <p className="py-12 text-center text-sm text-muted-foreground">Aucune école trouvée.</p>
                        ) : (
                            <div className="space-y-2">
                                {filteredSchools.map(school => (
                                    <button
                                        key={school.id}
                                        onClick={() => setSelectedSchoolId(school.id)}
                                        className={cn(
                                            'w-full flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all',
                                            'hover:border-primary hover:bg-primary/5',
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                                <Building className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold truncate">{school.name ?? 'École sans nom'}</p>
                                                <p className="text-xs text-muted-foreground font-mono truncate">{school.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {school.subscription?.plan && (
                                                <Badge variant="outline">{school.subscription.plan}</Badge>
                                            )}
                                            {school.currentAcademicYear && (
                                                <Badge variant="secondary">{school.currentAcademicYear}</Badge>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card>
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                    <Building className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold truncate">{selectedSchool.name ?? 'École sans nom'}</p>
                                    <p className="text-xs text-muted-foreground font-mono truncate">{selectedSchool.id}</p>
                                </div>
                                {selectedSchool.subscription?.plan && (
                                    <Badge variant="outline" className="shrink-0">{selectedSchool.subscription.plan}</Badge>
                                )}
                                {selectedSchool.currentAcademicYear && (
                                    <Badge variant="secondary" className="shrink-0">
                                        Année courante : {selectedSchool.currentAcademicYear}
                                    </Badge>
                                )}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setSelectedSchoolId(null)}>
                                <X className="h-4 w-4 mr-1" /> Changer d&apos;école
                            </Button>
                        </CardContent>
                    </Card>

                    <BulkImport
                        targetSchoolId={selectedSchool.id}
                        existingClasses={classes}
                        existingStudents={students}
                        currentAcademicYear={selectedSchool.currentAcademicYear}
                    />
                </>
            )}
        </div>
    );
}
