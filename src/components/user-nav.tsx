
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
import { Moon, Sun, ShieldCheck, Loader2, School } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import { SafeImage } from "./ui/safe-image";
import { useSchoolData } from "@/hooks/use-school-data";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface UserNavProps {
  collapsed?: boolean;
}

export function UserNav({ collapsed = false }: UserNavProps) {
  const { theme, setTheme } = useTheme();
  const auth = useAuth();
  const { user, loading: userLoading, schoolId } = useUser();
  const { schoolData, subscription, loading: schoolLoading } = useSchoolData();
  const router = useRouter();
  const { toast } = useToast();
  
  // État local pour gérer la transition
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Détecter les transitions après création d'école
  useEffect(() => {
    if (userLoading || !user) return;
    
    // Si on a un utilisateur mais pas encore de schoolId, on est peut-être en train de créer une école
    if (user && schoolId === undefined) {
      setIsTransitioning(true);
    } else {
      setIsTransitioning(false);
    }
  }, [user, schoolId, userLoading]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté(e).",
      });
      // Utiliser replace pour éviter le bouton "retour"
      router.replace('/login');
    } catch (error) {
      console.error("Erreur de déconnexion: ", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de se déconnecter. Veuillez réessayer.",
      });
    }
  };

  // Afficher un loader pendant les transitions critiques
  if (userLoading || isTransitioning) {
    return (
      <div className={cn(
        "flex items-center gap-2",
        collapsed ? "justify-center" : "justify-start"
      )}>
        <Skeleton className="h-9 w-9 rounded-full" />
        {!collapsed && (
          <div className="flex flex-col space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-16" />
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    // Si pas d'utilisateur, afficher un bouton de connexion
    return (
      <Button 
        variant="ghost" 
        onClick={() => router.push('/login')}
        className={cn(
          "h-8 rounded-full",
          collapsed && "justify-center p-2"
        )}
      >
        {!collapsed && "Se connecter"}
      </Button>
    );
  }

  const isSuperAdmin = user?.profile?.isAdmin === true;
  
  const displayName = user?.authUser?.displayName || user?.profile?.displayName || 'Utilisateur';
  
  const userRole = isSuperAdmin 
    ? 'Super Administrateur' 
    : (user?.profile?.role === 'directeur' ? 'Directeur' : user?.profile?.role || 'Membre');
  
  const fallback = displayName 
    ? displayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() 
    : 'U';

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

  const getPlanName = () => {
    if (isSuperAdmin) return null;
    if (schoolLoading) return 'Chargement...';
    return subscription?.plan || 'Gratuit';
  };

  const planName = getPlanName();
  
  const UserMenuContent = () => (
    <>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {planName && !isSuperAdmin && (
              <Badge className={cn("text-xs", getPlanBadgeClasses(subscription?.plan as any))}>
                {planName}
              </Badge>
            )}
          </div>
          
          {userRole && (
            <div className="flex items-center gap-1">
              <p className="text-xs leading-none text-muted-foreground capitalize">
                {userRole}
              </p>
              {schoolData?.name && !isSuperAdmin && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <p className="text-xs leading-none text-muted-foreground truncate max-w-[120px]">
                    {schoolData.name}
                  </p>
                </>
              )}
            </div>
          )}
          
          <p className="text-xs leading-none text-muted-foreground pt-1 truncate">
            {user?.authUser?.email}
          </p>
        </div>
      </DropdownMenuLabel>
      
      <DropdownMenuSeparator />
      
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => router.push('/dashboard/parametres')}>
          <School className="mr-2 h-4 w-4" />
          <span>Profil & Paramètres</span>
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

  // Version collapsed (sidebar réduite)
  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center justify-center gap-2 rounded-full p-1 hover:bg-sidebar-accent">
            <Avatar className="h-9 w-9">
              <SafeImage 
                src={user?.authUser?.photoURL} 
                alt={displayName} 
                width={36} 
                height={36} 
                className="rounded-full" 
              />
              <AvatarFallback>
                {schoolLoading || isTransitioning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  fallback
                )}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <UserMenuContent />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Version normale
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full justify-start gap-2">
          <Avatar className="h-9 w-9">
            <SafeImage 
              src={user?.authUser?.photoURL} 
              alt={displayName} 
              width={32} 
              height={32} 
              className="rounded-full" 
            />
            <AvatarFallback>
              {schoolLoading || isTransitioning ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                fallback
              )}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <UserMenuContent />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
