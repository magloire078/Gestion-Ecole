
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Users, User, MapPin, BookOpen, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { classe as Classe, staff as Staff } from '@/lib/data-types';

interface ClassCardProps {
  classe: Classe & { id: string };
  teacherName?: string;
}

export function ClassCard({ classe, teacherName }: ClassCardProps) {
  const fillPercentage = classe.maxStudents > 0 ? Math.round((classe.studentCount / classe.maxStudents) * 100) : 0;
  
  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {classe.name}
              <Badge variant="outline" className="ml-2">
                {classe.code}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Année: {classe.academicYear}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/classes/${classe.id}`}>Voir détails</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Modifier</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 flex-1">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{teacherName || 'Non assigné'}</p>
            <p className="text-xs text-muted-foreground">Enseignant principal</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Effectif</span>
            <span className="font-medium">
              {classe.studentCount}/{classe.maxStudents} élèves
            </span>
          </div>
          <Progress value={fillPercentage} className="h-2" />
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{classe.classroom || 'Non défini'}</span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-4">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/dashboard/classes/${classe.id}`}>
            <BookOpen className="mr-2 h-4 w-4" />
            Gérer la classe
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

interface ClassesGridViewProps {
  cycleId: string;
  searchQuery: string;
}

export function ClassesGridView({ cycleId, searchQuery }: ClassesGridViewProps) {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();

  const classesQuery = useMemoFirebase(() => {
    if (!schoolId) return null;
    const baseQuery = collection(firestore, `ecoles/${schoolId}/classes`);
    if (cycleId === 'all') {
      return query(baseQuery);
    }
    return query(baseQuery, where('cycleId', '==', cycleId));
  }, [schoolId, cycleId, firestore]);

  const teachersQuery = useMemoFirebase(() => {
    if (!schoolId) return null;
    return query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'enseignant'));
  }, [schoolId, firestore]);

  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);

  const classes = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Classe & { id: string })) || [], [classesData]);
  const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);

  const teacherMap = useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach(t => map.set(t.id, `${t.firstName} ${t.lastName}`));
    return map;
  }, [teachers]);

  const filteredClasses = useMemo(() => {
    if (!searchQuery) return classes;
    return classes.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [classes, searchQuery]);

  const isLoading = schoolLoading || classesLoading || teachersLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
      </div>
    );
  }
  
  if (filteredClasses.length === 0) {
      return (
          <Card className="flex items-center justify-center h-48">
              <p className="text-muted-foreground">
                  {cycleId === 'all' && !searchQuery ? 'Aucune classe n\'a encore été créée.' : 'Aucune classe trouvée pour les filtres actuels.'}
              </p>
          </Card>
      );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredClasses.map((classe) => (
        <ClassCard 
            key={classe.id} 
            classe={classe} 
            teacherName={classe.mainTeacherId ? teacherMap.get(classe.mainTeacherId) : undefined}
        />
      ))}
    </div>
  );
}
