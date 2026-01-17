'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building, 
  Cpu,
  Globe,
  CreditCard
} from 'lucide-react';
import type { school as School } from '@/lib/data-types';

export function DashboardStatCards() {
  const firestore = useFirestore();
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
    if (!firestore) return;

    const fetchStats = async () => {
        setLoading(true);
        try {
            const schoolsQuery = query(collection(firestore, 'ecoles'), where('status', '!=', 'deleted'));
            const schoolsSnap = await getDocs(schoolsQuery);
            
            let activeSubscriptionCount = 0;
            schoolsSnap.forEach(doc => {
                const school = doc.data() as School;
                if (school.subscription && school.subscription.status === 'active') {
                    activeSubscriptionCount++;
                }
            });

            setStats({
                activeSchools: schoolsSnap.size,
                activeSubscriptions: activeSubscriptionCount,
            });

        } catch (error) {
            console.error("Failed to fetch dashboard stats:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchStats();
  }, [firestore]);

  const StatCard = ({ title, value, icon: Icon, loading, colorClass }: { title: string, value: string | number, icon: React.ElementType, loading: boolean, colorClass?: string }) => (
    <Card className={colorClass?.replace('text-', 'border-')}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
               {loading ? <Skeleton className="h-8 w-20 mt-1" /> : <p className="text-2xl font-bold">{value}</p>}
            </div>
            <Icon className={`h-8 w-8 ${colorClass}`} />
          </div>
        </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        title="Statut système" 
        value={systemHealth.status === 'healthy' ? '✅ Opérationnel' : '⚠️ Dégradé'} 
        icon={Cpu} 
        loading={false}
        colorClass={systemHealth.status === 'healthy' ? 'text-green-500' : 'text-amber-500'}
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
