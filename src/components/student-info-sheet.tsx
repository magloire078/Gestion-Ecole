

'use client';

import React, { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, User, Cake, MapPin, VenetianMask, School, GraduationCap, Users, Phone, Hash, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { format, differenceInYears, addYears, differenceInMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSchoolData } from '@/hooks/use-school-data';
import type { student as Student } from '@/lib/data-types';
import { usePrint } from '@/hooks/use-print';

interface SchoolInfo {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  mainLogoUrl?: string;
  digitalSignatureUrl?: string;
  currentAcademicYear?: string;
}

interface StudentInfoSheetProps {
  student: Student;
  school: SchoolInfo;
}

export const StudentInfoSheet: React.FC<StudentInfoSheetProps> = ({ student, school }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const onPrintClick = () => {
    window.print();
  };

  const getAge = (dateOfBirth: string | undefined) => {
    if (!dateOfBirth) return 'N/A';
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const years = differenceInYears(today, birthDate);
      const monthDate = addYears(birthDate, years);
      const months = differenceInMonths(today, monthDate);

      let ageString = `${years} an${years > 1 ? 's' : ''}`;
      if (months > 0) {
        ageString += ` et ${months} mois`;
      }
      return ageString;
    } catch {
      return 'N/A';
    }
  }

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
  const currentYear = school.currentAcademicYear || `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="printable-card" >
        <CardContent className="p-4 sm:p-6">
          <div ref={printRef}>
            {/* Header */}
            <header className="flex justify-between items-center pb-4 border-b-2 border-primary mb-6">
              <div className="flex items-center gap-4">
                {school.mainLogoUrl && (
                  <img
                    src={school.mainLogoUrl}
                    alt={school.name}
                    className="h-20 w-20 object-contain"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold">{school.name}</h1>
                  <p className="text-xs text-muted-foreground">{school.address}</p>
                  <p className="text-xs text-muted-foreground">Tél: {school.phone} - Site: {school.website}</p>
                </div>
              </div>
            </header>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight">FICHE DE RENSEIGNEMENTS</h1>
              <p className="text-muted-foreground">Année scolaire: {currentYear}</p>
            </div>

            {/* Student Identity */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-4 border rounded-lg bg-muted/50">
              <div className="h-28 w-28 border-2 border-primary rounded-lg overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={studentFullName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      console.error("StudentInfoSheet: Failed to load image", student.photoUrl?.substring(0, 50));
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
                    <User className="h-10 w-10 mb-1" />
                    <span className="text-[10px]">Pas de photo</span>
                  </div>
                )}
              </div>
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
                <InfoRow icon={Cake} label="Date de naissance" value={`${student.dateOfBirth ? format(new Date(student.dateOfBirth), 'd MMMM yyyy', { locale: fr }) : 'N/A'} (${getAge(student.dateOfBirth)})`} />
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
                    {(student as any).parent1Email && <InfoRow icon={Mail} label="Email" value={(student as any).parent1Email} />}
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-primary">Parent / Tuteur 2</p>
                    <InfoRow icon={User} label="Nom complet" value={student.parent2FirstName ? `${student.parent2FirstName} ${student.parent2LastName}` : 'N/A'} />
                    <InfoRow icon={Phone} label="Contact" value={student.parent2Contact} />
                    {(student as any).parent2Email && <InfoRow icon={Mail} label="Email" value={(student as any).parent2Email} />}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-end mt-12 text-sm">
              <div className="flex flex-col items-start italic text-muted-foreground">
                Note: Cette fiche est générée numériquement par Gérecole.
              </div>
              <div className="flex flex-col items-center gap-2">
                <div>Fait à {school.address?.split(',')[0] || '...'}, le {format(new Date(), 'd MMMM yyyy', { locale: fr })}</div>
                <div className="font-bold border-b pb-1">Le Directeur</div>
                <div className="h-16 w-32 flex items-center justify-center">
                  {school.digitalSignatureUrl ? (
                    <img
                      src={school.digitalSignatureUrl}
                      alt="Signature du Directeur"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-full border border-dashed rounded flex items-center justify-center text-[10px] text-muted-foreground opacity-30">
                      Cadre réservé à la signature
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end no-print">
            <Button onClick={onPrintClick}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer la Fiche
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
