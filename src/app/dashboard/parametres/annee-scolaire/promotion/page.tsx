'use client';

/**
 * Écran de promotion des élèves d'une année archivée vers l'année courante.
 *
 * Workflow :
 *   1. L'utilisateur a déjà cloné les classes via NewYearWizard.
 *   2. On affiche, pour chaque classe archivée de l'année source, les élèves
 *      inscrits (via `inscriptions_classe`).
 *   3. Pour chaque élève : choix de la classe cible (héritée du clone),
 *      type de promotion (normal / redoublement / sortie).
 *   4. "Appliquer la classe" lance `promoteStudents` en batch.
 */
import { useEffect, useMemo, useState } from 'react';
import {
    collection,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { useToast } from '@/hooks/use-toast';
import { useAcademicYear } from '@/providers/academic-year-provider';
import { promoteStudents, type PromotionRule } from '@/services/academic-year-service';
import type {
    class_type as ClassType,
    student as Student,
    studentClassAssignment as Assignment,
} from '@/lib/data-types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GraduationCap, RotateCcw, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerStudent {
    studentId: string;
    name: string;
    fromClassId: string;
    fromClassName: string;
    targetClassId: string;
    promotionType: Assignment['promotionType'] | 'sortie';
}

type WithId<T> = T & { id: string };

