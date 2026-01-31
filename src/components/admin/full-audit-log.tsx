
'use client';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, startAfter, endBefore, limitToLast, DocumentData, QueryDocumentSnapshot, collectionGroup, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '../ui/skeleton';
import { useState, useEffect, useMemo } from 'react';
import { Badge } from '../ui/badge';
import type { UserProfile } from '@/lib/data-types';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type SystemLog = {
    id: string;
    action: string;
    adminId: string;
    details: { name?: string; schoolId?: string };
    ipAddress: string;
    target: string;
    timestamp: string;
}

const LOGS_PER_PAGE = 20;

export const FullAuditLog = () => {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [adminMap, setAdminMap] = useState<Map<string, string>>(new Map());
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);
  const [isFirstPage, setIsFirstPage] = useState(true);

  const baseQuery = useMemo(() => 
    (user?.profile?.isAdmin)
    ? query(collection(firestore, 'system_logs'), orderBy('timestamp', 'desc'))
    : null,
    [firestore, user?.profile?.isAdmin]
  );

  const fetchLogs = async (q: any) => {
      setLoading(true);
      try {
        const documentSnapshots = await getDocs(q);
        const fetchedLogs = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog));
        
        setLogs(fetchedLogs);
        setFirstVisible(documentSnapshots.docs[0] || null);
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);

        // Check if this is the last page
        const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        if (lastDoc && baseQuery) {
            const nextQuery = query(baseQuery, startAfter(lastDoc), limit(1));
            const nextSnap = await getDocs(nextQuery);
            setIsLastPage(nextSnap.empty);
        } else {
             setIsLastPage(true);
        }

      } catch(e) {
          console.error("Error fetching audit logs:", e);
      } finally {
          setLoading(false);
      }
  }

  useEffect(() => {
    if(baseQuery) {
        const firstPageQuery = query(baseQuery, limit(LOGS_PER_PAGE));
        fetchLogs(firstPageQuery);
        setIsFirstPage(true);
    }
  }, [baseQuery]);

  useEffect(() => {
    const fetchAdmins = async () => {
      if (!firestore) return;
      const newAdminMap = new Map<string, string>();
      try {
        const staffQuery = query(collectionGroup(firestore, 'personnel'), where('isAdmin', '==', true));
        const querySnapshot = await getDocs(staffQuery);
        querySnapshot.forEach(doc => {
          const user = doc.data() as UserProfile;
          if (user.isAdmin) {
            newAdminMap.set(user.uid, user.displayName || user.email);
          }
        });
        setAdminMap(newAdminMap);
      } catch (error) {
        console.error("Error fetching admins for audit log:", error);
      }
    };
    fetchAdmins();
  }, [firestore]);
  
  const nextPage = () => {
    if (lastVisible && baseQuery) {
      const nextQuery = query(baseQuery, startAfter(lastVisible), limit(LOGS_PER_PAGE));
      fetchLogs(nextQuery);
      setIsFirstPage(false);
    }
  };
  
  const prevPage = () => {
    if (firstVisible && baseQuery) {
      const prevQuery = query(baseQuery, endBefore(firstVisible), limitToLast(LOGS_PER_PAGE));
      fetchLogs(prevQuery);
      setIsLastPage(false);
    }
  };

  return (
    <div className="pt-0">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Cible</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    [...Array(10)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={4}><Skeleton className="h-4 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : logs.length > 0 ? (
                    logs.map(log => (
                        <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground">
                                {log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yy HH:mm') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs font-medium">{adminMap.get(log.adminId) || log.adminId}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-xs font-mono">{log.action}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{log.details?.name || log.details?.schoolId || log.target}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4}>
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Aucun journal d'audit disponible.
                            </p>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
         <div className="flex items-center justify-end space-x-2 py-4">
            <Button variant="outline" size="sm" onClick={prevPage} disabled={isFirstPage || loading}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
            <Button variant="outline" size="sm" onClick={nextPage} disabled={isLastPage || loading}>
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
        </div>
    </div>
  );
};
