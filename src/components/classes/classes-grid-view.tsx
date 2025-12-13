'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  User, 
  Calendar, 
  MapPin, 
  BookOpen,
  MoreVertical,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClassCardProps {
  classe: {
    id: string;
    name: string;
    code: string;
    niveau: string;
    cycle: string;
    teacher: string;
    studentCount: number;
    maxStudents: number;
    classroom: string;
    status: 'active' | 'inactive' | 'full';
    color: string;
  };
}

export function ClassCard({ classe }: ClassCardProps) {
  const fillPercentage = Math.round((classe.studentCount / classe.maxStudents) * 100);
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: classe.color }}
              />
              {classe.name}
              <Badge variant="outline" className="ml-2">
                {classe.code}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              {classe.cycle} • {classe.niveau}
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
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/classes/${classe.id}/editer`}>Modifier</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/classes/${classe.id}/eleves`}>Gérer élèves</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/classes/${classe.id}/emploi-du-temps`}>Emploi du temps</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Enseignant */}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{classe.teacher}</p>
            <p className="text-xs text-muted-foreground">Enseignant principal</p>
          </div>
        </div>
        
        {/* Effectifs */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Effectif</span>
            <span className="font-medium">
              {classe.studentCount}/{classe.maxStudents} élèves
            </span>
          </div>
          <Progress value={fillPercentage} className="h-2" />
          <div className="flex justify-between text-xs">
            <span className={fillPercentage >= 90 ? "text-amber-600" : "text-muted-foreground"}>
              {fillPercentage >= 90 ? 'Classe presque pleine' : 'Places disponibles'}
            </span>
            <span className={fillPercentage >= 90 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
              {fillPercentage}%
            </span>
          </div>
        </div>
        
        {/* Infos rapides */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{classe.classroom}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>8h-16h30</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/dashboard/classes/${classe.id}`}>
            <BookOpen className="mr-2 h-4 w-4" />
            Voir la classe
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function ClassesGridView({ cycle }: { cycle: string }) {
  // Données simulées
  const classes = [
    {
      id: '1',
      name: 'CE1-A',
      code: 'CE1A',
      niveau: 'CE1',
      cycle: 'Primaire',
      teacher: 'M. Dupont',
      studentCount: 24,
      maxStudents: 28,
      classroom: 'Salle 101 - Bât A',
      status: 'active',
      color: '#3b82f6',
    },
    {
      id: '2',
      name: 'CE1-B',
      code: 'CE1B',
      niveau: 'CE1',
      cycle: 'Primaire',
      teacher: 'Mme. Martin',
      studentCount: 26,
      maxStudents: 28,
      classroom: 'Salle 102 - Bât A',
      status: 'active',
      color: '#10b981',
    },
    {
      id: '3',
      name: 'CE1-C',
      code: 'CE1C',
      niveau: 'CE1',
      cycle: 'Primaire',
      teacher: 'M. Laurent',
      studentCount: 28,
      maxStudents: 28,
      classroom: 'Salle 103 - Bât A',
      status: 'full',
      color: '#8b5cf6',
    },
    {
      id: '4',
      name: 'CE2-A',
      code: 'CE2A',
      niveau: 'CE2',
      cycle: 'Primaire',
      teacher: 'Mme. Dubois',
      studentCount: 22,
      maxStudents: 28,
      classroom: 'Salle 201 - Bât A',
      status: 'active',
      color: '#f59e0b',
    },
    {
      id: '5',
      name: '6ème A',
      code: '6EMEA',
      niveau: '6ème',
      cycle: 'Collège',
      teacher: 'M. Simon',
      studentCount: 30,
      maxStudents: 32,
      classroom: 'Salle 301 - Bât B',
      status: 'active',
      color: '#ef4444',
    },
    {
      id: '6',
      name: '6ème B',
      code: '6EMEB',
      niveau: '6ème',
      cycle: 'Collège',
      teacher: 'Mme. Leroy',
      studentCount: 31,
      maxStudents: 32,
      classroom: 'Salle 302 - Bât B',
      status: 'active',
      color: '#ec4899',
    },
  ];

  const filteredClasses = cycle === 'all' 
    ? classes 
    : classes.filter(c => c.cycle.toLowerCase() === cycle);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredClasses.map((classe) => (
        <ClassCard key={classe.id} classe={classe} />
      ))}
    </div>
  );
}
