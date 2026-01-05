
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Cake, VenetianMask, CalendarCheck, MapPin, School, GraduationCap } from 'lucide-react';
import type { student as Student } from '@/lib/data-types';

interface InfoTabProps {
    student: Student;
}

export function InfoTab({ student }: InfoTabProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Informations Administratives</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                 <div className="flex items-center">
                    <Cake className="mr-3 h-5 w-5 text-muted-foreground" />
                    <span>Né(e) le <strong>{student.dateOfBirth ? format(new Date(student.dateOfBirth), 'd MMMM yyyy', { locale: fr }) : 'N/A'}</strong> à <strong>{student.placeOfBirth}</strong></span>
                </div>
                <div className="flex items-center">
                    <VenetianMask className="mr-3 h-5 w-5 text-muted-foreground" />
                    <span>Sexe: <strong>{student.gender || 'N/A'}</strong></span>
                </div>
                 <div className="flex items-center">
                    <GraduationCap className="mr-3 h-5 w-5 text-muted-foreground" />
                    <span>Cycle: <strong>{student.cycle || 'N/A'}</strong></span>
                </div>
                <div className="flex items-center">
                    <CalendarCheck className="mr-3 h-5 w-5 text-muted-foreground" />
                    <span>Année d'inscription: <strong>{student.inscriptionYear || 'N/A'}</strong></span>
                </div>
                <div className="flex items-start">
                    <MapPin className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span>Adresse: <strong>{student.address || 'N/A'}</strong></span>
                </div>
                <Separator />
                <div className="flex items-center">
                    <School className="mr-3 h-5 w-5 text-muted-foreground" />
                    <span>Ancien Etab.: <strong>{student.previousSchool || 'N/A'}</strong></span>
                </div>
            </CardContent>
        </Card>
    );
}
