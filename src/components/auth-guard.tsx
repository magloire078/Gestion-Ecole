
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

// --- Panneau de Débogage Temporaire ---
function DebugPanel() {
  const { user } = useUser();
  const { schoolId } = useSchoolData();
  const firestore = useFirestore();
  
  const checkData = async () => {
    if (!user) {
      alert("Utilisateur non connecté.");
      return;
    }
    try {
      // 1. Vérifier le document utilisateur
      const userRef = doc(firestore, 'utilisateurs', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : 'N\'EXISTE PAS';
      
      console.log('--- DEBUG ---');
      console.log('User doc:', userData);
      
      // 2. Chercher les écoles où l'utilisateur est directeur
      const schoolsQuery = query(
        collection(firestore, 'ecoles'),
        where('directorId', '==', user.uid),
        limit(1)
      );
      const schoolsSnapshot = await getDocs(schoolsQuery);
      
      console.log('Écoles trouvées où l\'utilisateur est directeur:', schoolsSnapshot.size);
      
      let schoolDataFromDirectorQuery: any = 'Pas d\'école trouvée';
      if (!schoolsSnapshot.empty) {
        schoolDataFromDirectorQuery = schoolsSnapshot.docs[0].data();
        console.log('Détails de l\'école:', schoolsSnapshot.docs[0].id, schoolDataFromDirectorQuery);
      }
      
      // 3. Afficher le schoolId du hook
      console.log('schoolId actuel via le hook useSchoolData:', schoolId);
      
      alert(`
        Résultats du Debug (voir la console pour plus de détails):
        
        1. Document /utilisateurs/${user.uid} :
           ${JSON.stringify(userData, null, 2)}
           
        2. École où vous êtes directeur :
           ${schoolsSnapshot.size > 0 ? `Oui, école ID: ${schoolsSnapshot.docs[0].id}` : 'Non'}
           
        3. schoolId détecté par l'application :
           ${schoolId || 'null'}
      `);

    } catch (error) {
      console.error("Erreur de débogage:", error);
      alert(`Une erreur est survenue lors du débogage: ${error}`);
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button 
        onClick={checkData}
        className="bg-red-500 text-white p-2 rounded text-sm shadow-lg hover:bg-red-600"
      >
        Debug School
      </button>
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
        // N'a pas d'école - vérifier manuellement en base
        const hasSchool = await checkIfUserHasSchool(user.uid);
        
        if (hasSchool) {
          // L'utilisateur a une école mais elle n'est pas encore détectée
          // Rafraîchir les données pour forcer le hook à se mettre à jour
          router.refresh();
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
  if (userLoading || schoolLoading) {
    return <AuthProtectionLoader />;
  }
  
  // Rendre les enfants
  return (
    <>
      {children}
      <DebugPanel />
    </>
  );
}
