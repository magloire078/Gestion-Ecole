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

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || loading) {
      return; 
    }

    const isPublicPage = ['/auth/login', '/auth/register', '/auth/forgot-password', '/contact', '/survey', '/parent-access', '/terms', '/privacy'].some(p => pathname.startsWith(p)) || pathname === '/';
    
    // Si nous sommes sur une page protégée et qu'il n'y a pas d'utilisateur authentifié
    if (!isPublicPage && !user) {
      router.replace('/auth/login');
      return;
    }
    
    // Si l'utilisateur est connecté mais n'a pas encore d'école et n'est pas sur la page d'onboarding
    if (user && !user.schoolId && !pathname.startsWith('/onboarding')) {
      router.replace('/onboarding');
      return;
    }

  }, [user, loading, pathname, router, isClient]);

  // Affiche un loader pendant que l'état d'authentification se résout côté client
  if (loading || !isClient) {
    return <AuthProtectionLoader />;
  }

  // Si toutes les conditions sont remplies, affiche le contenu de la page
  return <>{children}</>;
}
