'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building, 
  Bed, 
  Users, 
  UserCheck,
  UserX,
  PlusCircle,
  Pencil,
  Bell
} from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, addDoc, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import type { building, occupant, log, student as Student, room as Room } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '../../firebase/error-emitter';
import { LogForm } from './log-form';

interface LogWithDetails extends log {
    id: string;
    studentName?: string;
}

export function InternatDashboard({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageInternat;
  
  const [refreshLogs, setRefreshLogs] = useState(0);

  // State for date range
  const [todayStart, setTodayStart] = useState('');
  const [todayEnd, setTodayEnd] = useState('');

  useEffect(() => {
    // This effect runs only on the client, after hydration
    const now = new Date();
    setTodayStart(format(now, 'yyyy-MM-dd') + 'T00:00:00');
    setTodayEnd(format(now, 'yyyy-MM-dd') + 'T23:59:59');
  }, []);

  const buildingsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/internat_batiments`)), [firestore, schoolId]);
  const occupantsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/internat_occupants`), where('status', '==', 'active')), [firestore, schoolId]);
  const studentsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves`)), [firestore, schoolId]);
  const roomsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/internat_chambres`)), [firestore, schoolId]);

  const todayLogsQuery = useMemo(() => {
    // Don't run query until date range is set on the client
    if (!todayStart || !todayEnd) return null; 
    return query(
        collection(firestore, `ecoles/${schoolId}/internat_entrees_sorties`), 
        where('timestamp', '>=', todayStart),
        where('timestamp', '<=', todayEnd),
        orderBy('timestamp', 'desc'),
        limit(5)
    );
  }, [firestore, schoolId, todayStart, todayEnd, refreshLogs]);


  const { data: buildingsData } = useCollection(buildingsQuery);
  const { data: occupantsData } = useCollection(occupantsQuery);
  const { data: studentsData } = useCollection(studentsQuery);
  const { data: roomsData } = useCollection(roomsQuery);
  const { data: logsData } = useCollection(todayLogsQuery);
  
  const buildings = useMemo(() => buildingsData?.map(doc => ({ id: doc.id, ...doc.data() } as building & {id: string})) || [], [buildingsData]);
  const students = useMemo(() => studentsData?.map(doc => ({ id: doc.id, ...doc.data() } as Student & {id: string})) || [], [studentsData]);
  const rooms = useMemo(() => roomsData?.map(doc => ({ id: doc.id, ...doc.data() } as Room & {id: string})) || [], [roomsData]);
  const studentsMap = useMemo(() => new Map(students.map(s => [s.id, `${s.firstName} ${s.lastName}`])), [students]);
  
  const occupants = useMemo(() => {
    if (!occupantsData || !studentsMap.size || !rooms.length) return [];
    const roomsMap = new Map(rooms.map(r => [r.id, r.number]));

    return occupantsData.map(doc => {
        const occupantData = { id: doc.id, ...doc.data() } as occupant & { id: string };
        return {
            ...occupantData,
            studentName: studentsMap.get(occupantData.studentId) || 'Élève inconnu',
            roomNumber: roomsMap.get(occupantData.roomId) || 'Chambre inconnue',
        }
    })
  }, [occupantsData, studentsMap, rooms]);

  const todayLogs: LogWithDetails[] = useMemo(() => 
    logsData?.map(doc => ({
        id: doc.id,
        ...doc.data(),
        studentName: studentsMap.get(doc.data().studentId) || 'Élève inconnu',
    } as LogWithDetails)).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [],
  [logsData, studentsMap]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Bâtiments</CardTitle><Building className="h-4 w-4 text-muted-foreground" /></div></CardHeader>
          <CardContent><div className="text-2xl font-bold">{buildings.length}</div><div className="text-xs text-muted-foreground mt-1">{buildings.filter(b => b.status === 'active').length} actifs</div></CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Chambres occupées</CardTitle><Bed className="h-4 w-4 text-muted-foreground" /></div></CardHeader>
          <CardContent><div className="text-2xl font-bold">{occupants.length}/{rooms.length}</div><div className="text-xs text-muted-foreground mt-1">{rooms.length > 0 ? Math.round((occupants.length / rooms.length) * 100) : 0}% d'occupation</div></CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Internes présents</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></div></CardHeader>
          <CardContent><div className="text-2xl font-bold">{occupants.length - todayLogs.filter(l => l.type === 'sortie' && l.status !== 'returned').length}</div><div className="text-xs text-muted-foreground mt-1">{todayLogs.filter(l => l.type === 'sortie' && l.status !== 'returned').length} absents</div></CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Couvre-feu</CardTitle><Bell className="h-4 w-4 text-muted-foreground" /></div></CardHeader>
          <CardContent><div className="text-2xl font-bold">22:00</div><div className="text-xs text-muted-foreground mt-1">{new Date().getDay() >= 5 ? 'Week-end' : 'Semaine'}</div></CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader><CardTitle>Mouvements du jour</CardTitle><CardDescription>{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayLogs.map(log => (
              <div key={log.id} className="flex items-center p-3 border rounded-lg">
                <div className={`p-2 rounded-full mr-3 ${log.type === 'sortie' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {log.type === 'sortie' ? (<UserX className="h-5 w-5" />) : (<UserCheck className="h-5 w-5" />)}
                </div>
                <div className="flex-1"><div className="font-medium">{log.studentName}</div><div className="text-sm text-muted-foreground">{log.reason} • {format(new Date(log.timestamp), 'HH:mm')}</div></div>
                <div className="text-right"><Badge variant={log.status === 'returned' ? 'secondary' : log.status === 'late' ? 'destructive' : 'outline'}>{log.status === 'returned' ? 'Rentré' : log.status === 'late' ? 'En retard' : 'En cours'}</Badge>{log.status !== 'returned' && <div className="text-xs text-muted-foreground mt-1">Autorisé par: {log.authorizedBy}</div>}</div>
              </div>
            ))}
            {todayLogs.length === 0 && <p className="text-muted-foreground text-center py-4">Aucun mouvement enregistré aujourd'hui.</p>}
          </div>
          {canManageContent && (
            <LogForm schoolId={schoolId} occupants={occupants} onSave={() => setRefreshLogs(prev => prev + 1)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
