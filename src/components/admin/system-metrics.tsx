'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { Users, Building, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getCountFromServer, getDocs, query, collectionGroup } from 'firebase/firestore';
import type { school as School } from '@/lib/data-types';

const TARIFAIRE = {
    Essentiel: 0,
    Pro: 49900,
    Premium: 99900,
};

export const SystemMetrics = () => {
  const firestore = useFirestore();
  const [metrics, setMetrics] = useState({
    totalSchools: 0,
    totalUsers: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const schoolsQuery = collection(firestore, 'ecoles');
        const usersQuery = collectionGroup(firestore, 'personnel');

        const [schoolsSnap, usersSnap] = await Promise.all([
          getDocs(schoolsQuery),
          getCountFromServer(usersQuery),
        ]);

        let totalRevenue = 0;
        schoolsSnap.forEach(doc => {
            const school = doc.data() as School;
            if (school.status !== 'deleted' && school.subscription && school.subscription.status === 'active') {
                const plan = school.subscription.plan as keyof typeof TARIFAIRE;
                if (plan && TARIFAIRE[plan]) {
                    totalRevenue += TARIFAIRE[plan];
                }
            }
        });

        setMetrics({
          totalSchools: schoolsSnap.size,
          totalUsers: usersSnap.data().count,
          revenue: totalRevenue,
        });

      } catch (error) {
        console.error("Failed to fetch system metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [firestore]);


  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  }
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Building className="h-4 w-4" /> Total Écoles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatNumber(metrics.totalSchools)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" /> Total Utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatNumber(metrics.totalUsers)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4" /> Revenus (MRR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatNumber(metrics.revenue)} CFA</p>
           <p className="text-xs text-muted-foreground">Revenu Mensuel Récurrent</p>
        </CardContent>
      </Card>
    </div>
  );
};
