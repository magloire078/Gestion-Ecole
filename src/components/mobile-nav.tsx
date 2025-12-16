

"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { useUser } from '@/firebase';
import type { UserProfile } from '@/lib/data-types';
import { NAV_LINKS } from '@/lib/nav-links';

type PermissionKey = keyof NonNullable<UserProfile['permissions']>;

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return (
        <Link
            href={href}
            className={cn(
                "group flex items-center gap-x-3 rounded-md p-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground"
            )}
        >
            <div className="flex h-6 w-6 items-center justify-center">
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
             </div>
            <span>{label}</span>
        </Link>
    );
};


export function MobileNav() {
  const { user } = useUser();
  const isAdmin = user?.profile?.isAdmin === true;
  const userPermissions = user?.profile?.permissions || {};

  const hasPermission = (permission?: PermissionKey) => {
    if (isAdmin) return true; // Super admin always has permission
    if (!permission) return true; // Link is public within the dashboard
    return !!userPermissions[permission];
  };

  return (
    <div className='flex flex-col h-full'>
        <div className="flex h-16 shrink-0 items-center border-b px-6">
            <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
            {NAV_LINKS.map((group) => {
                if (group.adminOnly && !isAdmin) return null;

                const visibleLinks = group.links.filter(link => hasPermission(link.permission));
                if(visibleLinks.length === 0) return null;

                return (
                  <div key={group.group} className="mb-4">
                      <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                          {group.group}
                      </h3>
                       <div className="space-y-1">
                          {visibleLinks.map((link) => (
                             <NavLink key={link.href} {...link} />
                          ))}
                      </div>
                  </div>
                );
            })}
        </nav>
    </div>
  );
}
