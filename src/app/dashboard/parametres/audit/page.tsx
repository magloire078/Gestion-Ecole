'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSchoolData } from '@/hooks/use-school-data';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShieldAlert, User, Clock } from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    details: string;
    userId: string;
    userName: string;
    userRole: string;
    timestamp: any;
    targetId?: string;
    targetType?: string;
}

export default function AuditPage() {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();

    const auditQuery = useMemo(() =>
        schoolId ? query(collection(firestore, `ecoles/${schoolId}/audit_logs`), orderBy('timestamp', 'desc'), limit(50)) : null,
        [firestore, schoolId]
    );

    const { data: logsData, loading: logsLoading } = useCollection(auditQuery);

    const logs: AuditLog[] = useMemo(() =>
        logsData?.map(d => ({ id: d.id, ...d.data() } as AuditLog)) || [],
        [logsData]
    );

    const isLoading = schoolLoading || logsLoading;

    return (
        <div className="space-y-6">
            <CardHeader className="px-0">
                <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-primary" />
                    Journal d'Audit et Sécurité
                </CardTitle>
                <CardDescription>
                    Piste d'audit des actions critiques effectuées dans votre établissement (connexions, modifications sensibles, etc.).
                    Les 50 dernières actions sont affichées.
                </CardDescription>
            </CardHeader>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        {logs.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                Aucune activité enregistrée récemment.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date & Heure</TableHead>
                                        <TableHead>Utilisateur</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Détails</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-xs whitespace-nowrap">
                                                {log.timestamp?.seconds ? format(new Date(log.timestamp.seconds * 1000), "d MMM yyyy, HH:mm", { locale: fr }) : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{log.userName || 'Système'}</span>
                                                    <span className="text-xs text-muted-foreground">{log.userRole}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{log.action}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-md truncate" title={log.details}>
                                                {log.details}
                                                {log.targetType && <span className="text-xs ml-2 text-muted-foreground">({log.targetType})</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
