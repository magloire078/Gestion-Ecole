'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
import { StatCard } from '@/components/ui/stat-card';
import { 
  Building, 
  Cpu,
  Globe,
  CreditCard
} from 'lucide-react';
import type { school as School } from '@/lib/data-types';

export function DashboardStatCards() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [stats, setStats] = useState({
    activeSchools: 0,
    activeSubscriptions: 0
  });
  const [loading, setLoading] = useState(true);
  
  // These values are currently static but could be dynamic in the future
  const [systemHealth, setSystemHealth] = useState({
    status: 'healthy',
    uptime: 99.9,
  });
  
  useEffect(() => {
    if (!firestore || !user?.profile?.isAdmin) {
        setLoading(false);
        return;
    }

    const fetchStats = async () => {
        setLoading(true);
        try {
            const schoolsQuery = query(collection(firestore, 'ecoles'), where('status', '!=', 'deleted'));
            const subsQuery = query(collection(firestore, 'ecoles'), where('subscription.status', '==', 'active'));

            const [schoolsSnap, subsSnap] = await Promise.all([
              getCountFromServer(schoolsQuery),
              getCountFromServer(subsQuery)
            ]);

            setStats({
                activeSchools: schoolsSnap.data().count,
                activeSubscriptions: subsSnap.data().count,
            });

        } catch (error) {
            console.error("Failed to fetch dashboard stats:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchStats();
  }, [firestore, user?.profile?.isAdmin]);


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        title="Statut système" 
        value={systemHealth.status === 'healthy' ? '✅ Opérationnel' : '⚠️ Dégradé'} 
        icon={Cpu} 
        loading={false}
        colorClass="text-green-500"
      />
      <StatCard 
        title="Uptime (30j)" 
        value={`${systemHealth.uptime}%`}
        icon={Globe} 
        loading={false}
        colorClass="text-blue-500"
      />
      <StatCard 
        title="Écoles actives" 
        value={stats.activeSchools} 
        icon={Building} 
        loading={loading}
        colorClass="text-purple-500"
      />
      <StatCard 
        title="Abonnements Actifs" 
        value={stats.activeSubscriptions} 
        icon={CreditCard} 
        loading={loading}
        colorClass="text-green-500"
      />
    </div>
  );
}
