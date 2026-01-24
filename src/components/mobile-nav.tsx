
"use client";
import { Logo } from './logo';
import { useUser } from '@/hooks/use-user';
import { useSchoolData } from '@/hooks/use-school-data';
import { MainNav } from './main-nav';
import { Skeleton } from './ui/skeleton';

interface MobileNavProps {
    loading: boolean;
    schoolName?: string | null;
    logoUrl?: string | null;
}

export function MobileNav({ loading, schoolName }: MobileNavProps) {
  const { user, isDirector } = useUser();
  const { subscription } = useSchoolData();

  const navProps = {
    isSuperAdmin: user?.profile?.isAdmin === true,
    isDirector: isDirector,
    userPermissions: user?.profile?.permissions || {},
    subscription: subscription,
    collapsed: false,
  };

  return (
    <div className='flex flex-col h-full bg-card'>
        <div className="flex h-20 shrink-0 items-center border-b px-6">
           {loading ? (
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-5 w-32" />
                </div>
            ) : (
                <Logo 
                  schoolName={schoolName}
                />
            )}
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
             {loading ? (
                  <div className="space-y-2 p-2">
                      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
              ) : (
                  <MainNav {...navProps} />
              )}
        </nav>
    </div>
  );
}
