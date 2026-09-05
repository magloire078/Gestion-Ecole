'use client';

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileDown, CheckCircle, AlertCircle, Loader2, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSchoolData } from '@/hooks/use-school-data';
import { useFirestore } from '@/firebase';
import { useAcademicYear } from '@/providers/academic-year-provider';
import { doc, getDoc, query, collection, where, getCountFromServer } from 'firebase/firestore';
import type { class_type, student } from '@/lib/data-types';
import { getPlanLimits } from '@/lib/subscription-plans';
import { resolveAcademicYearForWrite } from '@/lib/academic-year-utils';
import { ENTITY_DESCRIPTORS, getDescriptor, type ImportContext } from './import-entities';
import { validateRow } from './import-schemas';
import { parseSqlInserts, type SqlInsertBatch } from './sql-parser';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface BulkImportProps {
    existingClasses?: (class_type & { id: string })[];
    existingStudents?: (student & { id: string })[];
    currentAcademicYear?: string;
    /**
     * Surcharge le `schoolId` issu de `useSchoolData()`. Utilisé par la
     * page admin « Import pour le compte d'une école » pour pousser des
     * données dans une école dont le super-admin n'est pas membre.
     */
    targetSchoolId?: string;
}

/**
 * Devine l'entité GèreEcole à partir d'un nom de table SQL. Heuristiques
 * permissives basées sur les noms les plus courants (FR + EN).
 */
function guessEntityFromTable(table: string): string | undefined {
    const t = table.toLowerCase();
    if (/(eleve|student|inscrit)/.test(t)) return 'students';
    if (/(prof|teacher|enseignant|staff|personnel)/.test(t)) return 'teachers';
    if (/(note|grade|mark|bulletin)/.test(t)) return 'grades';
    if (/(class)/.test(t)) return 'classes';
    if (/(cycle)/.test(t)) return 'cycles';
    if (/(niveau|level)/.test(t)) return 'niveaux';
    if (/(frais|fee|tuition)/.test(t)) return 'fees';
    if (/(paiement|payment|encaiss)/.test(t)) return 'payments';
    if (/(compta|account|transaction|ledger)/.test(t)) return 'transactions';
    return undefined;
}