export default function PromotionPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { schoolId, schoolData } = useSchoolData();
    const { availableYears, currentYear } = useAcademicYear();
    const { toast } = useToast();

    const archiveYears = useMemo(
        () => availableYears.filter(y => y !== currentYear),
        [availableYears, currentYear],
    );

    const [fromYear, setFromYear] = useState<string>('');
    const [archivedClasses, setArchivedClasses] = useState<WithId<ClassType>[]>([]);
    const [newClasses, setNewClasses] = useState<WithId<ClassType>[]>([]);
    const [studentsByClass, setStudentsByClass] = useState<Record<string, PerStudent[]>>({});
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const [activeClassId, setActiveClassId] = useState<string | null>(null);

    // Sélectionner par défaut l'année archivée la plus récente
    useEffect(() => {
        if (!fromYear && archiveYears.length > 0) {
            setFromYear(archiveYears[0]);
        }
    }, [archiveYears, fromYear]);

    // Charger les données quand fromYear change
    useEffect(() => {
        if (!schoolId || !fromYear) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const [archived, current] = await Promise.all([
                    getDocs(query(
                        collection(firestore, `ecoles/${schoolId}/classes`),
                        where('academicYear', '==', fromYear),
                    )),
                    getDocs(query(
                        collection(firestore, `ecoles/${schoolId}/classes`),
                        where('academicYear', '==', currentYear),
                    )),
                ]);
                if (cancelled) return;
                const archivedList = archived.docs.map(d => ({ id: d.id, ...d.data() } as WithId<ClassType>));
                const newList = current.docs.map(d => ({ id: d.id, ...d.data() } as WithId<ClassType>));
                setArchivedClasses(archivedList.sort((a, b) => a.name.localeCompare(b.name)));
                setNewClasses(newList.sort((a, b) => a.name.localeCompare(b.name)));

                // Pré-charger les élèves de chaque classe archivée et proposer
                // un mapping par défaut basé sur `previousClassId` posé lors du clone.
                const map: Record<string, PerStudent[]> = {};
                for (const cls of archivedList) {
                    const successor = newList.find(c => (c as any).previousClassId === cls.id);
                    const assignmentsSnap = await getDocs(query(
                        collection(firestore, `ecoles/${schoolId}/inscriptions_classe`),
                        where('classeId', '==', cls.id),
                        where('academicYear', '==', fromYear),
                        where('status', '==', 'active'),
                    ));
                    const studentIds = Array.from(new Set(
                        assignmentsSnap.docs.map(d => (d.data() as Assignment).studentId),
                    ));
                    if (studentIds.length === 0) {
                        map[cls.id] = [];
                        continue;
                    }
                    // Charger les noms des élèves par batch (max 30 par "in")
                    const list: PerStudent[] = [];
                    for (let i = 0; i < studentIds.length; i += 30) {
                        const chunk = studentIds.slice(i, i + 30);
                        const studentsSnap = await getDocs(query(
                            collection(firestore, `ecoles/${schoolId}/eleves`),
                            where('__name__', 'in', chunk),
                        ));
                        studentsSnap.forEach(doc => {
                            const data = doc.data() as Student;
                            list.push({
                                studentId: doc.id,
                                name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || 'Élève sans nom',
                                fromClassId: cls.id,
                                fromClassName: cls.name,
                                targetClassId: successor?.id ?? '',
                                promotionType: 'normal',
                            });
                        });
                    }
                    map[cls.id] = list.sort((a, b) => a.name.localeCompare(b.name));
                }
                if (!cancelled) {
                    setStudentsByClass(map);
                    setActiveClassId(archivedList[0]?.id ?? null);
                }
            } catch (err) {
                console.error('[Promotion] load error', err);
                if (!cancelled) toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les données.' });
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [schoolId, fromYear, currentYear, firestore, toast]);

    const updateStudent = (classId: string, studentId: string, patch: Partial<PerStudent>) => {
        setStudentsByClass(prev => ({
            ...prev,
            [classId]: prev[classId]?.map(s => s.studentId === studentId ? { ...s, ...patch } : s) ?? [],
        }));
    };

    const setAllInClass = (classId: string, patch: Partial<PerStudent>) => {
        setStudentsByClass(prev => ({
            ...prev,
            [classId]: prev[classId]?.map(s => ({ ...s, ...patch })) ?? [],
        }));
    };

    const stats = useMemo(() => {
        let totalStudents = 0, mapped = 0, exits = 0, redoublants = 0;
        for (const list of Object.values(studentsByClass)) {
            for (const s of list) {
                totalStudents += 1;
                if (s.promotionType === 'sortie') exits += 1;
                else if (s.promotionType === 'redoublement') redoublants += 1;
                if (s.promotionType !== 'sortie' && s.targetClassId) mapped += 1;
            }
        }
        return { totalStudents, mapped, exits, redoublants };
    }, [studentsByClass]);

    const handleApplyAll = async () => {
        if (!schoolId || !user?.uid || running) return;
        const rules: PromotionRule[] = [];
        for (const list of Object.values(studentsByClass)) {
            for (const s of list) {
                if (s.promotionType === 'sortie') continue;
                if (!s.targetClassId) continue;
                rules.push({
                    studentId: s.studentId,
                    fromClassId: s.fromClassId,
                    toClassId: s.targetClassId,
                    promotionType: s.promotionType as Assignment['promotionType'],
                });
            }
        }
        if (rules.length === 0) {
            toast({ variant: 'destructive', title: 'Aucune affectation à appliquer' });
            return;
        }
        setRunning(true);
        try {
            const result = await promoteStudents(schoolId, rules, currentYear, user.uid);
            toast({
                title: 'Promotion terminée',
                description: `${result.promoted} élève(s) promu(s), ${result.skipped} ignoré(s).`,
            });
        } catch (err: any) {
            console.error('[Promotion] apply error', err);
            toast({ variant: 'destructive', title: 'Échec', description: err?.message ?? 'Erreur inconnue.' });
        } finally {
            setRunning(false);
        }
    };

    const activeClass = archivedClasses.find(c => c.id === activeClassId);
    const activeStudents = activeClassId ? studentsByClass[activeClassId] ?? [] : [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black tracking-tight">Promotion des élèves</h1>
                <p className="text-sm text-muted-foreground">
                    Affecte les élèves d&apos;une année archivée à leurs nouvelles classes
                    pour l&apos;année <strong>{currentYear}</strong>. Le service écrit une
                    nouvelle inscription par élève et clôt l&apos;ancienne (status
                    <code className="px-1 mx-0.5 rounded bg-muted text-xs">transferred</code>).
                </p>
            </div>

            {archiveYears.length === 0 ? (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Aucune année archivée</AlertTitle>
                    <AlertDescription>
                        Lancez d&apos;abord le wizard <em>Démarrer une nouvelle année</em> sur la page
                        Année Scolaire pour cloner les classes et archiver l&apos;année source.
                    </AlertDescription>
                </Alert>
            ) : (
                <>
                    <Card>
                        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle>Année source</CardTitle>
                                <CardDescription>
                                    Sélectionne l&apos;année archivée à promouvoir. Les nouvelles classes
                                    proposées sont celles déjà créées pour {currentYear}.
                                </CardDescription>
                            </div>
                            <Select value={fromYear} onValueChange={setFromYear}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Année source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {archiveYears.map(y => (
                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Stat label="Élèves" value={stats.totalStudents} />
                                <Stat label="Mappés" value={stats.mapped} tone="emerald" />
                                <Stat label="Redoublants" value={stats.redoublants} tone="amber" />
                                <Stat label="Sorties" value={stats.exits} tone="rose" />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                        {/* Sélecteur de classe archivée */}
                        <Card className="md:max-h-[600px] overflow-y-auto">
                            <CardHeader className="sticky top-0 bg-background z-10 border-b">
                                <CardTitle className="text-base">Classes {fromYear}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-2 space-y-1">
                                {loading && (
                                    <>
                                        <Skeleton className="h-9 w-full" />
                                        <Skeleton className="h-9 w-full" />
                                        <Skeleton className="h-9 w-full" />
                                    </>
                                )}
                                {!loading && archivedClasses.map(cls => {
                                    const list = studentsByClass[cls.id] ?? [];
                                    const isActive = cls.id === activeClassId;
                                    const unmapped = list.filter(s => s.promotionType !== 'sortie' && !s.targetClassId).length;
                                    return (
                                        <button
                                            key={cls.id}
                                            onClick={() => setActiveClassId(cls.id)}
                                            className={cn(
                                                'w-full text-left rounded-xl px-3 py-2 text-sm transition-colors',
                                                isActive
                                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                                    : 'hover:bg-muted',
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold truncate">{cls.name}</span>
                                                <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
                                            </div>
                                            {unmapped > 0 && (
                                                <p className="text-xs text-amber-600 mt-0.5">{unmapped} sans cible</p>
                                            )}
                                        </button>
                                    );
                                })}
                                {!loading && archivedClasses.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center p-4">
                                        Aucune classe archivée pour {fromYear}.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Tableau des élèves de la classe active */}
                        <Card>
                            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4" />
                                        {activeClass?.name ?? 'Sélectionnez une classe'}
                                    </CardTitle>
                                    <CardDescription>
                                        {activeStudents.length} élève{activeStudents.length > 1 ? 's' : ''} à promouvoir.
                                    </CardDescription>
                                </div>
                                {activeClassId && activeStudents.length > 0 && (
                                    <div className="flex gap-2">
                                        <Select
                                            onValueChange={val => setAllInClass(activeClassId, { targetClassId: val })}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Tous vers…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {newClasses.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setAllInClass(activeClassId, { promotionType: 'normal' })}
                                        >
                                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Élève</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Classe cible {currentYear}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activeStudents.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                        {loading ? 'Chargement…' : 'Aucun élève dans cette classe.'}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                activeStudents.map(s => (
                                                    <TableRow key={s.studentId}>
                                                        <TableCell className="font-medium">{s.name}</TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={s.promotionType}
                                                                onValueChange={v => updateStudent(activeClassId!, s.studentId, { promotionType: v as PerStudent['promotionType'] })}
                                                            >
                                                                <SelectTrigger className="w-[170px]">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="normal">Promotion normale</SelectItem>
                                                                    <SelectItem value="redoublement">Redoublement</SelectItem>
                                                                    <SelectItem value="avancement">Saut de classe</SelectItem>
                                                                    <SelectItem value="sortie">Sortie / Graduated</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={s.targetClassId}
                                                                onValueChange={v => updateStudent(activeClassId!, s.studentId, { targetClassId: v })}
                                                                disabled={s.promotionType === 'sortie'}
                                                            >
                                                                <SelectTrigger className="w-[220px]">
                                                                    <SelectValue placeholder={s.promotionType === 'sortie' ? '—' : 'Choisir une classe'} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {newClasses.map(c => (
                                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleApplyAll} disabled={running || stats.totalStudents === 0}>
                            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                            Appliquer la promotion ({stats.mapped})
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'rose' }) {
    const toneClass = tone === 'emerald' ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
        : tone === 'amber' ? 'text-amber-700 bg-amber-50 border-amber-100'
        : tone === 'rose' ? 'text-rose-700 bg-rose-50 border-rose-100'
        : 'text-slate-700 bg-slate-50 border-slate-100';
    return (
        <div className={cn('rounded-2xl border p-4', toneClass)}>
            <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-black mt-1 tabular-nums">{value}</p>
        </div>
    );
}
