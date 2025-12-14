

'use client';

import React, { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, User, Cake, MapPin, Phone, Mail, Book, BookUser, Hash } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { staff as Teacher } from '@/lib/data-types';
import { useHydrationFix } from '@/hooks/use-hydration-fix';

interface SchoolInfo {
  name: string;
  address?: string;
  mainLogoUrl?: string;
  directorFirstName?: string;
  directorLastName?: string;
}

interface TeacherInfoSheetProps {
  teacher: Teacher & { id: string };
  school: SchoolInfo;
}

export const TeacherInfoSheet: React.FC<TeacherInfoSheetProps> = ({ teacher, school }) => {
  const isMounted = useHydrationFix();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const InfoRow = ({ icon: Icon, label, value, isLink, href }: { icon: React.ElementType, label: string, value?: string | number | null, isLink?: boolean, href?: string }) => (
    <div className="flex items-start text-sm">
        <Icon className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1">
            <span className="text-muted-foreground">{label}:</span>
            {isLink ? (
                <a href={href} className="font-semibold ml-1 text-primary hover:underline">{value || 'N/A'}</a>
            ) : (
                <span className="font-semibold ml-1">{value || 'N/A'}</span>
            )}
        </div>
    </div>
  );

  const teacherFullName = `${teacher.firstName} ${teacher.lastName}`;
  const fallback = teacherFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const currentYear = isMounted ? new Date().getFullYear() : '...';
  const directorFullName = `${school.directorFirstName || ''} ${school.directorLastName || ''}`.trim();

  return (
    <div className="max-w-4xl mx-auto">
        <Card className="printable-card" >
            <CardContent className="p-4 sm:p-6">
                <div ref={printRef}>
                    <header className="flex justify-between items-center pb-4 border-b-2 border-primary mb-6">
                        <div className="flex items-center gap-4">
                            {school.mainLogoUrl && <img src={school.mainLogoUrl} alt={school.name} className="h-20 w-20 object-contain" />}
                            <div>
                                <h1 className="text-2xl font-bold">{school.name}</h1>
                                <p className="text-xs text-muted-foreground">{school.address}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <h2 className="text-2xl font-bold tracking-tight">FICHE ENSEIGNANT</h2>
                             <p className="text-muted-foreground">Année scolaire: {isMounted ? `${Number(currentYear) - 1}-${currentYear}` : '...'}</p>
                        </div>
                    </header>

                    <main className="space-y-8">
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 border rounded-lg bg-muted/50">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={teacher.photoURL || `https://picsum.photos/seed/${teacher.id}/200`} alt={teacherFullName} data-ai-hint="person face" />
                                <AvatarFallback>{fallback}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1 text-center sm:text-left">
                                <h3 className="text-2xl font-bold text-primary">{teacherFullName}</h3>
                                <InfoRow icon={Hash} label="ID Enseignant" value={teacher.id} />
                            </div>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-4">
                                <h4 className="font-bold text-lg border-b pb-1">Informations Professionnelles</h4>
                                <InfoRow icon={Book} label="Matière principale" value={teacher.subject} />
                                <InfoRow icon={BookUser} label="Classe principale" value={teacher.classId || 'Non assignée'} />
                            </div>
                             <div className="space-y-4">
                                <h4 className="font-bold text-lg border-b pb-1">Coordonnées</h4>
                                <InfoRow icon={Mail} label="Email" value={teacher.email} isLink href={`mailto:${teacher.email}`} />
                                <InfoRow icon={Phone} label="Téléphone" value={teacher.phone} isLink href={`tel:${teacher.phone}`} />
                            </div>
                        </div>
                    </main>

                     <footer className="mt-16 grid grid-cols-2 gap-4 text-center text-sm">
                        <div>
                             <div className="font-bold">Signature de l'enseignant(e)</div>
                             <div className="mt-16 border-t border-dashed w-48 mx-auto"></div>
                        </div>
                         <div>
                            <div className="font-bold">Cachet et Signature de la Direction</div>
                             <div className="mt-16 border-t border-dashed w-48 mx-auto"></div>
                             <span>{directorFullName}</span>
                        </div>
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
