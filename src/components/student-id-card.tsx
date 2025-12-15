
'use client';

import React, { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import QRCode from "react-qr-code";
import type { student as Student } from '@/lib/data-types';
import { useHydrationFix } from '@/hooks/use-hydration-fix';
import { SafeImage } from './ui/safe-image';

interface SchoolInfo {
  name: string;
  mainLogoUrl?: string;
}

interface StudentIdCardProps {
  student: Student;
  school: SchoolInfo;
}

export const StudentIdCard: React.FC<StudentIdCardProps> = ({ student, school }) => {
  const isMounted = useHydrationFix();
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
     window.print();
  };
  
  const studentFullName = `${student.firstName} ${student.lastName}`;
  const fallback = studentFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const currentYear = isMounted ? new Date().getFullYear() : '...';

  // Le contenu du QR Code peut être l'ID de l'élève ou son matricule
  const qrCodeValue = student.id || student.matricule;

  return (
    <div className="max-w-md mx-auto">
        <Card className="printable-card font-sans">
            <CardContent className="p-0">
                <div ref={cardRef} className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-blue-900/50 p-6 rounded-t-xl">
                    <header className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                             {school.mainLogoUrl && <SafeImage src={school.mainLogoUrl} alt={school.name} width={40} height={40} className="object-contain" />}
                            <h1 className="font-bold text-lg">{school.name}</h1>
                        </div>
                        <p className="text-xs font-mono">Année {isMounted ? `${Number(currentYear) - 1}-${currentYear}` : '...'}</p>
                    </header>

                    <div className="flex items-center gap-6">
                        <Avatar className="h-28 w-28 border-4 border-white shadow-md">
                            <SafeImage src={student.photoUrl} alt={studentFullName} width={112} height={112} data-ai-hint="student portrait" className="rounded-full" />
                            <AvatarFallback className="text-3xl">{fallback}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold">{studentFullName}</h2>
                            <p className="text-primary font-medium">{student.class}</p>
                            <p className="text-sm text-muted-foreground">Matricule: {student.matricule}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-background p-6 rounded-b-xl flex items-center justify-center">
                    {qrCodeValue && (
                        <div className="bg-white p-2 rounded-lg shadow-md">
                            <QRCode
                                value={qrCodeValue}
                                size={128}
                                fgColor="#000000"
                                bgColor="#FFFFFF"
                            />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
        <div className="mt-6 flex justify-center gap-4 no-print">
            <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer la Carte
            </Button>
        </div>
    </div>
  );
};
