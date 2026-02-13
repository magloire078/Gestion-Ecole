

'use client';

import React, { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, User, Phone, Map, Globe, Building, Hash, Shield } from 'lucide-react';
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
                printWindow.document.write('<html><head><title>Fiche Établissement</title>');
                printWindow.document.write('<link rel="stylesheet" href="/globals.css" type="text/css" media="print">');
                printWindow.document.write(`
            <style>
                body { font-family: sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .no-print { display: none !important; }
                .printable-card { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 auto; max-width: 210mm; }
                @page { size: A4; margin: 20mm; }
            </style>
        `);
                printWindow.document.write('<body style="color: black !important;">');
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
        <div className="flex items-start text-sm">
            <Icon className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
                <span className="text-muted-foreground">{label}:</span>
                <span className="font-semibold ml-1">{value || 'N/A'}</span>
            </div>
        </div>
    );

    const directorFullName = `${school.directorFirstName || ''} ${school.directorLastName || ''}`.trim();
    const currentYear = (school as any).currentAcademicYear || `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;

    return (
        <div className="max-w-4xl mx-auto">
            <Card className="printable-card" >
                <CardContent className="p-4 sm:p-6">
                    <div ref={printRef}>
                        <header className="flex justify-between items-center pb-4 border-b-2 border-primary mb-6">
                            <div className="flex items-center gap-4">
                                {school.mainLogoUrl && <SafeImage src={school.mainLogoUrl} alt={school.name} width={80} height={80} className="object-contain" />}
                                <div>
                                    <h1 className="text-2xl font-bold">{school.name}</h1>
                                    <p className="text-xs text-muted-foreground">{school.address}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold tracking-tight">FICHE D&apos;INFORMATION</h2>
                                <p className="text-muted-foreground">Année scolaire: {currentYear}</p>
                            </div>
                        </header>

                        <main className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg border-b pb-1 text-primary">Informations Générales</h3>
                                <InfoRow icon={Building} label="Nom de l'établissement" value={school.name} />
                                <InfoRow icon={Map} label="Adresse" value={school.address} />
                                <InfoRow icon={Phone} label="Téléphone" value={school.phone} />
                                <InfoRow icon={Globe} label="Site Web" value={school.website} />
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg border-b pb-1 text-primary">Informations Administratives</h3>
                                <InfoRow icon={Shield} label="DRENA de tutelle" value={school.drena} />
                                <InfoRow icon={Hash} label="Matricule Établissement" value={school.matricule} />
                                <InfoRow icon={Hash} label="N° CNPS Employeur" value={school.cnpsEmployeur} />
                                <InfoRow icon={Hash} label="Code d'invitation" value={school.schoolCode} />
                            </div>
                            <div className="space-y-4 md:col-span-2">
                                <h3 className="font-bold text-lg border-b pb-1 text-primary">Direction</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <InfoRow icon={User} label="Nom du Directeur/rice" value={directorFullName} />
                                        <InfoRow icon={Phone} label="Contact Direction" value={school.directorPhone} />
                                    </div>
                                </div>
                            </div>
                        </main>

                        <footer className="flex justify-end mt-12 text-sm">
                            Fait à {school.address?.split(',')[0] || '...'}, le {format(new Date(), 'd MMMM yyyy', { locale: fr })}
                        </footer>
                    </div>

                    <div className="mt-6 flex justify-end no-print">
                        <Button onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimer la Fiche
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
