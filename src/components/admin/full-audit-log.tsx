
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
import { ChevronLeft, ChevronRight, Users, Shield, Zap, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      const name = schoolMap.get(id);
      return name ? `ÉCOLE : ${name}` : `ÉCOLE (ID: ${id.slice(0, 8)}...)`;
    }
    if (target.startsWith('users/')) {
      const id = target.split('/')[1];
      const name = adminMap.get(id);
      return name ? `UTILISATEUR : ${name}` : `UTILISATEUR (ID: ${id.slice(0, 8)}...)`;
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
    <div className="pt-0 flex flex-col gap-6">
      <div className="bg-white rounded-[32px] border border-blue-50/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Heure</TableHead>
              <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Opérateur</TableHead>
              <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nature Action</TableHead>
              <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cible / Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {(loading || dataLoading) ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`} className="border-blue-50/30">
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-48" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length > 0 ? (
                logs.map((log, idx) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (idx % LOGS_PER_PAGE) * 0.03 }}
                    className="group hover:bg-blue-50/20 border-blue-50/30 transition-colors cursor-default"
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-[#0C365A] font-outfit uppercase tracking-tighter">
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
                        <span className="text-[10px] text-slate-400 font-bold">
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
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-white/5 flex items-center justify-center border border-blue-100/50 dark:border-white/10 group-hover:bg-[hsl(var(--admin-primary-dark))] group-hover:text-white transition-all">
                          <Shield className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-[hsl(var(--admin-primary-dark))] transition-colors">
                          {adminMap.get(log.adminId) || `Admin (ID: ${log.adminId.slice(0, 8)}...)`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-lg border-2 uppercase tracking-widest",
                          log.action.includes('delete') ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30" :
                            log.action.includes('create') ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30" :
                              "bg-blue-50 text-[hsl(var(--admin-primary))] border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30"
                        )}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-[hsl(var(--admin-primary-dark))] transition-colors line-clamp-1">
                          {log.details?.name || formatTarget(log.target)}
                        </span>
                        {(log.details?.schoolId || log.target.startsWith('ecoles/')) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-60 cursor-help flex items-center gap-1 group-hover:opacity-100">
                                  <Info className="h-2 w-2" />
                                  Réf. {(log.details?.schoolId || log.target.split('/')[1]).slice(0, 8)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#0C365A] text-white border-blue-900/20">
                                <p className="text-[10px] font-bold">ID Complet: {log.details?.schoolId || log.target.split('/')[1]}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                    Aucun journal d'audit disponible.
                  </TableCell>
                </TableRow>
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2 py-2">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black opacity-60">
          Page {isFirstPage ? '1' : 'Suivante'}
        </p>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={isFirstPage || loading}
            className="h-9 px-4 rounded-xl border-blue-100 bg-white text-[#0C365A] font-bold shadow-sm hover:bg-blue-50 disabled:opacity-40 transition-all"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={isLastPage || loading}
            className="h-9 px-4 rounded-xl border-blue-100 bg-white text-[#0C365A] font-bold shadow-sm hover:bg-blue-50 disabled:opacity-40 transition-all"
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
