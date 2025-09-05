import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { mockTimetableData, mockTeacherData, mockClassData } from "@/lib/data";

export default function TimetablePage() {
  const getTimetableDetails = () => {
    return mockTimetableData.map(entry => {
      const classInfo = mockClassData.find(c => c.id === entry.classId);
      const teacherInfo = mockTeacherData.find(t => t.id === entry.teacherId);
      return {
        ...entry,
        className: classInfo?.name || 'N/A',
        teacherName: teacherInfo?.name || 'N/A',
      };
    });
  };

  const timetableDetails = getTimetableDetails();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Emploi du Temps</h1>
        <p className="text-muted-foreground">Consultez les attributions des enseignants par classe et par matière.</p>
      </div>
      <Card>
        <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classe</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Enseignant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timetableDetails.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.className}</TableCell>
                    <TableCell>{entry.subject}</TableCell>
                    <TableCell>{entry.teacherName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
