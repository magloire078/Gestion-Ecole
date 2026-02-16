'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Moon, Sun, ShieldCheck, School, LogOut as LogOutIcon, ChevronsUpDown, Check, User as UserIcon, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useUserSession } from "@/hooks/use-user-session";

interface UserNavProps {
  collapsed?: boolean;
}

type SubscriptionPlan = 'Essentiel' | 'Pro' | 'Premium' | 'Gratuit' | null;

export function UserNav({ collapsed = false }: UserNavProps) {
  const { theme, setTheme } = useTheme();
  const {
    user,
    schoolData,
    subscription,
    isLoading,
    isSuperAdmin,
    displayName,
    userRole,
    initials: fallback,
    planName,
    schoolError,
    logout: handleLogout,
    switchSchool: setActiveSchool
  } = useUserSession();

  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (schoolError) {
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: "Impossible de charger les données de l'école.",
      });
    }
  }, [schoolError, toast]);

  if (!isClient || isLoading) {
    return (
      <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "w-full justify-start p-1 pr-2")}>
        <Skeleton className={cn("rounded-full", collapsed ? "h-9 w-9" : "h-8 w-8")} />
        {!collapsed && (<div className="flex flex-col space-y-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-2 w-16" /></div>)}
      </div>
    );
  }

  if (!user) {
    return (
      <Button variant="ghost" onClick={() => router.push('/auth/login')}>
        Se connecter
      </Button>
    );
  }

  const hasPhoto = !!user?.photoURL;

  const UserMenuContent = () => {
    const getPlanBadgeClasses = (plan?: SubscriptionPlan) => {
      switch (plan) {
        case 'Essentiel': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800';
        case 'Pro': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800';
        case 'Premium': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              {planName && !isSuperAdmin && (
                <Badge className={cn("text-xs", getPlanBadgeClasses(subscription?.plan as SubscriptionPlan))}>
                  {planName}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <p className="text-xs leading-none text-muted-foreground capitalize">{userRole.replace(/_/g, ' ')}</p>
            </div>

            {!user.isParent && user?.email && <p className="text-xs leading-none text-muted-foreground pt-1 truncate">{user.email}</p>}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {!user.isParent && (
          <>
            {user.schools && Object.keys(user.schools).length > 1 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ChevronsUpDown className="mr-2 h-4 w-4" />
                  <span>Changer d&apos;établissement</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {Object.entries(user.schools).map(([schoolId, role]) => (
                      <DropdownMenuItem key={schoolId} onClick={() => setActiveSchool(schoolId)} disabled={schoolId === schoolData?.id} className="py-2">
                        <div className="flex flex-col gap-0.5 w-full">
                          <div className="flex items-center gap-2">
                            {schoolId === schoolData?.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            <span className={cn("font-bold text-xs truncate", schoolId !== schoolData?.id && "ml-5.5")}>
                              {user.schoolNames?.[schoolId] || `École ${schoolId.substring(0, 6)}...`}
                            </span>
                          </div>
                          <span className={cn("text-[10px] text-muted-foreground capitalize font-medium", schoolId !== schoolData?.id ? "ml-5.5" : "ml-5.5")}>
                            {role.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}

            <DropdownMenuItem onClick={() => router.push('/onboarding?force=true')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Ajouter un établissement</span>
            </DropdownMenuItem>

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/dashboard/profil')}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Mon Profil</span>
              </DropdownMenuItem>

              {isSuperAdmin && (
                <DropdownMenuItem onClick={() => router.push('/admin/system/dashboard')}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  <span>Admin Système</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="ml-2">Thème</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")}>Clair</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>Sombre</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>Système</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={handleLogout}>
          <LogOutIcon className="mr-2 h-4 w-4" />
          {user.isParent ? "Quitter le portail" : "Se déconnecter"}
        </DropdownMenuItem>
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={cn("h-auto rounded-full p-0 flex items-center gap-2 transition-all duration-300", collapsed ? "w-9 h-9" : "w-full justify-start p-1 pr-2")} aria-label="Menu utilisateur">
            <Avatar className={cn(collapsed ? "h-9 w-9" : "h-8 w-8")}>
              <AvatarImage src={user?.photoURL || undefined} alt={displayName} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className={cn("flex flex-col items-start transition-opacity duration-300", collapsed ? "opacity-0 w-0" : "opacity-100")}>
              <span className="text-sm font-medium leading-none">{hasPhoto ? displayName : userRole}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 glass-card" align="end" forceMount>
          <UserMenuContent />
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
