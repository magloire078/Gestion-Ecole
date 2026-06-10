'use client';

import { useState, useRef } from 'react';
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
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import type { class_type, student } from '@/lib/data-types';
import { getPlanLimits } from '@/lib/subscription-plans';
import { resolveAcademicYearForWrite } from '@/lib/academic-year-utils';

interface BulkImportProps {
    existingClasses?: (class_type & { id: string })[];
    existingStudents?: (student & { id: string })[];
    currentAcademicYear?: string;
}

type ImportType = 'students' | 'teachers' | 'grades';

// Modèles de colonnes attendues. `academicYear` est ajouté en colonne
// optionnelle pour chaque entité — vide = "année cible" sélectionnée.
const TEMPLATES: Record<ImportType, { header: string; required: boolean; desc: string }[]> = {
    students: [
        { header: 'firstName', required: true, desc: 'Prénom de l\'élève' },
        { header: 'lastName', required: true, desc: 'Nom de l\'élève' },
        { header: 'dateOfBirth', required: true, desc: 'Date de naissance (JJ/MM/AAAA)' },
        { header: 'placeOfBirth', required: false, desc: 'Lieu de naissance' },
        { header: 'gender', required: true, desc: 'Genre (M/F)' },
        { header: 'className', required: true, desc: 'Classe (ex: 6ème A)' },
        { header: 'matricule', required: false, desc: 'Matricule (optionnel)' },
        { header: 'email', required: false, desc: 'Email (optionnel)' },
        { header: 'parentEmail', required: false, desc: 'Email du parent (pour liaison)' },
        { header: 'parent1FirstName', required: false, desc: 'Prénom du Père' },
        { header: 'parent1LastName', required: false, desc: 'Nom du Père' },
        { header: 'parent1Contact', required: false, desc: 'Contact du Père' },
        { header: 'academicYear', required: false, desc: 'Année scolaire (ex: 2024-2025). Vide = année cible.' },
    ],
    teachers: [
        { header: 'firstName', required: true, desc: 'Prénom' },
        { header: 'lastName', required: true, desc: 'Nom' },
        { header: 'email', required: true, desc: 'Email professionnel' },
        { header: 'subject', required: false, desc: 'Matière enseignée' },
        { header: 'phone', required: false, desc: 'Téléphone' },
        { header: 'academicYear', required: false, desc: 'Année d\'arrivée (optionnel)' },
    ],
    grades: [
        { header: 'studentMatricule', required: true, desc: 'Matricule de l\'élève' },
        { header: 'subject', required: true, desc: 'Matière' },
        { header: 'grade', required: true, desc: 'Note (0-20)' },
        { header: 'coefficient', required: true, desc: 'Coefficient' },
        { header: 'type', required: true, desc: 'Type (DEVOIR, COMPO, ORAL)' },
        { header: 'date', required: false, desc: 'Date (JJ/MM/AAAA, optionnel)' },
        { header: 'academicYear', required: false, desc: 'Année scolaire (ex: 2023-2024)' },
    ],
};

