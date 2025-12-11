
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle } from 'lucide-react';
import type { student as Student, class_type as Class, teacher as Teacher } from '@/lib/data-types';
import { Badge } from '@/components/ui/badge';

interface StudentWithId extends Student { id: string; }
interface ClassWithId extends Class { id: string; }
interface TeacherWithId extends Teacher { id: string; }


export default function DataIntegrityPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/enseignants`) : null, [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);

  const students: StudentWithId[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as StudentWithId)) || [], [studentsData]);
  const classes: ClassWithId[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as ClassWithId)) || [], [classesData]);
  const teachers: TeacherWithId[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as TeacherWithId)) || [], [teachersData]);
  
  const classIds = useMemo(() => new Set(classes.map(c => c.id)), [classes]);
  const teacherIds = useMemo(() => new Set(teachers.map(t => t.id)), [teachers]);

  const isLoading = schoolLoading || studentsLoading || classesLoading || teachersLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Vérification des Données Brutes</h1>
        <p className="text-muted-foreground">
          Cette page affiche les liens entre vos données pour aider au diagnostic d'éventuelles incohérences.
        </p>
      </div>

      {isLoading ? (
          <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
          </div>
      ) : (
          <div className="space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Élèves ({students.length})</CardTitle>
                      <CardDescription>Vérification du lien de chaque élève à sa classe.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Nom de l'élève</TableHead>
                                  <TableHead>ID Élève</TableHead>
                                  <TableHead>ID Classe assignée</TableHead>
                                  <TableHead>Statut du lien</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {students.map(student => (
                                  <TableRow key={student.id}>
                                      <TableCell>{student.firstName} {student.lastName}</TableCell>
                                      <TableCell className="font-mono text-xs">{student.id}</TableCell>
                                      <TableCell className="font-mono text-xs">{student.classId || 'N/A'}</TableCell>
                                      <TableCell>
                                          {student.classId && classIds.has(student.classId) ? (
                                              <Badge variant="secondary" className="text-emerald-600 border-emerald-600/20"><CheckCircle className="mr-2 h-4 w-4" />Valide</Badge>
                                          ) : (
                                              <Badge variant="destructive"><AlertCircle className="mr-2 h-4 w-4" />Lien Cassé</Badge>
                                          )}
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Classes ({classes.length})</CardTitle>
                      <CardDescription>Vérification du lien de chaque classe à son professeur principal.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Nom de la classe</TableHead>
                                  <TableHead>ID Classe</TableHead>
                                  <TableHead>ID Prof. Principal</TableHead>
                                  <TableHead>Statut du lien</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                               {classes.map(cls => (
                                  <TableRow key={cls.id}>
                                      <TableCell>{cls.name}</TableCell>
                                      <TableCell className="font-mono text-xs">{cls.id}</TableCell>
                                      <TableCell className="font-mono text-xs">{cls.mainTeacherId || 'N/A'}</TableCell>
                                      <TableCell>
                                          {cls.mainTeacherId && teacherIds.has(cls.mainTeacherId) ? (
                                             <Badge variant="secondary" className="text-emerald-600 border-emerald-600/20"><CheckCircle className="mr-2 h-4 w-4" />Valide</Badge>
                                          ) : !cls.mainTeacherId ? (
                                              <Badge variant="outline">Non assigné</Badge>
                                          ) : (
                                              <Badge variant="destructive"><AlertCircle className="mr-2 h-4 w-4" />Lien Cassé</Badge>
                                          )}
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>
              
               <Card>
                  <CardHeader>
                      <CardTitle>Enseignants ({teachers.length})</CardTitle>
                      <CardDescription>Vérification du lien de chaque enseignant à sa classe principale.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Nom de l'enseignant</TableHead>
                                  <TableHead>ID Enseignant</TableHead>
                                  <TableHead>ID Classe principale</TableHead>
                                  <TableHead>Statut du lien</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                               {teachers.map(teacher => (
                                  <TableRow key={teacher.id}>
                                      <TableCell>{teacher.firstName} {teacher.lastName}</TableCell>
                                      <TableCell className="font-mono text-xs">{teacher.id}</TableCell>
                                      <TableCell className="font-mono text-xs">{teacher.classId || 'N/A'}</TableCell>
                                      <TableCell>
                                          {teacher.classId && classIds.has(teacher.classId) ? (
                                             <Badge variant="secondary" className="text-emerald-600 border-emerald-600/20"><CheckCircle className="mr-2 h-4 w-4" />Valide</Badge>
                                          ) : !teacher.classId ? (
                                              <Badge variant="outline">Non assigné</Badge>
                                          ) : (
                                              <Badge variant="destructive"><AlertCircle className="mr-2 h-4 w-4" />Lien Cassé</Badge>
                                          )}
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>
          </div>
      )}
    </div>
  );
}
