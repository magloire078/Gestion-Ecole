'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FileText, Download, Loader2, CheckCircle2, Sparkles, Printer } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { RegistrationFormPDFService } from '@/services/registration-form-pdf-service';
import { useToast } from '@/hooks/use-toast';
import type { class_type as Class, student as Student } from '@/lib/data-types';

interface RegistrationFormDialogProps {
    trigger?: React.ReactNode;
    classes?: Class[];
    student?: Student; // Si passé, mode fiche élève / réinscription
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function RegistrationFormDialog({
    trigger,
    classes = [],
    student,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: RegistrationFormDialogProps) {
    const { schoolData } = useSchoolData();
    const { toast } = useToast();

    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setUncontrolledOpen;

    const currentYear = schoolData?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const [academicYear, setAcademicYear] = useState<string>(currentYear);
    const [selectedClassId, setSelectedClassId] = useState<string>('blank');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const handleGenerate = async () => {
        if (!schoolData) {
            toast({
                title: 'Erreur',
                description: 'Données de l\'établissement introuvables.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setIsGenerating(true);
            const targetClass = classes.find(c => c.id === selectedClassId);
            const targetClassName = selectedClassId === 'blank' ? undefined : (targetClass?.name || selectedClassId);

            await RegistrationFormPDFService.generateRegistrationFormPDF({
                school: schoolData,
                academicYear: academicYear || currentYear,
                targetClassName,
                student,
                schoolLogoUrl: schoolData.mainLogoUrl,
            });

            toast({
                title: 'Fiche d\'inscription générée',
                description: 'Le fichier PDF A4 a été téléchargé avec succès.',
            });

            setOpen(false);
        } catch (error) {
            console.error('Erreur génération PDF:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de générer la fiche d\'inscription en PDF.',
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[480px] rounded-2xl bg-white border border-slate-200/80 shadow-2xl p-6">
                <DialogHeader className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
                                {student ? 'Fiche de Réinscription PDF' : 'Fiche d\'Inscription Vierge (PDF)'}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium">
                                {student 
                                    ? `Fiche pré-remplie pour l'élève ${student.firstName} ${student.lastName}`
                                    : 'Format A4 officiel prêt à imprimer pour remplissage manuel par les parents'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-3">
                    {/* Cadre récapitulatif */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-600">Établissement :</span>
                            <span className="font-bold text-slate-900">{schoolData?.name || 'Mon Établissement'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-600">Mise en page :</span>
                            <span className="font-medium text-slate-700">A4 Portrait (Grille complète & Photo 4x4)</span>
                        </div>
                    </div>

                    {/* Année académique */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                            Année Académique
                        </Label>
                        <Input
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            placeholder="ex: 2026-2027"
                            className="rounded-xl font-mono text-sm border-slate-200"
                        />
                    </div>

                    {/* Classe / Niveau cible (optionnel) */}
                    {!student && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                Classe / Niveau ciblé (optionnel)
                            </Label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger className="rounded-xl border-slate-200">
                                    <SelectValue placeholder="Laisser vide (choix libre au stylo)" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="blank">Laisser vide (remplissage manuel)</SelectItem>
                                    {classes.map((cls, idx) => (
                                        <SelectItem key={cls.id || idx} value={cls.id || cls.name || `class-${idx}`}>
                                            {cls.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-slate-400">
                                Si sélectionné, la classe sera imprimée directement sur l&apos;en-tête de la fiche.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        className="rounded-xl border-slate-200"
                    >
                        Annuler
                    </Button>
                    <Button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2 transition-all hover:scale-105 active:scale-95 shadow-md shadow-blue-500/20"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Génération...
                            </>
                        ) : (
                            <>
                                <Printer className="h-4 w-4" />
                                Télécharger la Fiche PDF
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
