'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileDown, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSchoolData } from '@/hooks/use-school-data';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import type { class_type, student } from '@/lib/data-types';

interface BulkImportProps {
    existingClasses?: (class_type & { id: string })[];
    existingStudents?: (student & { id: string })[];
    currentAcademicYear?: string;
}

// Types de données supportés pour l'import
type ImportType = 'students' | 'teachers' | 'grades';

// Modèles de colonnes attendues
const TEMPLATES = {
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
    ],
    teachers: [
        { header: 'firstName', required: true, desc: 'Prénom' },
        { header: 'lastName', required: true, desc: 'Nom' },
        { header: 'email', required: true, desc: 'Email professionnel' },
        { header: 'subject', required: false, desc: 'Matière enseignée' },
        { header: 'phone', required: false, desc: 'Téléphone' }
    ],
    grades: [
        { header: 'studentMatricule', required: true, desc: 'Matricule de l\'élève' },
        { header: 'subject', required: true, desc: 'Matière' },
        { header: 'grade', required: true, desc: 'Note (0-20)' },
        { header: 'coefficient', required: true, desc: 'Coefficient' },
        { header: 'type', required: true, desc: 'Type (DEVOIR, COMPO, ORAL)' }
    ]
};

export function BulkImport({ existingClasses = [], existingStudents = [], currentAcademicYear }: BulkImportProps) {
    const { toast } = useToast();
    const { schoolId } = useSchoolData();
    const firestore = useFirestore();

    const [importType, setImportType] = useState<ImportType>('students');
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Générer et télécharger le modèle
    const downloadTemplate = () => {
        const template = TEMPLATES[importType];
        const ws = XLSX.utils.json_to_sheet([
            template.reduce((acc, col) => ({ ...acc, [col.header]: col.desc }), {})
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, `modele_import_${importType}.xlsx`);
    };

    // Gérer l'upload du fichier
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            if (data.length > 0) {
                setHeaders(data[0] as string[]);
                // Convertir les lignes en objets
                const rows = data.slice(1).map((row: any) => {
                    const obj: any = {};
                    (data[0] as string[]).forEach((key, index) => {
                        obj[key.trim()] = row[index]; // Trim keys to avoid issues
                    });
                    return obj;
                });
                setFileData(rows);
            }
        };
        reader.readAsBinaryString(file);
    };

    // Valider les données avant import
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

    // Exécuter l'import
    const executeImport = async () => {
        const validation = validateData();
        if (!validation.valid) {
            toast({ variant: "destructive", title: "Erreur de format", description: validation.error });
            return;
        }

        if (!schoolId) return;

        setIsUploading(true);
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        setProgress({ current: 0, total: fileData.length });

        // Déterminer la collection cible (sauf pour les notes qui sont des sous-collections)
        let collectionPath = '';
        if (importType === 'students') collectionPath = `ecoles/${schoolId}/eleves`;
        else if (importType === 'teachers') collectionPath = `ecoles/${schoolId}/personnel`;

        for (let i = 0; i < fileData.length; i++) {
            const row = fileData[i];
            const rowIndex = i + 2; // +1 pour l'index 0, +1 pour l'en-tête

            // Ignorer les lignes vides
            if (!row || Object.keys(row).length === 0) continue;

            try {
                // Nettoyage et formatage basique
                const cleanRow: any = {
                    ...row,
                    createdAt: serverTimestamp(),
                    schoolId
                };

                // Spécificités par type
                if (importType === 'students') {
                    if (!cleanRow.firstName || !cleanRow.lastName) throw new Error("Nom ou Prénom manquant");

                    // Gestion de la date de naissance
                    if (cleanRow.dateOfBirth) {
                        if (typeof cleanRow.dateOfBirth === 'number') {
                            // Format Excel (nombre de jours depuis 1900)
                            const date = new Date(Math.round((cleanRow.dateOfBirth - 25569) * 86400 * 1000));
                            cleanRow.dateOfBirth = date.toISOString().split('T')[0];
                        } else if (typeof cleanRow.dateOfBirth === 'string' && cleanRow.dateOfBirth.includes('/')) {
                            // Format JJ/MM/AAAA
                            const parts = cleanRow.dateOfBirth.split('/');
                            if (parts.length === 3) {
                                cleanRow.dateOfBirth = `${parts[2]}-${parts[1]}-${parts[0]}`;
                            }
                        }
                    }

                    // Assignation de la classe
                    if (cleanRow.className) {
                        const targetClass = existingClasses.find(c =>
                            c.name.toLowerCase().trim() === cleanRow.className.toString().toLowerCase().trim()
                        );
                        if (targetClass) {
                            cleanRow.classId = targetClass.id;
                            cleanRow.class = targetClass.name;
                        } else {
                            throw new Error(`Classe "${cleanRow.className}" introuvable`);
                        }
                    }

                    // Année scolaire et valeurs par défaut
                    if (currentAcademicYear) cleanRow.inscriptionYear = currentAcademicYear;
                    cleanRow.status = 'Actif';
                    cleanRow.tuitionStatus = 'Non payé';
                    cleanRow.amountDue = 0;

                    await addDoc(collection(firestore, collectionPath), cleanRow);

                } else if (importType === 'grades') {
                    // Validation des champs obligatoires pour les notes
                    if (!cleanRow.studentMatricule) throw new Error("Matricule manquant");
                    if (!cleanRow.subject) throw new Error("Matière manquante");
                    if (cleanRow.grade === undefined || cleanRow.grade === null) throw new Error("Note manquante");

                    const gradeValue = Number(cleanRow.grade);
                    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 20) {
                        throw new Error(`Note invalide (${cleanRow.grade}). Doit être entre 0 et 20.`);
                    }

                    // Recherche de l'élève par matricule
                    // On normalise les matricules (trim et lowercase) pour la comparaison
                    const cleanMatricule = cleanRow.studentMatricule.toString().trim().toLowerCase();
                    const student = existingStudents.find(s =>
                        s.matricule && s.matricule.toString().trim().toLowerCase() === cleanMatricule
                    );

                    if (!student) {
                        throw new Error(`Élève avec le matricule "${cleanRow.studentMatricule}" introuvable`);
                    }

                    // Préparation de la note
                    const gradeData = {
                        schoolId,
                        subject: cleanRow.subject,
                        grade: gradeValue,
                        coefficient: Number(cleanRow.coefficient || 1),
                        type: cleanRow.type || 'Devoir',
                        date: cleanRow.date ? new Date(cleanRow.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        createdAt: serverTimestamp(),
                    };

                    // Ajout dans la sous-collection de l'élève
                    await addDoc(collection(firestore, `ecoles/${schoolId}/eleves/${student.id}/notes`), gradeData);

                } else {
                    // imports génériques (ex: personnel/enseignants)
                    await addDoc(collection(firestore, collectionPath), cleanRow);
                }

                successCount++;
            } catch (err: any) {
                console.error("Erreur import ligne:", row, err);
                errorCount++;
                errors.push(`Ligne ${rowIndex}: ${err.message}`);
            }
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setIsUploading(false);
        setFileData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Rapport final
        if (errorCount > 0) {
            toast({
                variant: "destructive",
                title: "Import terminé avec des erreurs",
                description: `${successCount} succès, ${errorCount} échecs. Consultez la console pour les détails.`,
            });
            // Afficher les premières erreurs dans une alerte ou un autre toast si besoin, 
            // ici on se contente de la description globale pour ne pas spammer
            console.error("Détails des erreurs d'import:", errors);
        } else {
            toast({
                title: "Import terminé avec succès",
                description: `${successCount} éléments importés.`,
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Importation de Masse</CardTitle>
                <CardDescription>Ajoutez rapidement des élèves ou du personnel via fichier Excel/CSV.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-2 w-full md:w-1/3">
                        <Label>Type de données</Label>
                        <Select value={importType} onValueChange={(v: ImportType) => { setImportType(v); setFileData([]); }}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="students">Élèves</SelectItem>
                                <SelectItem value="teachers">Enseignants / Personnel</SelectItem>
                                <SelectItem value="grades">Notes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="outline" onClick={downloadTemplate}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Télécharger le modèle
                    </Button>
                </div>

                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center space-y-2 bg-muted/20">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <Label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                        Cliquez pour uploader un fichier Excel (.xlsx, .csv)
                    </Label>
                    <Input
                        id="file-upload"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <p className="text-xs text-muted-foreground text-center max-w-sm">
                        Assurez-vous que les colonnes correspondent exactement au modèle téléchargé.
                    </p>
                </div>

                {fileData.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium text-sm">Aperçu ({fileData.length} lignes)</h4>
                            <Button onClick={executeImport} disabled={isUploading}>
                                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Lancer l'importation
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
                                            {headers.map((h, j) => <TableCell key={j}>{row[h]}</TableCell>)}
                                        </TableRow>
                                    ))}
                                    {fileData.length > 5 && (
                                        <TableRow>
                                            <TableCell colSpan={headers.length} className="text-center text-muted-foreground">
                                                ... {fileData.length - 5} autres lignes ...
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
            </CardContent>
        </Card>
    );
}
