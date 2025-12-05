'use client';

import React, { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, User, Cake, MapPin, VenetianMask, School, GraduationCap, Users, Phone, Hash } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSchoolData } from '@/hooks/use-school-data';
import type { student as Student } from '@/lib/data-types';

interface SchoolInfo {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  mainLogoUrl?: string;
}

interface StudentInfoSheetProps {
  student: Student;
  school: SchoolInfo;
}

export const StudentInfoSheet: React.FC<StudentInfoSheetProps> = ({ student, school }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (printContent) {
      const printWindow = window.open('', '', 'height=800,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Fiche de Renseignements</title>');
        printWindow.document.write('<link rel="stylesheet" href="/_next/static/css/app/layout.css" type="text/css" media="print">');
        printWindow.document.write(`
            <style>
                body { font-family: sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .no-print { display: none !important; }
                .printable-card { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 auto; max-width: 210mm; }
                @page { size: A4; margin: 20mm; }
            </style>
        `);
        printWindow.document.write('</head><body style="color: black !important;">');
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

  const studentFullName = `${student.firstName} ${student.lastName}`;
  const fallback = studentFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto">
        <Card className="printable-card" >
            <CardContent className="p-4 sm:p-6">
                <div ref={printRef}>
                    {/* Header */}
                    <div className="flex justify-between items-center pb-4 border-b-2 border-primary mb-6">
                        <div className="flex items-center gap-4">
                            {school.mainLogoUrl && <img src={school.mainLogoUrl} alt={school.name} className="h-20 w-20 object-contain" />}
                            <div>
                                <h2 className="text-2xl font-bold">{school.name}</h2>
                                <p className="text-xs text-muted-foreground">{school.address}</p>
                                <p className="text-xs text-muted-foreground">Tél: {school.phone} - Site: {school.website}</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold tracking-tight">FICHE DE RENSEIGNEMENTS</h1>
                        <p className="text-muted-foreground">Année scolaire: {new Date().getFullYear() - 1}-{new Date().getFullYear()}</p>
                    </div>

                    {/* Student Identity */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-4 border rounded-lg bg-muted/50">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={student.photoUrl || `https://picsum.photos/seed/${student.matricule}/200`} alt={studentFullName} data-ai-hint="student portrait" />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 text-center sm:text-left">
                            <h3 className="text-2xl font-bold text-primary">{studentFullName}</h3>
                            <InfoRow icon={Hash} label="Matricule" value={student.matricule} />
                            <InfoRow icon={User} label="Statut" value={student.status} />
                        </div>
                    </div>

                    {/* Detailed Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-4">
                            <h4 className="font-bold text-lg border-b pb-1">Informations Personnelles</h4>
                            <InfoRow icon={Cake} label="Date de naissance" value={student.dateOfBirth ? format(new Date(student.dateOfBirth), 'd MMMM yyyy', { locale: fr }) : 'N/A'} />
                            <InfoRow icon={MapPin} label="Lieu de naissance" value={student.placeOfBirth} />
                            <InfoRow icon={VenetianMask} label="Sexe" value={student.gender} />
                            <InfoRow icon={MapPin} label="Adresse" value={student.address} />
                        </div>
                         <div className="space-y-4">
                            <h4 className="font-bold text-lg border-b pb-1">Informations Scolaires</h4>
                             <InfoRow icon={GraduationCap} label="Classe" value={student.class} />
                             <InfoRow icon={GraduationCap} label="Cycle" value={student.cycle} />
                             <InfoRow icon={School} label="Ancien établissement" value={student.previousSchool} />
                        </div>
                        <div className="space-y-4 md:col-span-2">
                             <h4 className="font-bold text-lg border-b pb-1">Contacts des Parents / Tuteurs</h4>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                 <div className="space-y-2">
                                     <p className="font-semibold text-primary">Parent / Tuteur 1</p>
                                     <InfoRow icon={User} label="Nom complet" value={`${student.parent1FirstName} ${student.parent1LastName}`} />
                                     <InfoRow icon={Phone} label="Contact" value={student.parent1Contact} />
                                 </div>
                                  <div className="space-y-2">
                                     <p className="font-semibold text-primary">Parent / Tuteur 2</p>
                                     <InfoRow icon={User} label="Nom complet" value={student.parent2FirstName ? `${student.parent2FirstName} ${student.parent2LastName}` : 'N/A'} />
                                     <InfoRow icon={Phone} label="Contact" value={student.parent2Contact} />
                                 </div>
                             </div>
                        </div>
                    </div>
                     <div className="flex justify-end mt-12 text-sm">
                        Fait à {school.address?.split(',')[0] || 'Abidjan'}, le {format(new Date(), 'd MMMM yyyy', { locale: fr })}
                     </div>
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
