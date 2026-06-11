'use client';

/**
 * Exporteur de données : symétrique de l'import.
 *
 * - Mêmes 9 entités que ENTITY_DESCRIPTORS, plus 2 entités "racine"
 *   (cycles / niveaux) qui n'avaient pas de tag année.
 * - Filtrage par année courante / archive / toutes années.
 * - Formats XLSX, CSV, JSON.
 * - Les sous-collections (notes, paiements) sont aplaties : on ajoute
 *   `studentId` et `studentMatricule` en colonnes pour rester lisible.
 */
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Download, FileJson, FileSpreadsheet, Loader2, Package } from 'lucide-react';
import {
    collection,
    collectionGroup,
    getDocs,
    query,
    where,
    type DocumentData,
    type QueryConstraint,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { useAcademicYear } from '@/providers/academic-year-provider';

type ExportFormat = 'xlsx' | 'csv' | 'json';

interface ExportEntity {
    id: string;
    label: string;
    /** Récupère les rows à exporter. */
    fetch: (firestore: ReturnType<typeof useFirestore>, schoolId: string, year: string | null) => Promise<Record<string, any>[]>;
}

function plainDocs(snap: { docs: { id: string; data: () => DocumentData }[] }): Record<string, any>[] {
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

const EXPORT_ENTITIES: ExportEntity[] = [
    {
        id: 'students',
        label: 'Élèves',
        async fetch(firestore, schoolId, year) {
            const constraints: QueryConstraint[] = [];
            if (year) constraints.push(where('inscriptionYear', '==', year));
            const snap = await getDocs(query(collection(firestore, `ecoles/${schoolId}/eleves`), ...constraints));
            return plainDocs(snap);
        },
    },
    {
        id: 'teachers',
        label: 'Personnel',
        async fetch(firestore, schoolId, year) {
            const snap = await getDocs(collection(firestore, `ecoles/${schoolId}/personnel`));
            const rows = plainDocs(snap);
            return year ? rows.filter(r => !r.academicYear || r.academicYear === year) : rows;
        },
    },
    {
        id: 'classes',
        label: 'Classes',
        async fetch(firestore, schoolId, year) {
            const constraints: QueryConstraint[] = [];
            if (year) constraints.push(where('academicYear', '==', year));
            const snap = await getDocs(query(collection(firestore, `ecoles/${schoolId}/classes`), ...constraints));
            return plainDocs(snap);
        },
    },
    {
        id: 'cycles',
        label: 'Cycles',
        async fetch(firestore, schoolId) {
            const snap = await getDocs(collection(firestore, `ecoles/${schoolId}/cycles`));
            return plainDocs(snap);
        },
    },
    {
        id: 'niveaux',
        label: 'Niveaux',
        async fetch(firestore, schoolId) {
            const snap = await getDocs(collection(firestore, `ecoles/${schoolId}/niveaux`));
            return plainDocs(snap);
        },
    },
    {
        id: 'fees',
        label: 'Frais de scolarité',
        async fetch(firestore, schoolId, year) {
            const snap = await getDocs(collection(firestore, `ecoles/${schoolId}/frais_scolarite`));
            const rows = plainDocs(snap);
            return year ? rows.filter(r => !r.academicYear || r.academicYear === year) : rows;
        },
    },
    {
        id: 'transactions',
        label: 'Transactions comptables',
        async fetch(firestore, schoolId, year) {
            const snap = await getDocs(collection(firestore, `ecoles/${schoolId}/comptabilite`));
            const rows = plainDocs(snap);
            return year ? rows.filter(r => !r.academicYear || r.academicYear === year) : rows;
        },
    },
    {
        id: 'grades',
        label: 'Notes',
        async fetch(firestore, schoolId, year) {
            const studentsSnap = await getDocs(collection(firestore, `ecoles/${schoolId}/eleves`));
            const students = plainDocs(studentsSnap);
            const all: Record<string, any>[] = [];
            for (const s of students) {
                const notesSnap = await getDocs(collection(firestore, `ecoles/${schoolId}/eleves/${s.id}/notes`));
                notesSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (year && data.academicYear && data.academicYear !== year) return;
                    all.push({
                        id: doc.id,
                        studentId: s.id,
                        studentMatricule: s.matricule ?? '',
                        studentName: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
                        ...data,
                    });
                });
            }
            return all;
        },
    },
    {
        id: 'payments',
        label: 'Paiements élèves',
        async fetch(firestore, schoolId, year) {
            const studentsSnap = await getDocs(collection(firestore, `ecoles/${schoolId}/eleves`));
            const students = plainDocs(studentsSnap);
            const all: Record<string, any>[] = [];
            for (const s of students) {
                const paySnap = await getDocs(collection(firestore, `ecoles/${schoolId}/eleves/${s.id}/paiements`));
                paySnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (year && data.academicYear && data.academicYear !== year) return;
                    all.push({
                        id: doc.id,
                        studentId: s.id,
                        studentMatricule: s.matricule ?? '',
                        studentName: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
                        ...data,
                    });
                });
            }
            return all;
        },
    },
    {
        id: 'absences',
        label: 'Absences',
        async fetch(firestore, schoolId, year) {
            const studentsSnap = await getDocs(collection(firestore, `ecoles/${schoolId}/eleves`));
            const students = plainDocs(studentsSnap);
            const all: Record<string, any>[] = [];
            for (const s of students) {
                const absSnap = await getDocs(collection(firestore, `ecoles/${schoolId}/eleves/${s.id}/absences`));
                absSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (year && data.academicYear && data.academicYear !== year) return;
                    all.push({
                        id: doc.id,
                        studentId: s.id,
                        studentMatricule: s.matricule ?? '',
                        studentName: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
                        ...data,
                    });
                });
            }
            return all;
        },
    },
    {
        id: 'incidents',
        label: 'Incidents disciplinaires',
        async fetch(firestore, schoolId, year) {
            const studentsSnap = await getDocs(collection(firestore, `ecoles/${schoolId}/eleves`));
            const students = plainDocs(studentsSnap);
            const all: Record<string, any>[] = [];
            for (const s of students) {
                const incSnap = await getDocs(collection(firestore, `ecoles/${schoolId}/eleves/${s.id}/incidents_disciplinaires`));
                incSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (year && data.academicYear && data.academicYear !== year) return;
                    all.push({
                        id: doc.id,
                        studentId: s.id,
                        studentMatricule: s.matricule ?? '',
                        studentName: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
                        ...data,
                    });
                });
            }
            return all;
        },
    },
];

