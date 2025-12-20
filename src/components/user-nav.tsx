

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
import { Moon, Sun, ShieldCheck, Bell } from "lucide-react";
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import { SafeImage } from "./ui/safe-image";
import { useSchoolData } from "@/hooks/use-school-data";
import { Badge } from "@/components/ui/badge";
import { collection, query, where } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import * as React from 'react';

interface UserNavProps {
  collapsed?: boolean;
  setIsNotificationsOpen: (isOpen: boolean) => void;
}

export function UserNav({ collapsed = false, setIsNotificationsOpen }: UserNavProps) {
  const { theme, setTheme } = useTheme();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { schoolId, subscription } = useSchoolData();
  const router = useRouter();
  const { toast } = useToast();

  const notificationsQuery = useMemoFirebase(() => {
    if (!schoolId || !user?.uid) return null;
    return query(collection(firestore, `ecoles/${schoolId}/messagerie`), where('readBy', 'not-in', [user.uid]));
  }, [firestore, schoolId, user?.uid]);

  const { data: notificationsData, loading: notificationsLoading } = useCollection(notificationsQuery);
  const unreadNotifications = notificationsData?.length || 0;


  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté(e).",
      });
      window.location.href = '/login';
    } catch (error) {
      console.error("Erreur de déconnexion: ", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de se déconnecter. Veuillez réessayer.",
      });
    }
  };

  const isLoading = userLoading || notificationsLoading;

  if (isLoading && collapsed) {
      return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  const isSuperAdmin = user?.profile?.isAdmin === true;
  
  const displayName = user?.authUser?.displayName || 'Utilisateur';
  
  const userRole = isSuperAdmin ? 'Super Administrateur' : user?.profile?.role;
  const fallback = displayName ? displayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'U';

  const getPlanBadgeClasses = (plan?: 'Essentiel' | 'Pro' | 'Premium') => {
    switch (plan) {
      case 'Essentiel':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800';
      case 'Pro':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800';
      case 'Premium':
        return 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  
  const UserMenuContent = () => (
    <>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium leading-none">{displayName}</p>
             {subscription?.plan && !isSuperAdmin && (
              <Badge className={cn("text-xs", getPlanBadgeClasses(subscription.plan))}>
                {subscription.plan}
              </Badge>
            )}
          </div>
          {userRole && <p className="text-xs leading-none text-muted-foreground capitalize pt-1">{userRole}</p>}
          <p className="text-xs leading-none text-muted-foreground pt-1">
            {user?.authUser?.email}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => router.push('/dashboard/parametres')}>Profil & Paramètres</DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Clair
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Sombre
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                Système
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleLogout}>
      Se déconnecter
      </DropdownMenuItem>
    </>
  );


  if (collapsed) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <button className="flex w-full items-center justify-center gap-2 rounded-full p-1 hover:bg-sidebar-accent">
                    <Avatar className="h-9 w-9">
                         <SafeImage src={user?.authUser?.photoURL} alt={displayName} width={36} height={36} className="rounded-full" />
                        <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <UserMenuContent />
            </DropdownMenuContent>
        </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
       <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" onClick={() => setIsNotificationsOpen(true)}>
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 min-w-0 p-0 flex items-center justify-center text-xs"
              >
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-9 w-9">
              <SafeImage src={user?.authUser?.photoURL} alt={displayName} width={36} height={36} className="rounded-full" />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <UserMenuContent />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