function parseDateOfBirth(raw: any): string | null {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') {
        // Excel serial date
        const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    if (typeof raw === 'string') {
        if (raw.includes('/')) {
            const parts = raw.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return null;
}

export function BulkImport({ existingClasses = [], existingStudents = [], currentAcademicYear }: BulkImportProps) {
    const { toast } = useToast();
    const { schoolId } = useSchoolData();
    const firestore = useFirestore();
    const { availableYears, currentYear } = useAcademicYear();

    const [importType, setImportType] = useState<ImportType>('students');
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [targetYear, setTargetYear] = useState<string>(currentAcademicYear || currentYear || '');
    const [showResults, setShowResults] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Construit l'ensemble des années disponibles : courantes + années importées.
    const yearOptions = Array.from(new Set([
        currentAcademicYear,
        currentYear,
        targetYear,
        ...availableYears,
    ].filter(Boolean) as string[])).sort((a, b) => b.localeCompare(a));

    // -------- Téléchargement modèle (XLSX + JSON) --------
    const downloadTemplate = (format: 'xlsx' | 'json' = 'xlsx') => {
        const template = TEMPLATES[importType];
        const sampleRow = template.reduce((acc, col) => ({ ...acc, [col.header]: col.desc }), {} as Record<string, string>);
        if (format === 'json') {
            const blob = new Blob([JSON.stringify([sampleRow], null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `modele_import_${importType}.json`;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }
        const ws = XLSX.utils.json_to_sheet([sampleRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, `modele_import_${importType}.xlsx`);
    };

    // -------- Upload : Excel / CSV / JSON --------
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.toLowerCase().split('.').pop() ?? '';
        try {
            if (ext === 'json') {
                const text = await file.text();
                const parsed = JSON.parse(text);
                if (!Array.isArray(parsed)) {
                    throw new Error('Le fichier JSON doit contenir un tableau d\'objets.');
                }
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
            // xlsx / xls
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

    const validateData = () => {
        const template = TEMPLATES[importType];
        const missingColumns = template
            .filter(t => t.required && !headers.includes(t.header))
            .map(t => t.header);
        if (missingColumns.length > 0) {
            return { valid: false, error: `Colonnes manquantes: ${missingColumns.join(', ')}` };
        }
        return { valid: true };
    };

    const executeImport = async () => {
        const validation = validateData();
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

        let collectionPath = '';
        if (importType === 'students') collectionPath = `ecoles/${schoolId}/eleves`;
        else if (importType === 'teachers') collectionPath = `ecoles/${schoolId}/personnel`;

        // Plafond élèves (Essentiel = 50)
        if (importType === 'students') {
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
                                description: `Plan ${planName} : ${currentCount + nonEmptyRows.length} > ${limits.maxStudents}. Mettez à niveau l'abonnement ou réduisez l'import.`,
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

                const cleanRow: any = {
                    ...row,
                    academicYear: rowYear,
                    createdAt: serverTimestamp(),
                    schoolId,
                };

                if (importType === 'students') {
                    if (!cleanRow.firstName || !cleanRow.lastName) throw new Error('Nom ou Prénom manquant');
                    const dob = parseDateOfBirth(cleanRow.dateOfBirth);
                    if (dob) cleanRow.dateOfBirth = dob;

                    if (cleanRow.className) {
                        const targetClass = existingClasses.find(c =>
                            c.name.toLowerCase().trim() === String(cleanRow.className).toLowerCase().trim()
                            && (!c.academicYear || c.academicYear === rowYear),
                        );
                        if (targetClass) {
                            cleanRow.classId = targetClass.id;
                            cleanRow.class = targetClass.name;
                        } else {
                            throw new Error(`Classe "${cleanRow.className}" introuvable pour ${rowYear}`);
                        }
                    }
                    cleanRow.inscriptionYear = rowYear;
                    cleanRow.status = cleanRow.status || 'Actif';
                    cleanRow.tuitionStatus = cleanRow.tuitionStatus || 'Non payé';
                    cleanRow.amountDue = Number(cleanRow.amountDue) || 0;
                    await addDoc(collection(firestore, collectionPath), cleanRow);
                } else if (importType === 'grades') {
                    if (!cleanRow.studentMatricule) throw new Error('Matricule manquant');
                    if (!cleanRow.subject) throw new Error('Matière manquante');
                    if (cleanRow.grade === undefined || cleanRow.grade === null || cleanRow.grade === '') {
                        throw new Error('Note manquante');
                    }
                    const gradeValue = Number(cleanRow.grade);
                    if (Number.isNaN(gradeValue) || gradeValue < 0 || gradeValue > 20) {
                        throw new Error(`Note invalide (${cleanRow.grade}). Doit être entre 0 et 20.`);
                    }
                    const cleanMatricule = String(cleanRow.studentMatricule).trim().toLowerCase();
                    const studentDoc = existingStudents.find(s =>
                        s.matricule && String(s.matricule).trim().toLowerCase() === cleanMatricule,
                    );
                    if (!studentDoc) {
                        throw new Error(`Élève matricule "${cleanRow.studentMatricule}" introuvable`);
                    }
                    const date = cleanRow.date ? new Date(cleanRow.date) : new Date();
                    await addDoc(collection(firestore, `ecoles/${schoolId}/eleves/${studentDoc.id}/notes`), {
                        schoolId,
                        subject: cleanRow.subject,
                        grade: gradeValue,
                        coefficient: Number(cleanRow.coefficient || 1),
                        type: cleanRow.type || 'Devoir',
                        date: Number.isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0],
                        academicYear: rowYear,
                        createdAt: serverTimestamp(),
                    });
                } else {
                    await addDoc(collection(firestore, collectionPath), cleanRow);
                }

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
            toast({
                variant: 'destructive',
                title: 'Import terminé avec des erreurs',
                description: `${successCount} succès, ${errorCount} échecs.`,
            });
        } else {
            toast({
                title: 'Import terminé avec succès',
                description: `${successCount} éléments importés sur ${targetYear}.`,
            });
        }
        setShowResults({ successCount, errorCount, errors });
    };

    const isImportingArchive = !!targetYear && targetYear !== currentYear;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Importation de masse</CardTitle>
                <CardDescription>
                    Importez vos élèves, enseignants ou notes depuis Excel (.xlsx, .xls), CSV ou JSON.
                    Les lignes sans colonne <code className="text-xs px-1 mx-0.5 rounded bg-muted">academicYear</code> sont
                    rattachées à l&apos;<strong>année cible</strong> ci-dessous.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Type de données</Label>
                        <Select value={importType} onValueChange={(v: ImportType) => { setImportType(v); setFileData([]); setHeaders([]); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="students">Élèves</SelectItem>
                                <SelectItem value="teachers">Enseignants / Personnel</SelectItem>
                                <SelectItem value="grades">Notes</SelectItem>
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
                                <FileDown className="mr-2 h-4 w-4" />
                                Excel
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={() => downloadTemplate('json')}>
                                <FileDown className="mr-2 h-4 w-4" />
                                JSON
                            </Button>
                        </div>
                    </div>
                </div>

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
                        Les colonnes correspondent au modèle. Une colonne <code className="px-1 rounded bg-muted">academicYear</code> dans le fichier surclasse l&apos;année cible.
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
