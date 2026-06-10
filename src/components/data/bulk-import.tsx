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
import { doc, getDoc } from 'firebase/firestore';
import type { class_type, student } from '@/lib/data-types';
import { getPlanLimits } from '@/lib/subscription-plans';
import { resolveAcademicYearForWrite } from '@/lib/academic-year-utils';
import { ENTITY_DESCRIPTORS, getDescriptor, type ImportContext } from './import-entities';

interface BulkImportProps {
    existingClasses?: (class_type & { id: string })[];
    existingStudents?: (student & { id: string })[];
    currentAcademicYear?: string;
}

export function BulkImport({ existingClasses = [], existingStudents = [], currentAcademicYear }: BulkImportProps) {
    const { toast } = useToast();
    const { schoolId } = useSchoolData();
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

    const descriptor = useMemo(() => getDescriptor(entityId), [entityId]);

    const yearOptions = useMemo(() => Array.from(new Set([
        currentAcademicYear,
        currentYear,
        targetYear,
        ...availableYears,
    ].filter(Boolean) as string[])).sort((a, b) => b.localeCompare(a)),
    [currentAcademicYear, currentYear, targetYear, availableYears]);

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
            try {
                const [schoolSnap, statsSnap] = await Promise.all([
                    getDoc(doc(firestore, `ecoles/${schoolId}`)),
                    getDoc(doc(firestore, `ecoles/${schoolId}/stats/finance`)),
                ]);
                if (schoolSnap.exists()) {
                    const planName = schoolSnap.data()?.subscription?.plan ?? 'Essentiel';
                    const limits = getPlanLimits(planName);
                    if (limits && Number.isFinite(limits.maxStudents)) {
                        const currentCount = statsSnap.exists() ? (statsSnap.data()?.studentCount ?? 0) : 0;
                        if (currentCount + nonEmptyRows.length > limits.maxStudents) {
                            toast({
                                variant: 'destructive',
                                title: 'Limite d\'élèves atteinte',
                                description: `Plan ${planName} : ${currentCount + nonEmptyRows.length} > ${limits.maxStudents}.`,
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
                const ctx: ImportContext = {
                    firestore,
                    schoolId,
                    rowYear,
                    existingClasses,
                    existingStudents,
                };
                await descriptor.importRow(row, ctx);
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Importation de masse</CardTitle>
                <CardDescription>
                    Importez vos données scolaires depuis Excel (.xlsx, .xls), CSV ou JSON. Le format SQL
                    arrive en Phase 3. Les lignes sans colonne <code className="px-1 mx-0.5 rounded bg-muted text-xs">academicYear</code> sont
                    rattachées à l&apos;<strong>année cible</strong>.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Type de données</Label>
                        <Select value={entityId} onValueChange={v => { setEntityId(v); setFileData([]); setHeaders([]); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {ENTITY_DESCRIPTORS.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            Année cible
                            {isImportingArchive && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                                    <Archive className="h-3 w-3" /> Archive
                                </span>
                            )}
                        </Label>
                        <Select value={targetYear} onValueChange={setTargetYear}>
                            <SelectTrigger><SelectValue placeholder="Choisir une année" /></SelectTrigger>
                            <SelectContent>
                                {yearOptions.map(y => (
                                    <SelectItem key={y} value={y}>
                                        {y}{y === currentYear ? ' (courante)' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Modèle vide</Label>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => downloadTemplate('xlsx')}>
                                <FileDown className="mr-2 h-4 w-4" /> Excel
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={() => downloadTemplate('json')}>
                                <FileDown className="mr-2 h-4 w-4" /> JSON
                            </Button>
                        </div>
                    </div>
                </div>

                {descriptor && (
                    <Alert>
                        <AlertTitle className="text-sm">Colonnes attendues — {descriptor.label}</AlertTitle>
                        <AlertDescription>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {descriptor.columns.map(c => (
                                    <span
                                        key={c.header}
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono',
                                            c.required ? 'border-primary/30 bg-primary/5 text-primary' : 'border-muted-foreground/20 text-muted-foreground',
                                        )}
                                        title={c.desc}
                                    >
                                        {c.header}{c.required && <span>*</span>}
                                    </span>
                                ))}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center space-y-2 bg-muted/20">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <Label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                        Cliquez pour uploader un fichier (.xlsx, .csv, .json)
                    </Label>
                    <Input
                        id="file-upload"
                        type="file"
                        accept=".xlsx,.xls,.csv,.json"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <p className="text-xs text-muted-foreground text-center max-w-sm">
                        Une colonne <code className="px-1 rounded bg-muted">academicYear</code> dans le fichier surclasse l&apos;année cible.
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
