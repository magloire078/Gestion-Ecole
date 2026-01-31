'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInYears, addYears, differenceInMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Cake, VenetianMask, CalendarCheck, MapPin, School, GraduationCap, Users } from 'lucide-react';
import type { student as Student } from '@/lib/data-types';

interface InfoTabProps {
    student: Student;
}

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

const InfoRow = ({ label, value, icon: Icon }: { label: string, value?: string | number | null, icon: React.ElementType }) => (
    <div className="flex items-start text-sm">
        <Icon className="h-4 w-4 mr-3 mt-1 text-muted-foreground flex-shrink-0" />
        <div className="flex-1">
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-semibold ml-1">{value || 'N/A'}</span>
        </div>
    </div>
);

export function InfoTab({ student }: InfoTabProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Informations Personnelles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <InfoRow icon={Cake} label="Date de naissance" value={`${student.dateOfBirth ? format(new Date(student.dateOfBirth), 'd MMMM yyyy', { locale: fr }) : 'N/A'}`} />
                    <InfoRow icon={Cake} label="Âge" value={getAge(student.dateOfBirth)} />
                    <InfoRow icon={MapPin} label="Lieu de naissance" value={student.placeOfBirth} />
                    <InfoRow icon={VenetianMask} label="Sexe" value={student.gender} />
                    <InfoRow icon={MapPin} label="Adresse" value={student.address} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Informations Scolaires</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <InfoRow icon={GraduationCap} label="Niveau" value={student.grade} />
                    <InfoRow icon={GraduationCap} label="Cycle" value={student.cycle} />
                    <InfoRow icon={CalendarCheck} label="Année d'inscription" value={student.inscriptionYear} />
                    <InfoRow icon={School} label="Ancien établissement" value={student.previousSchool} />
                </CardContent>
            </Card>
        </div>
    );
}
