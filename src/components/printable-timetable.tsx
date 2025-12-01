'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Student {
  name: string;
  class?: string;
}

interface School {
  name: string;
}

interface TimetableEntry {
  id: string;
  subject: string;
  teacherId: string;
  day: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi';
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

interface Teacher {
  id: string;
  name: string;
}

interface PrintableTimetableProps {
  student: Student;
  school: School;
  timetableEntries: TimetableEntry[];
  teachers: Teacher[];
}

export const PrintableTimetable: React.FC<PrintableTimetableProps> = ({ student, school, timetableEntries, teachers }) => {
  const printRef = React.useRef<HTMLDivElement>(null);

  const { timeSlots, days, timetableGrid } = useMemo(() => {
    if (timetableEntries.length === 0) {
      return { timeSlots: [], days: [], timetableGrid: {} };
    }

    const uniqueTimeSlots = [...new Set(timetableEntries.flatMap(e => [e.startTime, e.endTime]))]
      .sort((a, b) => a.localeCompare(b));
    
    const generatedTimeSlots: string[] = [];
    if (uniqueTimeSlots.length > 1) {
        for (let i = 0; i < uniqueTimeSlots.length - 1; i++) {
            generatedTimeSlots.push(`${uniqueTimeSlots[i]} - ${uniqueTimeSlots[i+1]}`);
        }
    }


    const orderedDays: ('Lundi'|'Mardi'|'Mercredi'|'Jeudi'|'Vendredi'|'Samedi')[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    
    const grid: Record<string, Record<string, { subject: string; teacher: string }>> = {};

    orderedDays.forEach(day => {
      grid[day] = {};
    });

    timetableEntries.forEach(entry => {
      const teacherName = teachers.find(t => t.id === entry.teacherId)?.name || 'N/A';
      const timeSlot = `${entry.startTime} - ${entry.endTime}`;
      if (!grid[entry.day]) grid[entry.day] = {};
      grid[entry.day][timeSlot] = { subject: entry.subject, teacher: teacherName };
    });

    return { timeSlots: generatedTimeSlots, days: orderedDays, timetableGrid: grid };

  }, [timetableEntries, teachers]);


  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (printContent) {
      const printWindow = window.open('', '', 'height=800,width=1200');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Emploi du Temps</title>');
        printWindow.document.write('<link rel="stylesheet" href="/_next/static/css/app/layout.css" type="text/css" media="print">');
        printWindow.document.write(`
            <style>
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .no-print { display: none !important; }
                .printable-card { border: none !important; box-shadow: none !important; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background-color: #f2f2f2; }
            </style>
        `);
        printWindow.document.write('</head><body>');
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
  
  if (timetableEntries.length === 0) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Emploi du Temps indisponible</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">Aucun emploi du temps n'a été configuré pour la classe de cet élève.</p>
              </CardContent>
          </Card>
      )
  }

  return (
    <Card className="printable-card">
      <CardContent className="p-4 sm:p-6">
        <div ref={printRef}>
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">{school.name}</h1>
            <p className="text-muted-foreground">Année scolaire: {new Date().getFullYear() - 1}-{new Date().getFullYear()}</p>
            <h2 className="text-lg font-semibold mt-4">Emploi du Temps - Classe: {student.class}</h2>
          </div>

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
                  <TableCell className="font-semibold border">{slot}</TableCell>
                  {days.map(day => {
                    const entry = timetableGrid[day]?.[slot];
                    return (
                      <TableCell key={day} className="border">
                        {entry ? (
                          <div>
                            <p className="font-bold">{entry.subject}</p>
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
        </div>
        <div className="mt-6 flex justify-end no-print">
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer l'Emploi du Temps
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
