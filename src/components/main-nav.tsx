
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import type { UserProfile } from '@/lib/data-types';
import { NAV_LINKS } from '@/lib/nav-links';
import type { Subscription } from '@/hooks/use-school-data';


type PermissionKey = keyof NonNullable<UserProfile['permissions']>;
type Module = 'sante' | 'cantine' | 'transport' | 'internat' | 'immobilier' | 'activites' | 'rh';

interface NavProps {
    isSuperAdmin: boolean;
    isDirector: boolean;
    userPermissions: Partial<Record<PermissionKey, boolean>>;
    subscription?: Subscription | null;
    collapsed?: boolean;
}

const NavLink = ({ href, icon: Icon, label, collapsed, pathname }: { href: string; icon: React.ElementType; label: string, collapsed?: boolean, pathname: string }) => {
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

export function MainNav({ isSuperAdmin, isDirector, userPermissions, subscription, collapsed = false }: NavProps) {
  const pathname = usePathname();

  const hasAccess = (permission?: PermissionKey, module?: Module) => {
    if (isSuperAdmin || isDirector) {
      return true;
    }

    // A user must have the base permission AND the module activated (if applicable)
    const permissionGranted = permission ? !!userPermissions[permission] : true;
    if (!permissionGranted) {
        return false;
    }

    if (module) {
        const isPremium = subscription?.plan === 'Premium';
        const isFreeTier = subscription?.plan === 'Essentiel';
        const isModuleActive = subscription?.activeModules?.includes(module);
        
        // Free tier (Essentiel) has access to all modules
        if (isFreeTier) {
            return true;
        }

        if (!isPremium && !isModuleActive) {
            return false;
        }
    }
    
    return true;
  };
  
  if (collapsed) {
      return (
          <nav className="flex flex-col items-center gap-2 px-2 py-4">
               {NAV_LINKS.flatMap(group => {
                   if (group.adminOnly && !isSuperAdmin) return [];
                   return group.links.filter(link => hasAccess(link.permission, link.module)).map(link => (
                       <NavLink key={link.href} {...link} collapsed pathname={pathname} />
                   ));
               })}
          </nav>
      );
  }

  const defaultActiveGroup = NAV_LINKS.find(group => group.links.some(link => hasAccess(link.permission, link.module) && pathname.startsWith(link.href) && link.href !== '/dashboard'))?.group;
  const mainLinks = NAV_LINKS.find(g => g.group === "Principal")?.links.filter(link => hasAccess(link.permission, link.module)) || [];
  const configLinks = NAV_LINKS.find(g => g.group === "Configuration")?.links.filter(link => hasAccess(link.permission, link.module)) || [];
  const accordionGroups = NAV_LINKS.filter(g => g.group !== "Principal" && g.group !== "Configuration");


  return (
    <>
    <div className="space-y-1 py-1">
        {mainLinks.map(link => (
            <NavLink key={link.href} {...link} collapsed={false} pathname={pathname} />
        ))}
    </div>
    <Accordion type="multiple" defaultValue={defaultActiveGroup ? [defaultActiveGroup] : []} className="w-full">
      {accordionGroups.map((group) => {
          if (group.adminOnly && !isSuperAdmin) return null;
          
          const visibleLinks = group.links.filter(link => hasAccess(link.permission, link.module));
          if (visibleLinks.length === 0) return null;
          
          return (
            <AccordionItem value={group.group} key={group.group} className="border-b-0">
                <AccordionTrigger className="py-2 px-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg hover:no-underline [&[data-state=open]>svg]:rotate-180">
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
                           <NavLink key={link.href} {...link} collapsed={false} pathname={pathname} />
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>
          );
      })}
    </Accordion>
    <div className="space-y-1 pt-2 mt-2 border-t">
        {configLinks.map(link => (
            <NavLink key={link.href} {...link} collapsed={false} pathname={pathname} />
        ))}
    </div>
    </>
  );
}
