
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { staff as Staff, student as Student } from '@/lib/data-types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';

interface TimetableEntry {
  id: string;
  classId: string;
  teacherId: string;
  subject: string;
  day: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

interface StudentTimetableTabProps {
  schoolId: string;
  student: Student;
}

export const StudentTimetableTab: React.FC<StudentTimetableTabProps> = ({ student, schoolId }) => {
  const firestore = useFirestore();
  const classId = student.classId;

  const timetableQuery = useMemoFirebase(() =>
    (classId) ? query(collection(firestore, `ecoles/${schoolId}/emploi_du_temps`), where('classId', '==', classId)) : null
  , [firestore, schoolId, classId]);

  const teachersQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/personnel`)), [firestore, schoolId]);

  const { data: timetableData, loading: timetableLoading } = useCollection(timetableQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);

  const timetableEntries = useMemo(() => timetableData?.map(d => ({ id: d.id, ...d.data() } as TimetableEntry)) || [], [timetableData]);
  const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);

  const { timeSlots, days, timetableGrid } = useMemo(() => {
    if (timetableEntries.length === 0) {
      return { timeSlots: [], days: [], timetableGrid: {} };
    }

    const uniqueStartTimes = [...new Set(timetableEntries.map(e => e.startTime))].sort((a,b) => a.localeCompare(b));
    const orderedDays: ('Lundi'|'Mardi'|'Mercredi'|'Jeudi'|'Vendredi'|'Samedi')[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const grid: Record<string, Record<string, { subject: string; teacher: string; endTime: string }>> = {};

    uniqueStartTimes.forEach(time => {
        grid[time] = {};
    });

    timetableEntries.forEach(entry => {
      const teacherInfo = teachers.find(t => t.id === entry.teacherId);
      const teacherName = teacherInfo ? `${teacherInfo.firstName} ${teacherInfo.lastName}` : 'N/A';
      if (!grid[entry.startTime]) grid[entry.startTime] = {};
      grid[entry.startTime][entry.day] = { subject: entry.subject, teacher: teacherName, endTime: entry.endTime };
    });

    return { timeSlots: uniqueStartTimes, days: orderedDays, timetableGrid: grid };

  }, [timetableEntries, teachers]);

  const isLoading = timetableLoading || teachersLoading;

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }
  
  if (timetableEntries.length === 0) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Emploi du Temps</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground text-center py-8">L'emploi du temps pour cette classe n'est pas encore disponible.</p>
              </CardContent>
          </Card>
      )
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Emploi du Temps</CardTitle>
            <CardDescription>Classe: {student.class}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold border">Heures</TableHead>
                {days.map(day => <TableHead key={day} className="font-bold border text-center">{day}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeSlots.map((slot) => (
                <TableRow key={slot}>
                  <TableCell className="font-semibold border text-center align-middle">{slot}</TableCell>
                  {days.map(day => {
                    const entry = timetableGrid[slot]?.[day];
                    return (
                      <TableCell key={day} className="border p-1 align-top h-24">
                        {entry ? (
                          <div className="bg-primary/10 p-2 rounded-lg h-full flex flex-col justify-center text-center">
                            <p className="font-bold text-primary">{entry.subject}</p>
                            <p className="text-xs text-muted-foreground">{entry.teacher}</p>
                          </div>
                        ) : ''}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
    </Card>
  );
};
