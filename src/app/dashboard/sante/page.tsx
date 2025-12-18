
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolData } from "@/hooks/use-school-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { student as Student } from "@/lib/data-types";


export default function HealthPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const [searchTerm, setSearchTerm] = useState("");

  const studentsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const allStudents: Student[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student)) || [], [studentsData]);

  const students = useMemo(() => {
    return allStudents.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allStudents, searchTerm]);


  const isLoading = schoolLoading || studentsLoading || userLoading;
  
  return (
    <>
      <div className="space-y-6" id="students-page">
        <div className="flex justify-between items-center gap-4 print:hidden">
            <div>
              <h1 className="text-lg font-semibold md:text-2xl">Santé Scolaire</h1>
              <p className="text-muted-foreground">Recherchez un élève pour consulter son dossier médical.</p>
            </div>
        </div>
        <Card>
          <CardHeader>
             <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Chercher un élève par nom ou matricule..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </CardHeader>
          <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-32"/><Skeleton className="h-3 w-24"/></div></div></TableCell>
                        <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-36 ml-auto"/></TableCell>
                      </TableRow>
                    ))
                  ) : students.length > 0 ? (
                    students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={student.photoUrl || ''} alt={`${student.firstName} ${student.lastName}`} />
                                <AvatarFallback>{`${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{student.firstName} {student.lastName}</p>
                                <div className="text-xs text-muted-foreground font-mono">{student.matricule || student.id?.substring(0,8)}</div>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell className="text-right">
                         <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/sante/${student.id}`}>
                                Consulter le dossier
                            </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">Aucun élève trouvé.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
          </CardContent>
      </Card>
      </div>
    </>
  );
}