function toCsv(rows: Record<string, any>[]): string {
    if (rows.length === 0) return '';
    const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    const escape = (v: any) => {
        if (v == null) return '';
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };
    const lines = [headers.join(',')];
    for (const row of rows) lines.push(headers.map(h => escape(row[h])).join(','));
    return lines.join('\n');
}

function download(name: string, mime: string, content: string | Blob) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

export function BulkExport() {
    const firestore = useFirestore();
    const { schoolId, schoolData } = useSchoolData();
    const { availableYears, currentYear } = useAcademicYear();
    const { toast } = useToast();

    const [entityId, setEntityId] = useState('students');
    const [yearScope, setYearScope] = useState<'current' | 'all' | string>('current');
    const [format, setFormat] = useState<ExportFormat>('xlsx');
    const [running, setRunning] = useState(false);
    const [exportAll, setExportAll] = useState(false);

    const yearOptions = useMemo(() => Array.from(new Set([
        currentYear,
        ...availableYears,
    ].filter(Boolean) as string[])).sort((a, b) => b.localeCompare(a)),
    [currentYear, availableYears]);

    const handleExport = async () => {
        if (!schoolId) return;

        const targetYear = yearScope === 'all' ? null
            : yearScope === 'current' ? (currentYear || null)
            : yearScope;
        const slugBase = `${(schoolData?.name ?? 'ecole').toString().replace(/\W+/g, '_').toLowerCase()}_${targetYear ?? 'toutes_annees'}`;

        setRunning(true);
        try {
            // ------- Mode "Tout exporter" (multi-entités) -------
            if (exportAll) {
                const datasets: { entity: ExportEntity; rows: Record<string, any>[] }[] = [];
                for (const entity of EXPORT_ENTITIES) {
                    const rows = await entity.fetch(firestore, schoolId, targetYear);
                    if (rows.length > 0) datasets.push({ entity, rows });
                }
                if (datasets.length === 0) {
                    toast({ title: 'Export vide', description: 'Aucune donnée correspondant aux filtres.' });
                    return;
                }

                if (format === 'xlsx') {
                    const wb = XLSX.utils.book_new();
                    for (const { entity, rows } of datasets) {
                        const ws = XLSX.utils.json_to_sheet(rows);
                        XLSX.utils.book_append_sheet(wb, ws, entity.label.slice(0, 31));
                    }
                    XLSX.writeFile(wb, `${slugBase}_complet.xlsx`);
                } else {
                    const zip = new JSZip();
                    for (const { entity, rows } of datasets) {
                        if (format === 'json') {
                            zip.file(`${entity.id}.json`, JSON.stringify(rows, null, 2));
                        } else {
                            zip.file(`${entity.id}.csv`, '﻿' + toCsv(rows));
                        }
                    }
                    const blob = await zip.generateAsync({ type: 'blob' });
                    download(`${slugBase}_complet.zip`, 'application/zip', blob);
                }

                const total = datasets.reduce((sum, d) => sum + d.rows.length, 0);
                toast({
                    title: 'Export complet généré',
                    description: `${datasets.length} entité(s), ${total} ligne(s) au total.`,
                });
                return;
            }

            // ------- Mode mono-entité (comportement précédent) -------
            const desc = EXPORT_ENTITIES.find(e => e.id === entityId);
            if (!desc) return;
            const rows = await desc.fetch(firestore, schoolId, targetYear);
            if (rows.length === 0) {
                toast({ title: 'Export vide', description: 'Aucune donnée correspondant aux filtres.' });
                return;
            }
            const slug = `${slugBase}_${desc.id}`;
            if (format === 'json') {
                download(`${slug}.json`, 'application/json', JSON.stringify(rows, null, 2));
            } else if (format === 'csv') {
                download(`${slug}.csv`, 'text/csv;charset=utf-8', '﻿' + toCsv(rows));
            } else {
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, desc.label.slice(0, 31));
                XLSX.writeFile(wb, `${slug}.xlsx`);
            }
            toast({ title: 'Export généré', description: `${rows.length} ligne(s) exportée(s).` });
        } catch (err: any) {
            console.error('[BulkExport] error', err);
            toast({ variant: 'destructive', title: 'Échec', description: err?.message ?? 'Erreur inconnue.' });
        } finally {
            setRunning(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" /> Export des données
                </CardTitle>
                <CardDescription>
                    Téléchargez vos données scolaires au format Excel, CSV ou JSON. Les fichiers générés
                    sont compatibles avec l&apos;importateur ci-dessus (même structure de colonnes).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Tout exporter</Label>
                        <p className="text-xs text-muted-foreground">
                            Bundle multi-entités : XLSX multi-feuilles ou archive ZIP (CSV / JSON).
                        </p>
                    </div>
                    <Switch checked={exportAll} onCheckedChange={setExportAll} />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Type de données</Label>
                        <Select value={entityId} onValueChange={setEntityId} disabled={exportAll}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {EXPORT_ENTITIES.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Périmètre</Label>
                        <Select value={yearScope} onValueChange={setYearScope}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="current">Année courante ({currentYear})</SelectItem>
                                <SelectItem value="all">Toutes les années</SelectItem>
                                {yearOptions.filter(y => y !== currentYear).map(y => (
                                    <SelectItem key={y} value={y}>{y} (archive)</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Format</Label>
                        <Select value={format} onValueChange={v => setFormat(v as ExportFormat)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="xlsx">{exportAll ? 'Excel multi-feuilles (.xlsx)' : 'Excel (.xlsx)'}</SelectItem>
                                <SelectItem value="csv">{exportAll ? 'ZIP de CSV (.zip)' : 'CSV (.csv)'}</SelectItem>
                                <SelectItem value="json">{exportAll ? 'ZIP de JSON (.zip)' : 'JSON (.json)'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleExport} disabled={running || !schoolId}>
                        {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                            exportAll ? <Package className="mr-2 h-4 w-4" />
                            : format === 'json' ? <FileJson className="mr-2 h-4 w-4" />
                            : <FileSpreadsheet className="mr-2 h-4 w-4" />
                        )}
                        {exportAll ? 'Tout télécharger' : 'Télécharger'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
