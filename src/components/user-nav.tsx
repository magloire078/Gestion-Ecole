

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
import { Moon, Sun, ShieldCheck, Loader2, School, LogOut as LogOutIcon, ChevronsUpDown, Check, Bell } from "lucide-react";
import { useAuth, useFirestore } from "@/firebase";
import { useUser } from "@/hooks/use-user";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import { useSchoolData } from "@/hooks/use-school-data";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
// import { useNotifications } from "@/hooks/use-notifications";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


interface UserNavProps {
  collapsed?: boolean;
}

type SubscriptionPlan = 'Essentiel' | 'Pro' | 'Premium' | 'Gratuit' | null;

export function UserNav({ collapsed = false }: UserNavProps) {
  const { theme, setTheme } = useTheme();
  const auth = useAuth();
  const { user, loading: userLoading, isDirector, setActiveSchool } = useUser();
  const { schoolData, subscription, loading: schoolLoading, error: schoolError } = useSchoolData();
  // const { unreadCount, loading: notificationsLoading } = useNotifications();
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
  
  const handleParentLogout = () => {
    localStorage.removeItem('parent_session_id');
    localStorage.removeItem('parent_school_id');
    localStorage.removeItem('parent_student_ids');
    toast({ title: "Déconnexion réussie", description: "Vous avez quitté le portail parent." });
    router.push('/parent-access');
    router.refresh();
  };
  
  const handleRegularLogout = async () => {
    try {
      await signOut(auth);
      // Nettoyer toutes les données sensibles du localStorage pour plus de sécurité
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('firebase:') || key.startsWith('parent_')) {
          localStorage.removeItem(key);
        }
      });
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté(e).",
      });
      router.push('/auth/login');
    } catch (error) {
      console.error("Erreur de déconnexion: ", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de se déconnecter. Veuillez réessayer.",
      });
    }
  };

  const handleLogout = user?.isParent ? handleParentLogout : handleRegularLogout;
  
  const isLoading = userLoading || (user && !user.isParent && (schoolLoading || !schoolData));


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

  const isSuperAdmin = user?.profile?.isAdmin === true;
  const displayName = user.displayName || 'Utilisateur';
  
  const userRole = user.isParent 
    ? 'Portail Parent' 
    : isSuperAdmin 
      ? 'Super Administrateur' 
      : (isDirector ? 'Directeur' : user?.profile?.role || 'Membre');
  
  const fallback = displayName
    ? displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';
  
  const planName = isSuperAdmin ? null : (subscription?.plan || 'Gratuit');
  
  const UserMenuContent = () => (
    <>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {planName && !isSuperAdmin && (
              <Badge className={cn("text-xs", getPlanBadgeClasses(subscription?.plan))}>
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
                <span>Changer d'établissement</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {Object.entries(user.schools).map(([schoolId, role]) => (
                    <DropdownMenuItem key={schoolId} onClick={() => setActiveSchool(schoolId)} disabled={schoolId === schoolData?.id}>
                       {schoolId === schoolData?.id && <Check className="mr-2 h-4 w-4" />}
                       <span className={cn(schoolId !== schoolData?.id && "ml-6")}>
                           École {schoolId.substring(0,6)}...
                       </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}

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
  
  const hasPhoto = !!user?.photoURL;
  
  const getPlanBadgeClasses = (plan?: SubscriptionPlan) => {
    switch (plan) {
      case 'Essentiel': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800';
      case 'Pro': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800';
      case 'Premium': return 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("h-auto rounded-full p-0 flex items-center gap-2", collapsed ? "w-9 h-9" : "w-full justify-start p-1 pr-2")} aria-label="Menu utilisateur">
          <Avatar className={cn(collapsed ? "h-9 w-9" : "h-8 w-8")}>
            <AvatarImage src={user?.photoURL || undefined} alt={displayName} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
           <div className={cn("flex flex-col items-start", collapsed && "hidden")}>
              <span className="text-sm font-medium leading-none">{hasPhoto ? displayName : userRole}</span>
           </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount><UserMenuContent /></DropdownMenuContent>
    </DropdownMenu>
  );
}
