
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, query, where, getCountFromServer, collectionGroup } from 'firebase/firestore';
import { StatCard } from '@/components/ui/stat-card';
import { Building, Users, CreditCard, DollarSign } from 'lucide-react';
import type { school as School } from '@/lib/data-types';
import { TARIFAIRE } from '@/lib/billing-calculator';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function SystemStats() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [stats, setStats] = useState({
    activeSchools: 0,
    activeSubscriptions: 0,
    totalUsers: 0,
    mrr: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !user?.profile?.isAdmin) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        const schoolsQuery = query(collection(firestore, 'ecoles'), where('status', '==', 'active'));
        const subsQuery = query(collection(firestore, 'ecoles'), where('subscription.status', '==', 'active'));
        const usersQuery = collectionGroup(firestore, 'personnel');

        const [schoolsSnap, subsSnap, usersSnap] = await Promise.all([
          getDocs(schoolsQuery),
          getCountFromServer(subsQuery),
          getCountFromServer(usersQuery),
        ]);

        let totalRevenue = 0;
        schoolsSnap.forEach(doc => {
          const school = doc.data() as School;
          if (school.subscription && school.subscription.status === 'active') {
            const plan = school.subscription.plan as keyof typeof TARIFAIRE;
            if (plan && TARIFAIRE[plan]) {
              totalRevenue += TARIFAIRE[plan].prixMensuel;
            }
          }
        });

        setStats({
          activeSchools: schoolsSnap.size,
          activeSubscriptions: subsSnap.data().count,
          totalUsers: usersSnap.data().count,
          mrr: totalRevenue,
        });

      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [firestore, user?.profile?.isAdmin]);

  const formatCurrency = (num: number) => `${num.toLocaleString('fr-FR')} CFA`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { title: "Écoles Actives", value: stats.activeSchools, icon: Building, color: "text-[#2D9CDB]", bg: "bg-blue-50" },
        { title: "Abonnements", value: stats.activeSubscriptions, icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-50" },
        { title: "Utilisateurs", value: stats.totalUsers, icon: Users, color: "text-orange-500", bg: "bg-orange-50" },
        { title: "MRR Plateforme", value: formatCurrency(stats.mrr), icon: DollarSign, color: "text-purple-500", bg: "bg-purple-50" }
      ].map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white rounded-[32px] p-6 border border-blue-50/50 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm", stat.bg, stat.color)}>
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-[#0C365A] font-outfit tracking-tight">
                {loading ? "..." : stat.value}
              </h3>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
