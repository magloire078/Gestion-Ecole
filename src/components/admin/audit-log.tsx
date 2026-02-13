
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
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Zap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type SystemLog = {
  id: string;
  action: string;
  adminId: string;
  details: { name?: string; schoolId?: string };
  ipAddress: string;
  target: string;
  timestamp: any;
}


export const AuditLog = ({ limit }: { limit: number }) => {
  const firestore = useFirestore();
  const { user } = useUser();

  const [adminMap, setAdminMap] = useState<Map<string, string>>(new Map());
  const [schoolMap, setSchoolMap] = useState<Map<string, string>>(new Map());
  const [dataLoading, setDataLoading] = useState(true);

  const logsQuery = useMemo(() =>
    (user?.profile?.isAdmin)
      ? query(collection(firestore, 'system_logs'), orderBy('timestamp', 'desc'), firestoreLimit(limit))
      : null,
    [firestore, limit, user?.profile?.isAdmin]
  );

  const { data: logsData, loading: logsLoading } = useCollection(logsQuery);

  useEffect(() => {
    const fetchData = async () => {
      if (!firestore) return;
      setDataLoading(true);
      const newAdminMap = new Map<string, string>();
      const newSchoolMap = new Map<string, string>();

      try {
        // 1. Fetch schools for name resolution
        const schoolsSnap = await getDocs(collection(firestore, 'ecoles'));
        schoolsSnap.forEach(doc => {
          newSchoolMap.set(doc.id, doc.data().name || doc.id);
        });
        setSchoolMap(newSchoolMap);

        // 2. Fetch admins from personnel (collectionGroup)
        const personnelQuery = query(collectionGroup(firestore, 'personnel'));
        const pSnapshot = await getDocs(personnelQuery);
        pSnapshot.forEach(doc => {
          const u = doc.data() as UserProfile;
          if (u.isAdmin) {
            newAdminMap.set(u.uid, u.displayName || u.email);
          }
        });

        // 3. Fetch from global users collection (for super-admins)
        const usersSnap = await getDocs(collection(firestore, 'users'));
        usersSnap.forEach(doc => {
          const d = doc.data();
          if (d.displayName || d.email) {
            newAdminMap.set(doc.id, d.displayName || d.email);
          }
        });

        setAdminMap(newAdminMap);
      } catch (error) {
        console.error("Error fetching reference data for audit log:", error);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [firestore]);

  const formatTarget = (target: string) => {
    if (!target) return 'N/A';
    if (target.startsWith('ecoles/')) {
      const id = target.split('/')[1];
      return `ÉCOLE : ${schoolMap.get(id) || id}`;
    }
    if (target.startsWith('users/')) {
      const id = target.split('/')[1];
      return `UTILISATEUR : ${adminMap.get(id) || id}`;
    }
    return target;
  };

  const logs = useMemo(() =>
    logsData?.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog)) || [],
    [logsData]
  );

  const loading = logsLoading || dataLoading;

  return (
    <div className="pt-0 overflow-hidden rounded-xl border border-white/5 bg-black/20 backdrop-blur-sm">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="hover:bg-transparent border-white/10">
            <TableHead className="text-blue-300 font-semibold uppercase text-[10px] tracking-wider">Date</TableHead>
            <TableHead className="text-blue-300 font-semibold uppercase text-[10px] tracking-wider">Administrateur</TableHead>
            <TableHead className="text-blue-300 font-semibold uppercase text-[10px] tracking-wider">Action</TableHead>
            <TableHead className="text-blue-300 font-semibold uppercase text-[10px] tracking-wider">Cible / Détails</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {loading ? (
              [...Array(limit)].map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="border-white/5">
                  <TableCell><Skeleton className="h-4 w-24 bg-white/5" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32 bg-white/5" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28 bg-white/5" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48 bg-white/5" /></TableCell>
                </TableRow>
              ))
            ) : logs.length > 0 ? (
              logs.map((log, idx) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group hover:bg-white/5 border-white/5 transition-colors cursor-default"
                >
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-white/90">
                        {log.timestamp ? (
                          (() => {
                            try {
                              const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                              return format(date, 'dd MMM yyyy', { locale: fr });
                            } catch (e) {
                              return 'Date invalide';
                            }
                          })()
                        ) : 'Date inconnue'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {log.timestamp ? (
                          (() => {
                            try {
                              const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                              return format(date, 'HH:mm:ss');
                            } catch (e) {
                              return '--:--';
                            }
                          })()
                        ) : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-white/10 group-hover:border-blue-500/30 transition-colors">
                        <Users className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <span className="text-xs font-medium text-white/80 group-hover:text-white transition-colors">
                        {adminMap.get(log.adminId) || log.adminId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-mono px-2 py-0 border-white/10 uppercase tracking-tighter",
                        log.action.includes('delete') ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          log.action.includes('create') ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      )}
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-white/70 line-clamp-1">
                        {log.details?.name || formatTarget(log.target)}
                      </span>
                      {log.details?.schoolId && (
                        <span className="text-[9px] text-muted-foreground font-mono opacity-50">ID: {log.details.schoolId}</span>
                      )}
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>
                  <p className="text-sm text-muted-foreground text-center py-8 italic opacity-50">
                    Aucun journal d'audit disponible.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
};
