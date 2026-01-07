
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

function AuthProtectionLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <p className="text-lg font-semibold">Chargement de votre session...</p>
        <p className="text-muted-foreground">Veuillez patienter.</p>
      </div>
    </div>
  );
}

// État pour la session parent, géré côté client uniquement
interface ParentSession {
    uid: string;
    schoolId: string;
    parentStudentIds: string[];
    isParent: true;
    displayName: string;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user: firebaseUser, loading: firebaseUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  
  const [parentSession, setParentSession] = useState<ParentSession | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Étape 1: Déterminer si nous sommes sur le client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Étape 2: Vérifier la session parent UNIQUEMENT sur le client
  useEffect(() => {
    if (isClient) {
        try {
            const sessionId = localStorage.getItem('parent_session_id');
            const sessionSchoolId = localStorage.getItem('parent_school_id');
            const studentIdsStr = localStorage.getItem('parent_student_ids');

            if (sessionId && sessionSchoolId && studentIdsStr) {
                setParentSession({
                    uid: sessionId,
                    schoolId: sessionSchoolId,
                    isParent: true,
                    parentStudentIds: JSON.parse(studentIdsStr),
                    displayName: 'Parent / Tuteur',
                });
            }
        } catch (e) {
          console.error("Failed to read parent session from local storage", e);
        }
    }
  }, [isClient]);

  const user = parentSession || firebaseUser;
  const loading = firebaseUserLoading || !isClient;

  const publicPages = ['/auth/login', '/auth/register', '/auth/forgot-password', '/contact', '/survey', '/parent-access', '/terms', '/privacy'];
  const isPublicPage = publicPages.some(p => pathname.startsWith(p)) || pathname === '/';
  const isOnboardingPage = pathname.startsWith('/onboarding');
  
  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user && !isPublicPage) {
      router.replace('/auth/login');
      return;
    }

    if (user) {
        if (isPublicPage && !pathname.startsWith('/parent-access')) {
            router.replace('/dashboard');
            return;
        }

        if (!user.isParent) {
            const hasSchool = !!user.schoolId;
            if (hasSchool && isOnboardingPage) {
                router.replace('/dashboard');
            } else if (!hasSchool && !isOnboardingPage && pathname.startsWith('/dashboard')) {
                router.replace('/onboarding');
            }
        }
    }
  }, [user, loading, pathname, isPublicPage, isOnboardingPage, router]);

  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Si on est sur une page protégée mais sans utilisateur, on affiche le loader pendant la redirection.
  if (!user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
