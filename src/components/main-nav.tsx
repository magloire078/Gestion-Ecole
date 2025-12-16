

"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import type { UserProfile } from '@/lib/data-types';
import { NAV_LINKS } from '@/lib/nav-links';

type PermissionKey = keyof NonNullable<UserProfile['permissions']>;


const NavLink = ({ href, icon: Icon, label, collapsed }: { href: string; icon: React.ElementType; label: string, collapsed?: boolean }) => {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                        href={href}
                        className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                            isActive && "bg-accent text-accent-foreground"
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        <span className="sr-only">{label}</span>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
        );
    }
    
    return (
        <Link
            href={href}
            className={cn(
                "group flex items-center gap-x-3 rounded-lg p-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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

export function MainNav({ collapsed = false }: { collapsed?: boolean }) {
  const { user } = useUser();
  const isAdmin = user?.profile?.isAdmin === true;
  const userPermissions = user?.profile?.permissions || {};
  const pathname = usePathname();

  const hasPermission = (permission?: PermissionKey) => {
    if (isAdmin) return true;
    if (!permission) return true; // Link is public within the dashboard
    return !!userPermissions[permission];
  };
  
  if (collapsed) {
      return (
          <nav className="flex flex-col items-center gap-2 px-2 py-4">
               {NAV_LINKS.flatMap(group => {
                   if (group.adminOnly && !isAdmin) return [];
                   return group.links.filter(link => hasPermission(link.permission)).map(link => (
                       <NavLink key={link.href} {...link} collapsed />
                   ));
               })}
          </nav>
      );
  }

  const defaultActiveGroup = NAV_LINKS.find(group => group.links.some(link => hasPermission(link.permission) && pathname.startsWith(link.href) && link.href !== '/dashboard'))?.group || "Principal";

  return (
    <Accordion type="single" collapsible defaultValue={defaultActiveGroup} className="w-full">
      {NAV_LINKS.map((group) => {
          if (group.adminOnly && !isAdmin) return null;
          
          const visibleLinks = group.links.filter(link => hasPermission(link.permission));
          if (visibleLinks.length === 0) return null;
          
          const isGroupActive = visibleLinks.some(link => pathname.startsWith(link.href) && link.href !== '/dashboard');

          // Render direct links for Principal and Configuration group
          if (group.group === "Principal" || group.group === "Configuration") {
              return (
                  <div key={group.group} className="py-1">
                      {visibleLinks.map(link => (
                          <NavLink key={link.href} {...link} collapsed={false} />
                      ))}
                  </div>
              )
          }

          return (
            <AccordionItem value={group.group} key={group.group} className="border-b-0">
                <AccordionTrigger className="py-2 px-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg hover:no-underline [&[data-state=open]>div>svg.chevron]:rotate-180">
                    <div className="flex flex-1 items-center justify-between">
                         <div className="flex items-center gap-x-3">
                            <div className="flex h-6 w-6 items-center justify-center">
                                <group.icon className="h-5 w-5" />
                            </div>
                            <span>{group.group}</span>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pb-1 pl-4">
                    <div className="space-y-1">
                        {visibleLinks.map((link) => (
                           <NavLink key={link.href} {...link} collapsed={false} />
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>
          );
      })}
    </Accordion>
  );
}
