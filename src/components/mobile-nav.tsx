

"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { MainNav } from './main-nav';

export function MobileNav() {
  const { user } = useUser();
  const { schoolData, subscription } = useSchoolData();

  const navProps = {
    isSuperAdmin: user?.profile?.isAdmin === true,
    isDirector: schoolData?.directorId === user?.uid,
    userPermissions: user?.profile?.permissions || {},
    subscription: subscription,
    collapsed: false,
  };

  return (
    <div className='flex flex-col h-full'>
        <div className="flex h-16 shrink-0 items-center border-b px-6">
            <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
            <MainNav {...navProps} />
        </nav>
    </div>
  );
}
