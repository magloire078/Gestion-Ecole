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
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Types de données supportés pour l'import
type ImportType = 'students' | 'teachers' | 'grades';

// Modèles de colonnes attendues
const TEMPLATES = {
    students: [
        { header: 'firstName', required: true, desc: 'Prénom de l\'élève' },
        { header: 'lastName', required: true, desc: 'Nom de l\'élève' },
        { header: 'dateOfBirth', required: true, desc: 'Date de naissance (JJ/MM/AAAA)' },
        { header: 'gender', required: true, desc: 'Genre (M/F)' },
        { header: 'email', required: false, desc: 'Email (optionnel)' },
        { header: 'matricule', required: false, desc: 'Matricule (optionnel)' },
        { header: 'parentEmail', required: false, desc: 'Email du parent (pour liaison)' }
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

export function BulkImport() {
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

        setProgress({ current: 0, total: fileData.length });

        // Déterminer la collection cible
        let collectionPath = '';
        if (importType === 'students') collectionPath = `ecoles/${schoolId}/eleves`;
        else if (importType === 'teachers') collectionPath = `ecoles/${schoolId}/personnel`;
        // Note: Grades import requires finding student ID by matricule first, complex logic simplified here.
        // For simplicity, we'll implement Students and Teachers direct insert first.

        for (const row of fileData) {
            // Ignorer les lignes vides
            if (!row || Object.keys(row).length === 0) continue;

            try {
                // Nettoyage et formatage basique
                const cleanRow = { ...row, createdAt: serverTimestamp() };

                // Spécificités par type
                if (importType === 'students') {
                    if (!cleanRow.firstName || !cleanRow.lastName) throw new Error("Nom/Prénom manquant");
                    // Conversion date si nécessaire ? XLSX le gère souvent bien ou renvoie un nombre.
                    // Pour l'instant on insère brut.
                }

                await addDoc(collection(firestore, collectionPath), cleanRow);
                successCount++;
            } catch (err) {
                console.error("Import error row:", row, err);
                errorCount++;
            }
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setIsUploading(false);
        setFileData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';

        toast({
            title: "Import terminé",
            description: `${successCount} succès, ${errorCount} erreurs.`,
            variant: errorCount > 0 ? "destructive" : "default"
        });
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
                                <SelectItem value="grades" disabled>Notes (Bientôt)</SelectItem>
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
