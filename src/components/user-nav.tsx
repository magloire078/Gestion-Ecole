

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
import { Moon, Sun, ShieldCheck } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { useHydrationFix } from "@/hooks/use-hydration-fix";
import { cn } from "@/lib/utils";
import { SafeImage } from "./ui/safe-image";

export function UserNav({ collapsed = false }: { collapsed?: boolean }) {
  const isMounted = useHydrationFix();
  const { theme, setTheme } = useTheme();
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

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

  const isLoading = userLoading || !isMounted;

  if (isLoading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }
  
  const displayName = user?.authUser?.displayName || 'Utilisateur';
  const fallback = displayName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  
  // DEV ONLY: Grant admin rights to a specific email for development
  const isAdmin = user?.customClaims?.admin === true || user?.authUser?.email === "magloire078@gmail.com";
  const userRole = isAdmin ? 'Admin' : user?.profile?.role;

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
            {/* Same content as non-collapsed */}
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                    {user?.authUser?.email}
                    </p>
                    {userRole && <p className="text-xs leading-none text-muted-foreground capitalize pt-1">{userRole}</p>}
                </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push('/dashboard/parametres')}>Profil & Paramètres</DropdownMenuItem>
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
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => router.push('/dashboard/admin/abonnements')}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        <span>Admin Abonnements</span>
                      </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => router.push('/dashboard/admin/roles')}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        <span>Gestion des Rôles</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                Se déconnecter
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
  }

  return (
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
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.authUser?.email}
            </p>
             {userRole && <p className="text-xs leading-none text-muted-foreground capitalize pt-1">{userRole}</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard/parametres')}>Profil & Paramètres</DropdownMenuItem>
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
        </DropdownMenuGroup>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/dashboard/admin/abonnements')}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Admin Abonnements</span>
              </DropdownMenuItem>
               <DropdownMenuItem onClick={() => router.push('/dashboard/admin/roles')}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Gestion des Rôles</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
