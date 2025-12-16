'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '../ui/skeleton';
import { useMemo } from 'react';

type SystemLog = {
    id: string;
    action: string;
    adminId: string;
    details: { name?: string };
    ipAddress: string;
    target: string;
    timestamp: string;
}

export const AuditLog = ({ limit }: { limit: number }) => {
  const firestore = useFirestore();
  const logsQuery = useMemoFirebase(() => 
    query(collection(firestore, 'system_logs'), orderBy('timestamp', 'desc'), firestoreLimit(limit)),
    [firestore, limit]
  );
  const { data: logsData, loading } = useCollection(logsQuery);

  const logs = useMemo(() => 
    logsData?.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog)) || [],
    [logsData]
  );

  return (
    <Card>
      <CardContent className="pt-0">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Détails</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    [...Array(limit)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        </TableRow>
                    ))
                ) : logs.length > 0 ? (
                    logs.map(log => (
                        <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(log.timestamp), 'dd/MM HH:mm')}
                            </TableCell>
                            <TableCell className="font-medium text-xs">{log.action}</TableCell>
                            <TableCell className="text-xs">{log.details?.name || log.target}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={3}>
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Aucun journal d'audit disponible.
                            </p>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};