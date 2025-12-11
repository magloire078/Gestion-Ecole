

'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Link2Off } from 'lucide-react';
import type { student as Student, class_type as Class, staff as Staff } from '@/lib/data-types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface StudentWithId extends Student { id: string; }
interface ClassWithId extends Class { id: string; }
interface StaffWithId extends Staff { id: string; }


export default function DataIntegrityPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  const staffQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/personnel`) : null, [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);

  const students: StudentWithId[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as StudentWithId)) || [], [studentsData]);
  const classes: ClassWithId[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as ClassWithId)) || [], [classesData]);
  const staff: StaffWithId[] = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as StaffWithId)) || [], [staffData]);
  
  const classIds = useMemo(() => new Set(classes.map(c => c.id)), [classes]);
  const teacherIds = useMemo(() => new Set(staff.filter(s => s.role === 'Enseignant').map(t => t.id)), [staff]);

  const isLoading = schoolLoading || studentsLoading || classesLoading || staffLoading;

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
                                      <TableCell>
                                        <Link href={`/dashboard/dossiers-eleves/${student.id}`} className="hover:underline text-primary">
                                            {student.firstName} {student.lastName}
                                        </Link>
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">{student.id}</TableCell>
                                      <TableCell className="font-mono text-xs">{student.classId || 'N/A'}</TableCell>
                                      <TableCell>
                                          {student.classId && classIds.has(student.classId) ? (
                                              <Badge variant="secondary" className="text-emerald-600 border-emerald-600/20"><CheckCircle className="mr-2 h-4 w-4" />Valide</Badge>
                                          ) : !student.classId ? (
                                                <Badge variant="outline"><Link2Off className="mr-2 h-4 w-4" />Non assigné</Badge>
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
                                              <Badge variant="outline"><Link2Off className="mr-2 h-4 w-4" />Non assigné</Badge>
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
                      <CardTitle>Personnel ({staff.length})</CardTitle>
                      <CardDescription>Vérification du lien des enseignants à leur classe principale.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Nom du membre</TableHead>
                                  <TableHead>Rôle</TableHead>
                                  <TableHead>ID Classe principale</TableHead>
                                  <TableHead>Statut du lien</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                               {staff.map(member => (
                                  <TableRow key={member.id}>
                                      <TableCell>
                                         <p className="font-medium">{member.firstName} {member.lastName}</p>
                                      </TableCell>
                                      <TableCell>{member.role}</TableCell>
                                      <TableCell className="font-mono text-xs">{member.classId || 'N/A'}</TableCell>
                                      <TableCell>
                                          {member.role !== 'Enseignant' ? (
                                              <Badge variant="outline">Non applicable</Badge>
                                          ) : member.classId && classIds.has(member.classId) ? (
                                             <Badge variant="secondary" className="text-emerald-600 border-emerald-600/20"><CheckCircle className="mr-2 h-4 w-4" />Valide</Badge>
                                          ) : !member.classId ? (
                                              <Badge variant="outline"><Link2Off className="mr-2 h-4 w-4" />Non assigné</Badge>
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
