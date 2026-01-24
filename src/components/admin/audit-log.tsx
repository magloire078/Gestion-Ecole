
'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, orderBy, limit as firestoreLimit, getDocs, collectionGroup } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '../ui/skeleton';
import { useState, useEffect, useMemo } from 'react';
import { Badge } from '../ui/badge';
import type { UserProfile } from '@/lib/data-types';

type SystemLog = {
    id: string;
    action: string;
    adminId: string;
    details: { name?: string; schoolId?: string };
    ipAddress: string;
    target: string;
    timestamp: string;
}


export const AuditLog = ({ limit }: { limit: number }) => {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [adminMap, setAdminMap] = useState<Map<string, string>>(new Map());
  const [adminsLoading, setAdminsLoading] = useState(true);

  const logsQuery = useMemo(() => 
    (user?.profile?.isAdmin)
    ? query(collection(firestore, 'system_logs'), orderBy('timestamp', 'desc'), firestoreLimit(limit))
    : null,
    [firestore, limit, user?.profile?.isAdmin]
  );
  
  const { data: logsData, loading: logsLoading } = useCollection(logsQuery);

  useEffect(() => {
    const fetchAdmins = async () => {
      if (!firestore) return;
      setAdminsLoading(true);
      const newAdminMap = new Map<string, string>();
      try {
        const personnelQuery = query(collectionGroup(firestore, 'personnel'));
        const querySnapshot = await getDocs(personnelQuery);
        querySnapshot.forEach(doc => {
          const user = doc.data() as UserProfile;
          if (user.isAdmin) {
            newAdminMap.set(user.uid, user.displayName || user.email);
          }
        });
        setAdminMap(newAdminMap);
      } catch (error) {
        console.error("Error fetching admins for audit log:", error);
      } finally {
        setAdminsLoading(false);
      }
    };
    fetchAdmins();
  }, [firestore]);


  const logs = useMemo(() => 
    logsData?.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog)) || [],
    [logsData]
  );

  const loading = logsLoading || adminsLoading;

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
                    [...Array(limit)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        </TableRow>
                    ))
                ) : logs.length > 0 ? (
                    logs.map(log => (
                        <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground">
                                {log.timestamp ? format(new Date(log.timestamp), 'dd/MM HH:mm:ss') : 'Date inconnue'}
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
    </div>
  );
};
