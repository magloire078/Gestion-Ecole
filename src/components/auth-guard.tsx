
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
  const { user, loading, schoolId } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return; 
    }
    
    const isPublicPage = ['/auth/login', '/auth/register', '/auth/forgot-password', '/contact', '/survey', '/parent-access', '/terms', '/privacy', '/onboarding/create-school'].some(p => pathname.startsWith(p)) || pathname === '/';
    
    if (user) {
        if (schoolId && !pathname.startsWith('/dashboard')) {
            router.replace('/dashboard');
        } else if (!schoolId && !isPublicPage && !pathname.startsWith('/onboarding')) {
            router.replace('/onboarding');
        }
    } else {
        if (!isPublicPage) {
            router.replace('/auth/login');
        }
    }

  }, [user, loading, schoolId, pathname, router]);

  if (loading) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
