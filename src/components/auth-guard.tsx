
'use client';

import { useUser, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { collection, doc, getDoc, query, where, getDocs, limit } from 'firebase/firestore';

function AuthProtectionLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-semibold">Chargement de votre espace...</p>
        <p className="text-muted-foreground">Vérification de vos accès.</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  
  // Fonction pour vérifier si l'utilisateur a réellement une école
  async function checkIfUserHasSchool(userId: string): Promise<boolean> {
    try {
      if (!firestore) return false;
      const [userDoc, schoolsQuery] = await Promise.all([
        getDoc(doc(firestore, 'utilisateurs', userId)),
        getDocs(query(collection(firestore, 'ecoles'), where('directorId', '==', userId), limit(1)))
      ]);
      
      return (userDoc.exists() && userDoc.data()?.schoolId) || 
             !schoolsQuery.empty;
    } catch (error) {
      console.error('Error checking school:', error);
      return false;
    }
  }

  useEffect(() => {
    // Attendre que les chargements initiaux soient terminés
    if (userLoading || schoolLoading) {
      return;
    }
    
    const checkAccess = async () => {
      
      const isAuthPage = pathname === '/login';
      const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');
      
      // Utilisateur non connecté
      if (!user) {
        if (!isAuthPage) {
          router.replace('/login');
        } else {
          setIsChecking(false);
        }
        return;
      }
      
      // Utilisateur connecté
      if (schoolId) {
        // A une école - rediriger du login/onboarding vers le dashboard
        if (isAuthPage || isOnboardingPage) {
          router.replace('/dashboard');
        } else {
          setIsChecking(false);
        }
      } else {
        // N'a pas d'école - vérifier s'il en a réellement une
        const hasSchool = await checkIfUserHasSchool(user.uid);
        
        if (hasSchool) {
          // L'utilisateur a une école mais elle n'est pas encore détectée par le hook
          // Rafraîchir les données et rediriger
          router.refresh(); // Force Next.js à recharger les données côté serveur/client
        } else {
          // Vraiment pas d'école - aller à l'onboarding
          if (!isOnboardingPage) {
            router.replace('/dashboard/onboarding');
          } else {
            setIsChecking(false);
          }
        }
      }
    };
    
    checkAccess();
  }, [user, schoolId, userLoading, schoolLoading, pathname, router]);
  
  // Afficher un loader pendant les vérifications
  if (userLoading || schoolLoading || isChecking) {
    return <AuthProtectionLoader />;
  }
  
  // Rendre les enfants
  return <>{children}</>;
}
