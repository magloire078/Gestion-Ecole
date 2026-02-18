
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import type { UserProfile } from '@/lib/data-types';
import { NAV_LINKS } from '@/lib/nav-links';
import type { Subscription } from '@/hooks/use-subscription';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';


type PermissionKey = keyof NonNullable<UserProfile['permissions']>;
type Module = 'sante' | 'cantine' | 'transport' | 'internat' | 'immobilier' | 'activites' | 'rh';

interface NavProps {
    isSuperAdmin: boolean;
    isDirector: boolean;
    userPermissions: Partial<Record<PermissionKey, boolean>>;
    subscription?: Subscription | null;
    collapsed?: boolean;
}

const NavLink = ({ href, icon: Icon, label, collapsed, pathname, hasUnreadMessages }: { href: string; icon: React.ElementType; label: string, collapsed?: boolean, pathname: string, hasUnreadMessages?: boolean }) => {
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
                        {hasUnreadMessages && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600 border border-background" />}
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
                <Icon className={cn("h-5 w-5")} />
            </div>
            <span>{label}</span>
            {hasUnreadMessages && <span className="ml-auto h-2 w-2 rounded-full bg-red-600" />}
        </Link>
    );
};

export function MainNav({ isSuperAdmin, isDirector, userPermissions, subscription, collapsed = false }: NavProps) {
    const pathname = usePathname();
    const firestore = useFirestore();
    const [hasUnreadChats, setHasUnreadChats] = useState(false);

    useEffect(() => {
        // Only check for unread messages if the user has permission to manage communication
        const canAccessLiveChat = isSuperAdmin || userPermissions?.manageCommunication;

        if (!canAccessLiveChat || !firestore) return;

        // Listen for active chats that have unread messages
        // Note: This logic depends on how 'unread' is defined in your data model.
        // Assuming we want to notify valid admins of ANY active visitor chat.
        // Or closer to "AdminChatPanel" logic: any chat where last message is from 'user' (visitor) and not read?
        // For simplicity and performance in the nav menu, we'll just check for 'active' status chats.
        // A better approach would be to have a cloud function update a counter on the school doc or similar.

        // Simple query: get all active visitor chats.
        // Adjust this query to match your specific "unread" criteria if possible.
        const q = query(
            collection(firestore, 'visitor_chats'),
            where('status', '==', 'active')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Check if any chat has the last message from the visitor (role === 'user')
            // This avoids notifying for chats where the admin just replied.
            const unread = snapshot.docs.some(doc => {
                const data = doc.data();
                const messages = data.messages || [];
                const lastMessage = messages[messages.length - 1];
                return lastMessage && lastMessage.role === 'user';
            });
            setHasUnreadChats(unread);
        });

        return () => unsubscribe();
    }, [firestore, isSuperAdmin, userPermissions]);

    const hasAccess = (permission?: PermissionKey, module?: Module) => {
        if (isSuperAdmin) {
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
                        <NavLink key={link.href} {...link} collapsed pathname={pathname} hasUnreadMessages={hasUnreadChats && link.label === 'Support'} />
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
                                        <NavLink key={link.href} {...link} collapsed={false} pathname={pathname} hasUnreadMessages={hasUnreadChats && link.label === 'Support'} />
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
