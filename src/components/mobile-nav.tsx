

"use client";
import { Logo } from './logo';
import { useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { MainNav } from './main-nav';

interface MobileNavProps {
    loading: boolean;
    schoolName?: string | null;
    logoUrl?: string | null;
}

export function MobileNav({ loading, schoolName, logoUrl }: MobileNavProps) {
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
        <div className="flex h-16 shrink-0 items-center border-b px-6">
            <Logo 
              loading={loading}
              schoolName={schoolName}
              logoUrl={logoUrl}
            />
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
            <MainNav {...navProps} />
        </nav>
    </div>
  );
}
