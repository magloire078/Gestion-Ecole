

'use client';

import React, { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, User, Phone, MapPin, Globe, Building, Hash, Shield, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { school as School } from '@/lib/data-types';
import { SafeImage } from './ui/safe-image';

interface SchoolInfoSheetProps {
    school: School;
}

export const SchoolInfoSheet: React.FC<SchoolInfoSheetProps> = ({ school }) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const printContent = printRef.current?.innerHTML;
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=800');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Fiche Établissement - ' + (school?.name || 'École') + '</title>');
                printWindow.document.write('<link rel="stylesheet" href="/globals.css" type="text/css" media="print">');
                printWindow.document.write(`
            <style>
                body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: black !important; }
                .no-print { display: none !important; }
                .printable-card { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 auto; max-width: 210mm; }
                @page { size: A4; margin: 15mm; }
            </style>
        `);
                printWindow.document.write('<body style="background: white; color: black !important; padding: 20px;">');
                printWindow.document.write(printContent);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 250);
            }
        }
    };

    const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | number | null }) => (
        <div className="flex items-start gap-3 text-sm py-1.5 border-b border-slate-100 dark:border-slate-800/40 last:border-0">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm break-words">{value || 'N/A'}</span>
            </div>
        </div>
    );

    const directorFullName = `${school?.directorFirstName || ''} ${school?.directorLastName || ''}`.trim() || 'N/A';
    const currentYear = (school as any)?.currentAcademicYear || `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
    const schoolName = school?.name || 'Établissement Scolaire';
    const addressCity = school?.address?.split(',')[0] || "L'établissement";

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex justify-end no-print">
                <Button 
                    onClick={handlePrint} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all gap-2"
                >
                    <Printer className="h-4 w-4" />
                    Imprimer la Fiche
                </Button>
            </div>

            <Card className="printable-card rounded-2xl border border-border/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                    <div ref={printRef} className="space-y-8">
                        {/* Header */}
                        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b-2 border-indigo-600/30">
                            <div className="flex items-center gap-4">
                                {school?.mainLogoUrl ? (
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-indigo-100 dark:border-indigo-900 overflow-hidden bg-white shadow-md p-1 shrink-0">
                                        <SafeImage 
                                            src={school.mainLogoUrl} 
                                            alt={schoolName} 
                                            fill 
                                            className="object-contain" 
                                        />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 shrink-0">
                                        <Building className="w-8 h-8" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                                        {schoolName}
                                    </h1>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {school?.address || 'Adresse non renseignée'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right">
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                                    FICHE D&apos;INFORMATION
                                </span>
                                <p className="text-xs text-slate-500 font-mono mt-1">Année scolaire : <strong className="text-slate-800 dark:text-slate-200">{currentYear}</strong></p>
                            </div>
                        </header>

                        {/* Contenu en Grille */}
                        <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Informations Générales */}
                            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-2">
                                <h3 className="font-black text-sm uppercase tracking-wider text-indigo-600 dark:text-indigo-400 pb-2 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    Informations Générales
                                </h3>
                                <div className="space-y-1 pt-1">
                                    <InfoRow icon={Building} label="Nom de l'établissement" value={school?.name} />
                                    <InfoRow icon={MapPin} label="Adresse" value={school?.address} />
                                    <InfoRow icon={Phone} label="Téléphone" value={school?.phone} />
                                    <InfoRow icon={Globe} label="Site Web" value={school?.website} />
                                    <InfoRow icon={Mail} label="Email de contact" value={school?.email} />
                                </div>
                            </div>

                            {/* Informations Administratives */}
                            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-2">
                                <h3 className="font-black text-sm uppercase tracking-wider text-indigo-600 dark:text-indigo-400 pb-2 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Informations Administratives
                                </h3>
                                <div className="space-y-1 pt-1">
                                    <InfoRow icon={Shield} label="DRENA de tutelle" value={school?.drena} />
                                    <InfoRow icon={Hash} label="Matricule Établissement" value={school?.matricule} />
                                    <InfoRow icon={Hash} label="N° CNPS Employeur" value={school?.cnpsEmployeur} />
                                    <InfoRow icon={Hash} label="Code d'invitation" value={school?.schoolCode} />
                                </div>
                            </div>

                            {/* Direction */}
                            <div className="md:col-span-2 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-2">
                                <h3 className="font-black text-sm uppercase tracking-wider text-indigo-600 dark:text-indigo-400 pb-2 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Direction & Responsables
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pt-1">
                                    <InfoRow icon={User} label="Nom du Directeur/rice" value={directorFullName} />
                                    <InfoRow icon={Phone} label="Contact Direction" value={school?.directorPhone} />
                                    <InfoRow icon={Mail} label="Email Direction" value={school?.directorEmail} />
                                </div>
                            </div>
                        </main>

                        {/* Footer / Signature */}
                        <footer className="flex justify-between items-end pt-8 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500">
                            <div>
                                <p className="font-mono">Document officiel généré par GèreEcole</p>
                            </div>
                            <div className="text-right">
                                <p>Fait à {addressCity}, le {format(new Date(), 'd MMMM yyyy', { locale: fr })}</p>
                                <p className="mt-1 font-semibold text-slate-700 dark:text-slate-300">La Direction</p>
                            </div>
                        </footer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

