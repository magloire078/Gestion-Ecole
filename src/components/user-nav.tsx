
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
import { Moon, Sun, ShieldCheck, Loader2, School, LogOut as LogOutIcon } from "lucide-react";
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
  const { user, loading: userLoading, isDirector } = useUser();
  const { schoolData, subscription, loading: schoolLoading } = useSchoolData();
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (userLoading || !user) return;
    
    if (user && !user.isParent && !user.schoolId) {
      setIsTransitioning(true);
    } else {
      setIsTransitioning(false);
    }
  }, [user, userLoading]);
  
  const handleLogout = async () => {
    if (user?.isParent) {
        localStorage.removeItem('parent_session_id');
        localStorage.removeItem('parent_school_id');
        localStorage.removeItem('parent_student_ids');
        toast({ title: "Déconnexion réussie", description: "Vous avez quitté le portail parent." });
        window.location.href = '/parent-access';
        return;
    }
    try {
      await signOut(auth);
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté(e).",
      });
      window.location.href = '/auth/login';
    } catch (error) {
      console.error("Erreur de déconnexion: ", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de se déconnecter. Veuillez réessayer.",
      });
    }
  };
  
  const isLoading = userLoading || (user && !user.isParent && schoolLoading) || isTransitioning;

  if (!isClient || isLoading) {
    return (
      <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "w-full justify-start p-1 pr-2")}>
        <Skeleton className="h-8 w-8 rounded-full" />
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

  const isSuperAdmin = user?.profile?.isAdmin === true;
  const displayName = user.displayName || 'Utilisateur';
  
  const userRole = user.isParent 
    ? 'Portail Parent' 
    : isSuperAdmin 
      ? 'Super Administrateur' 
      : (isDirector ? 'Directeur' : user?.profile?.role || 'Membre');
  
  const fallback = displayName 
    ? displayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() 
    : 'U';

  const getPlanBadgeClasses = (plan?: 'Essentiel' | 'Pro' | 'Premium') => {
    switch (plan) {
      case 'Essentiel': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800';
      case 'Pro': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800';
      case 'Premium': return 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const planName = isSuperAdmin ? null : (subscription?.plan || 'Gratuit');
  
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
          
          <div className="flex items-center gap-1">
            <p className="text-xs leading-none text-muted-foreground capitalize">{userRole.replace(/_/g, ' ')}</p>
            {schoolData?.name && !isSuperAdmin && !user.isParent && (
              <><span className="text-xs text-muted-foreground">•</span><p className="text-xs leading-none text-muted-foreground truncate max-w-[120px]">{schoolData.name}</p></>
            )}
          </div>
          
          {!user.isParent && user?.email && <p className="text-xs leading-none text-muted-foreground pt-1 truncate">{user.email}</p>}
        </div>
      </DropdownMenuLabel>
      
      <DropdownMenuSeparator />
      
      {!user.isParent && (
        <>
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("h-auto rounded-full p-0 flex items-center gap-2", collapsed ? "w-9 h-9" : "w-full justify-start p-1 pr-2")}>
          <Avatar className="h-8 w-8">
            <SafeImage src={user?.photoURL} alt={displayName} width={32} height={32} className="rounded-full" />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
           <div className={cn("flex flex-col items-start", collapsed && "hidden")}>
              <span className="text-sm font-medium leading-none">{displayName}</span>
            </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount><UserMenuContent /></DropdownMenuContent>
    </DropdownMenu>
  );
}