export function BulkImport({ existingClasses = [], existingStudents = [], currentAcademicYear, targetSchoolId }: BulkImportProps) {
    const { toast } = useToast();
    const { schoolId: contextSchoolId } = useSchoolData();
    const schoolId = targetSchoolId ?? contextSchoolId;
    const firestore = useFirestore();
    const { availableYears, currentYear } = useAcademicYear();

    const [entityId, setEntityId] = useState<string>('students');
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [targetYear, setTargetYear] = useState<string>(currentAcademicYear || currentYear || '');
    const [showResults, setShowResults] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // SQL dump support
    const [sqlBatches, setSqlBatches] = useState<SqlInsertBatch[]>([]);
    const [sqlMapping, setSqlMapping] = useState<Record<string, string>>({}); // tableName -> entityId
    const [showSqlPicker, setShowSqlPicker] = useState(false);

    const descriptor = useMemo(() => getDescriptor(entityId), [entityId]);

    const yearOptions = useMemo(() => {
        return Array.from(new Set([
            currentAcademicYear,
            currentYear,
            targetYear,
            ...availableYears,
        ].filter(Boolean) as string[]))
        .sort((a, b) => b.localeCompare(a));
    }, [currentAcademicYear, currentYear, targetYear, availableYears]);

    const downloadTemplate = (format: 'xlsx' | 'json' = 'xlsx') => {
        if (!descriptor) return;
        const sampleRow = descriptor.columns.reduce(
            (acc, col) => ({ ...acc, [col.header]: col.desc }),
            {} as Record<string, string>,
        );
        if (format === 'json') {
            const blob = new Blob([JSON.stringify([sampleRow], null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `modele_import_${entityId}.json`;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }
        const ws = XLSX.utils.json_to_sheet([sampleRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, `modele_import_${entityId}.xlsx`);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ext = file.name.toLowerCase().split('.').pop() ?? '';
        try {
            if (ext === 'sql') {
                const text = await file.text();
                const batches = parseSqlInserts(text);
                if (batches.length === 0) {
                    toast({ variant: 'destructive', title: 'Dump SQL vide', description: 'Aucune instruction INSERT INTO trouvée.' });
                    return;
                }
                const mapping: Record<string, string> = {};
                for (const b of batches) {
                    const guess = guessEntityFromTable(b.table);
                    if (guess) mapping[b.table] = guess;
                }
                setSqlBatches(batches);
                setSqlMapping(mapping);
                setShowSqlPicker(true);
                return;
            }
            if (ext === 'json') {
                const text = await file.text();
                const parsed = JSON.parse(text);
                if (!Array.isArray(parsed)) throw new Error('Le JSON doit contenir un tableau d\'objets.');
                const rows = parsed.filter(r => r && typeof r === 'object');
                const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
                setHeaders(keys);
                setFileData(rows);
                return;
            }
            if (ext === 'csv') {
                const text = await file.text();
                const result = Papa.parse(text, { header: true, skipEmptyLines: true });
                const rows = result.data as any[];
                setHeaders(result.meta.fields ?? Object.keys(rows[0] ?? {}));
                setFileData(rows);
                return;
            }
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const aoa = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
            if (aoa.length === 0) {
                setHeaders([]);
                setFileData([]);
                return;
            }
            const headerRow = (aoa[0] as string[]).map(h => String(h ?? '').trim());
            setHeaders(headerRow);
            const rows = aoa.slice(1).map(row => {
                const obj: any = {};
                headerRow.forEach((key, idx) => { obj[key] = (row as any)[idx]; });
                return obj;
            });
            setFileData(rows);
        } catch (err: any) {
            console.error('[BulkImport] parse error', err);
            toast({ variant: 'destructive', title: 'Fichier illisible', description: err?.message ?? 'Format non reconnu.' });
            setHeaders([]);
            setFileData([]);
        }
    };

    const validate = () => {
        if (!descriptor) return { valid: false, error: 'Aucune entité sélectionnée.' };
        const missing = descriptor.columns
            .filter(c => c.required && !headers.includes(c.header))
            .map(c => c.header);
        if (missing.length > 0) {
            return { valid: false, error: `Colonnes obligatoires manquantes : ${missing.join(', ')}` };
        }
        return { valid: true };
    };

    const executeImport = async () => {
        if (!descriptor) return;
        const validation = validate();
        if (!validation.valid) {
            toast({ variant: 'destructive', title: 'Erreur de format', description: validation.error });
            return;
        }
        if (!schoolId) return;

        setIsUploading(true);
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        const nonEmptyRows = fileData.filter(r => r && Object.keys(r).length > 0);
        setProgress({ current: 0, total: nonEmptyRows.length });

        if (descriptor.id === 'students') {
            const currentYearRowsCount = nonEmptyRows.filter((r: any) => {
                const rowYear = typeof r.academicYear === 'string' && r.academicYear.trim() 
                    ? r.academicYear.trim() 
                    : targetYear;
                return rowYear === currentYear;
            }).length;

            if (currentYearRowsCount > 0) {
                try {
                    const schoolSnap = await getDoc(doc(firestore, `ecoles/${schoolId}`));
                    if (schoolSnap.exists()) {
                        const planName = schoolSnap.data()?.subscription?.plan ?? 'Essentiel';
                        const currentAcademicYear = schoolSnap.data()?.currentAcademicYear || "2024-2025";
                        const limits = getPlanLimits(planName);
                        
                        if (limits && Number.isFinite(limits.maxStudents)) {
                            const activeStudentsQuery = query(
                                collection(firestore, `ecoles/${schoolId}/eleves`),
                                where('status', '==', 'Actif'),
                                where('academicYear', '==', currentAcademicYear)
                            );
                            const countSnap = await getCountFromServer(activeStudentsQuery);
                            const currentCount = countSnap.data().count;
                            
                            if (currentCount + currentYearRowsCount > limits.maxStudents) {
                                toast({
                                    variant: 'destructive',
                                    title: 'Limite d\'élèves atteinte',
                                    description: `Plan ${planName} : ${currentCount + currentYearRowsCount} > ${limits.maxStudents}.`,
                                });
                                setIsUploading(false);
                                return;
                            }
                        }
                    }
                } catch (err) {
                    console.error('[BulkImport] check limit error', err);
                }
            }
        }

        for (let i = 0; i < fileData.length; i++) {
            const row = fileData[i];
            const rowIndex = i + 2;
            if (!row || Object.keys(row).length === 0) continue;

            try {
                const rowYear = resolveAcademicYearForWrite({
                    schoolCurrentYear: typeof row.academicYear === 'string' && row.academicYear.trim()
                        ? row.academicYear.trim()
                        : (targetYear || currentAcademicYear),
                });
                const validated = validateRow(descriptor.id, row);
                if (!validated.ok) throw new Error(validated.error);
                const ctx: ImportContext = {
                    firestore,
                    schoolId,
                    rowYear,
                    existingClasses,
                    existingStudents,
                };
                await descriptor.importRow(validated.data, ctx);
                successCount += 1;
            } catch (err: any) {
                console.error('[BulkImport] row error', row, err);
                errorCount += 1;
                errors.push(`Ligne ${rowIndex}: ${err.message}`);
            }
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setIsUploading(false);
        setFileData([]);
        setHeaders([]);
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (errorCount > 0) {
            toast({ variant: 'destructive', title: 'Import terminé avec des erreurs', description: `${successCount} succès, ${errorCount} échecs.` });
        } else {
            toast({ title: 'Import terminé', description: `${successCount} éléments importés sur ${targetYear}.` });
        }
        setShowResults({ successCount, errorCount, errors });
    };

    const isImportingArchive = !!targetYear && targetYear !== currentYear;

    const runSqlImport = async () => {
        if (!schoolId) return;
        const eligible = sqlBatches.filter(b => sqlMapping[b.table]);
        if (eligible.length === 0) {
            toast({ variant: 'destructive', title: 'Aucune table mappée', description: 'Choisis l\'entité GèreEcole pour au moins une table.' });
            return;
        }
        setIsUploading(true);
        const totalRows = eligible.reduce((acc, b) => acc + b.rows.length, 0);
        setProgress({ current: 0, total: totalRows });

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];
        let cursor = 0;

        for (const batch of eligible) {
            const targetId = sqlMapping[batch.table];
            const desc = getDescriptor(targetId);
            if (!desc) continue;
            for (const row of batch.rows) {
                cursor += 1;
                try {
                    const rowYear = resolveAcademicYearForWrite({
                        schoolCurrentYear: typeof row.academicYear === 'string' && row.academicYear.trim()
                            ? row.academicYear.trim()
                            : (targetYear || currentAcademicYear),
                    });
                    const validated = validateRow(desc.id, row);
                    if (!validated.ok) throw new Error(validated.error);
                    await desc.importRow(validated.data, {
                        firestore,
                        schoolId,
                        rowYear,
                        existingClasses,
                        existingStudents,
                    });
                    successCount += 1;
                } catch (err: any) {
                    errorCount += 1;
                    errors.push(`${batch.table} ligne ${cursor}: ${err.message}`);
                }
                setProgress({ current: cursor, total: totalRows });
            }
        }

        setIsUploading(false);
        setSqlBatches([]);
        setSqlMapping({});
        setShowSqlPicker(false);
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (errorCount > 0) {
            toast({ variant: 'destructive', title: 'Import SQL terminé avec erreurs', description: `${successCount} succès, ${errorCount} échecs.` });
        } else {
            toast({ title: 'Import SQL terminé', description: `${successCount} éléments importés sur ${targetYear}.` });
        }
        setShowResults({ successCount, errorCount, errors });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Importation de masse</CardTitle>
                <CardDescription>
                    Importez vos données scolaires depuis Excel (.xlsx, .xls), CSV, JSON ou un dump SQL
                    (.sql). Les lignes sans colonne <code className="px-1 mx-0.5 rounded bg-muted text-xs">academicYear</code> sont
                    rattachées à l&apos;<strong>année cible</strong>.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-start bg-primary/5 p-6 rounded-2xl border border-primary/10 shadow-inner">
                    <div className="space-y-3 flex-1">
                        <Label className="text-sm font-bold text-primary uppercase tracking-wide">1. Type de données</Label>
                        <Select value={entityId} onValueChange={v => { setEntityId(v); setFileData([]); setHeaders([]); }}>
                            <SelectTrigger className="bg-white border-primary/20 shadow-sm h-12 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {ENTITY_DESCRIPTORS.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3 flex-1">
                        <Label className="text-sm font-bold text-primary uppercase tracking-wide flex items-center gap-2">
                            2. Année cible
                            {isImportingArchive && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                                    <Archive className="h-3 w-3" /> Archive
                                </span>
                            )}
                        </Label>
                        <Select value={targetYear} onValueChange={setTargetYear}>
                            <SelectTrigger className="bg-white border-primary/20 shadow-sm h-12 rounded-xl"><SelectValue placeholder="Choisir une année" /></SelectTrigger>
                            <SelectContent>
                                {yearOptions.map(y => (
                                    <SelectItem key={y} value={y}>
                                        {y}{y === currentYear ? ' (courante)' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3 md:w-72 shrink-0 md:border-l border-primary/20 md:pl-6 pt-4 md:pt-0">
                        <Label className="text-sm font-bold text-primary uppercase tracking-wide">Modèles de base</Label>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 bg-white hover:bg-primary/10 hover:text-primary transition-all border-primary/20 shadow-sm h-12 rounded-xl" onClick={() => downloadTemplate('xlsx')}>
                                <FileDown className="mr-2 h-4 w-4" /> Excel
                            </Button>
                            <Button variant="outline" className="flex-1 bg-white hover:bg-primary/10 hover:text-primary transition-all border-primary/20 shadow-sm h-12 rounded-xl" onClick={() => downloadTemplate('json')}>
                                <FileDown className="mr-2 h-4 w-4" /> JSON
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">Téléchargez un modèle vide avec les colonnes exactes.</p>
                    </div>
                </div>

                {descriptor && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Colonnes attendues — {descriptor.label}</h4>
                        <div className="flex flex-wrap gap-2">
                            {descriptor.columns.map(c => (
                                <div
                                    key={c.header}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 cursor-default',
                                        c.required ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-white text-slate-500 border-slate-200'
                                    )}
                                    title={c.desc}
                                >
                                    {c.header} {c.required && <span className="opacity-70">*</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="border-2 border-dashed border-primary/30 rounded-3xl p-10 flex flex-col items-center justify-center space-y-4 bg-gradient-to-b from-white to-primary/5 hover:bg-primary-[0.02] transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="h-20 w-20 rounded-full bg-white shadow-xl shadow-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 z-10 border border-primary/10">
                        <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <Label htmlFor="file-upload" className="cursor-pointer text-lg font-bold text-slate-900 group-hover:text-primary transition-colors z-10 text-center">
                        Cliquez pour uploader un fichier<br/>
                        <span className="text-sm font-normal text-muted-foreground">(.xlsx, .csv, .json, .sql)</span>
                    </Label>
                    <Input
                        id="file-upload"
                        type="file"
                        accept=".xlsx,.xls,.csv,.json,.sql"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <p className="text-xs font-medium text-slate-500 text-center max-w-md z-10 bg-white/80 p-2 rounded-lg border shadow-sm">
                        Une colonne <code className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">academicYear</code> dans le fichier surclasse l&apos;année cible. 
                        Le SQL accepte les dumps phpMyAdmin.
                    </p>
                </div>

                {fileData.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-medium text-sm">Aperçu ({fileData.length} lignes)</h4>
                                <p className="text-xs text-muted-foreground">
                                    Cible par défaut : <strong>{targetYear || '—'}</strong>
                                </p>
                            </div>
                            <Button onClick={executeImport} disabled={isUploading || !targetYear}>
                                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Lancer l&apos;importation
                            </Button>
                        </div>
                        <div className="rounded-md border max-h-[300px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fileData.slice(0, 5).map((row, i) => (
                                        <TableRow key={i}>
                                            {headers.map((h, j) => <TableCell key={j}>{row[h] != null ? String(row[h]) : ''}</TableCell>)}
                                        </TableRow>
                                    ))}
                                    {fileData.length > 5 && (
                                        <TableRow>
                                            <TableCell colSpan={headers.length || 1} className="text-center text-muted-foreground">
                                                … {fileData.length - 5} autres lignes …
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {isUploading && (
                    <div className="space-y-2">
                        <Label>Progression</Label>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-right text-muted-foreground">{progress.current} / {progress.total}</p>
                    </div>
                )}

                <Dialog open={showSqlPicker} onOpenChange={setShowSqlPicker}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Mappage du dump SQL</DialogTitle>
                            <DialogDescription>
                                {sqlBatches.length} table{sqlBatches.length > 1 ? 's' : ''} trouvée{sqlBatches.length > 1 ? 's' : ''}.
                                Associez chaque table à une entité GèreEcole, ou laissez vide pour l&apos;ignorer.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                            {sqlBatches.map(batch => (
                                <div key={batch.table} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-mono text-sm font-semibold truncate">{batch.table}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {batch.rows.length} ligne{batch.rows.length > 1 ? 's' : ''} · {batch.columns.length} colonne{batch.columns.length > 1 ? 's' : ''}
                                        </p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {batch.columns.slice(0, 6).map(col => (
                                                <Badge key={col} variant="outline" className="text-[10px] font-mono">{col}</Badge>
                                            ))}
                                            {batch.columns.length > 6 && (
                                                <Badge variant="outline" className="text-[10px]">+{batch.columns.length - 6}</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Select
                                        value={sqlMapping[batch.table] ?? ''}
                                        onValueChange={v => setSqlMapping(prev => ({ ...prev, [batch.table]: v === '__none__' ? '' : v }))}
                                    >
                                        <SelectTrigger className="w-[200px] shrink-0">
                                            <SelectValue placeholder="Ignorer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">Ignorer</SelectItem>
                                            {ENTITY_DESCRIPTORS.map(e => (
                                                <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowSqlPicker(false)}>Annuler</Button>
                            <Button onClick={runSqlImport} disabled={isUploading || Object.values(sqlMapping).filter(Boolean).length === 0}>
                                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Importer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {showResults && (
                    <Alert variant={showResults.errorCount > 0 ? 'destructive' : 'default'} className={cn(showResults.errorCount === 0 && 'bg-emerald-50 border-emerald-200 text-emerald-800')}>
                        <div className="flex items-start gap-3">
                            {showResults.errorCount > 0 ? <AlertCircle className="h-5 w-5 mt-0.5" /> : <CheckCircle className="h-5 w-5 mt-0.5" />}
                            <div className="flex-1">
                                <AlertTitle className="font-bold">
                                    {showResults.errorCount > 0 ? 'Rapport d\'importation (avec erreurs)' : 'Importation réussie'}
                                </AlertTitle>
                                <AlertDescription className="mt-2 space-y-3">
                                    <p className="text-sm">
                                        Sur un total de <strong>{showResults.successCount + showResults.errorCount}</strong> lignes traitées :
                                        <br />- Succès : <span className="font-bold text-emerald-600">{showResults.successCount}</span>
                                        <br />- Échecs : <span className="font-bold text-destructive">{showResults.errorCount}</span>
                                    </p>
                                    {showResults.errors.length > 0 && (
                                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20 max-h-40 overflow-y-auto">
                                            <p className="text-xs font-bold mb-2 uppercase tracking-wider">Détails des erreurs :</p>
                                            <ul className="list-disc list-inside text-xs space-y-1">
                                                {showResults.errors.map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => setShowResults(null)} className="mt-2 h-8 text-xs">
                                        Fermer le rapport
                                    </Button>
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
