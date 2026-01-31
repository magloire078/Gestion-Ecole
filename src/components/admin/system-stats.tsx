
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, query, where, getCountFromServer, collectionGroup } from 'firebase/firestore';
import { StatCard } from '@/components/ui/stat-card';
import { Building, Users, CreditCard, DollarSign } from 'lucide-react';
import type { school as School } from '@/lib/data-types';
import { TARIFAIRE } from '@/lib/billing-calculator';

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatCard title="Écoles Actives" value={stats.activeSchools} icon={Building} loading={loading} />
      <StatCard title="Abonnements Actifs" value={stats.activeSubscriptions} icon={CreditCard} loading={loading} />
      <StatCard title="Total Utilisateurs" value={stats.totalUsers} icon={Users} loading={loading} />
      <StatCard title="Revenus Mensuels (MRR)" value={formatCurrency(stats.mrr)} icon={DollarSign} loading={loading} />
    </div>
  );
}
