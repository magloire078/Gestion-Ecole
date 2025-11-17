
'use client';

import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { MobileNav } from '@/components/mobile-nav';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !userLoading && user) {
      const checkOnboardingStatus = async () => {
        // Check for the root user document to see if onboarding is complete.
        const userDocRef = doc(firestore, 'users', user.uid);
        
        try {
            const docSnap = await getDoc(userDocRef);
            const userDocExists = docSnap.exists();
            
            setHasCompletedOnboarding(userDocExists);
            
            if (!userDocExists) {
                router.push('/onboarding');
            }
        } catch (error) {
            console.error("Error checking onboarding status:", error);
            // Fallback: if there's an error, assume not onboarded to be safe
            setHasCompletedOnboarding(false);
            router.push('/onboarding');
        }
      };
      
      checkOnboardingStatus();

    } else if (isClient && !userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router, isClient, firestore]);
  
  const isLoading = userLoading || hasCompletedOnboarding === null;

  if (!isClient || isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="text-center">
                <p className="text-lg font-semibold">Chargement...</p>
                <p className="text-muted-foreground">Vérification de votre compte et de votre école.</p>
            </div>
        </div>
    );
  }

  if (!user || !hasCompletedOnboarding) {
      // This case should be handled by the useEffect redirects, but as a fallback:
       return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="text-center">
                <p className="text-lg font-semibold">Redirection...</p>
            </div>
        </div>
    );
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-card sm:flex">
        <div className="flex h-[60px] items-center border-b px-6">
          <Logo />
        </div>
        <MainNav />
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-xs p-0">
              <MobileNav />
            </SheetContent>
          </Sheet>
          <div className="flex-1">
             {/* Future search bar can go here */}
          </div>
          <UserNav />
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
      </div>
    </div>
  );
}
