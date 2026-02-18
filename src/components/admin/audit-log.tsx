
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


export const AuditLog = ({ limit }: { limit: number }) => {
  const firestore = useFirestore();
  const { user } = useUser();

  const [adminMap, setAdminMap] = useState<Map<string, string>>(new Map());
  const [schoolMap, setSchoolMap] = useState<Map<string, string>>(new Map());
  const [dataLoading, setDataLoading] = useState(true);

  const logsQuery = useMemo(() =>
    (user?.profile?.isSuperAdmin)
      ? query(collection(firestore, 'system_logs'), orderBy('timestamp', 'desc'), firestoreLimit(limit))
      : null,
    [firestore, limit, user?.profile?.isSuperAdmin]
  );

  const { data: logsData, loading: logsLoading } = useCollection(logsQuery);

  useEffect(() => {
    const fetchData = async () => {
      if (!firestore || !user?.profile?.isSuperAdmin) return;
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

  const logs = useMemo(() =>
    logsData?.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog)) || [],
    [logsData]
  );

  const loading = logsLoading || dataLoading;

  return (
    <div className="bg-white rounded-[32px] border border-blue-50/50 shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Instants</TableHead>
            <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Opérateur</TableHead>
            <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nature Action</TableHead>
            <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cible & Détails</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {loading ? (
              [...Array(limit)].map((_, i) => (
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
                  transition={{ delay: idx * 0.05 }}
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
                  Aucun journal d'audit détecté.
                </TableCell>
              </TableRow>
            )}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
};
