
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
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

const LOGS_PER_PAGE = 20;

export const FullAuditLog = () => {
  const firestore = useFirestore();
  const { user } = useUser();

  const [adminMap, setAdminMap] = useState<Map<string, string>>(new Map());
  const [schoolMap, setSchoolMap] = useState<Map<string, string>>(new Map());
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
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
      const fetchedLogs = documentSnapshots.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as SystemLog));

      setLogs(fetchedLogs);
      setFirstVisible(documentSnapshots.docs[0] as QueryDocumentSnapshot<DocumentData, DocumentData> || null);
      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] as QueryDocumentSnapshot<DocumentData, DocumentData> || null);

      // Check if this is the last page
      const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      if (lastDoc && baseQuery) {
        const nextQuery = query(baseQuery, startAfter(lastDoc), limit(1));
        const nextSnap = await getDocs(nextQuery);
        setIsLastPage(nextSnap.empty);
      } else {
        setIsLastPage(true);
      }

    } catch (e) {
      console.error("Error fetching audit logs:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (baseQuery) {
      const firstPageQuery = query(baseQuery, limit(LOGS_PER_PAGE));
      fetchLogs(firstPageQuery);
      setIsFirstPage(true);
    }
  }, [baseQuery]);

  useEffect(() => {
    const fetchData = async () => {
      if (!firestore) return;
      setDataLoading(true);
      const newAdminMap = new Map<string, string>();
      const newSchoolMap = new Map<string, string>();
      try {
        // 1. Fetch schools
        const schoolsSnap = await getDocs(collection(firestore, 'ecoles'));
        schoolsSnap.forEach(doc => {
          newSchoolMap.set(doc.id, doc.data().name || doc.id);
        });
        setSchoolMap(newSchoolMap);

        // 2. Fetch admins from personnel
        const staffQuery = query(collectionGroup(firestore, 'personnel'), where('isAdmin', '==', true));
        const querySnapshot = await getDocs(staffQuery);
        querySnapshot.forEach(doc => {
          const u = doc.data() as UserProfile;
          newAdminMap.set(u.uid, u.displayName || u.email);
        });

        // 3. Fetch from global users (for super-admins)
        const usersSnap = await getDocs(collection(firestore, 'users'));
        usersSnap.forEach(doc => {
          const d = doc.data();
          if (d.displayName || d.email) {
            newAdminMap.set(doc.id, d.displayName || d.email);
          }
        });

        setAdminMap(newAdminMap);
      } catch (error) {
        console.error("Error fetching reference data for FullAuditLog:", error);
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
    <div className="pt-0 flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-white/5 bg-black/20 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent border-white/10">
              <TableHead className="text-blue-300 font-semibold uppercase text-[10px] tracking-wider">Date & Heure</TableHead>
              <TableHead className="text-blue-300 font-semibold uppercase text-[10px] tracking-wider">Administrateur</TableHead>
              <TableHead className="text-blue-300 font-semibold uppercase text-[10px] tracking-wider">Action</TableHead>
              <TableHead className="text-blue-300 font-semibold uppercase text-[10px] tracking-wider">Cible / Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {(loading || dataLoading) ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`} className="border-white/5">
                    <TableCell colSpan={4}><Skeleton className="h-10 w-full bg-white/5" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length > 0 ? (
                logs.map((log, idx) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (idx % LOGS_PER_PAGE) * 0.03 }}
                    className="group hover:bg-white/5 border-white/5 transition-colors cursor-default"
                  >
                    <TableCell className="py-3">
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
                        <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center border border-white/5">
                          <Users className="h-3.5 w-3.5 text-blue-400/70" />
                        </div>
                        <span className="text-xs text-white/80">
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
                    <p className="text-sm text-muted-foreground text-center py-12 italic opacity-50">
                      Aucun journal d'audit disponible.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2 py-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold opacity-50">
          Page {isFirstPage ? '1' : 'Suivante'}
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevPage}
            disabled={isFirstPage || loading}
            className="h-8 border border-white/5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-20"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextPage}
            disabled={isLastPage || loading}
            className="h-8 border border-white/5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-20"
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
