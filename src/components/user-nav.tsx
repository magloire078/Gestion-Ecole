
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
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

const DIRECTOR_NAME_KEY = 'directorName';

export function UserNav() {
  const [directorName, setDirectorName] = useState("Jean Dupont");

  const updateDirectorName = () => {
    const savedDirectorName = localStorage.getItem(DIRECTOR_NAME_KEY);
    setDirectorName(savedDirectorName || "Jean Dupont");
  };

  useEffect(() => {
    updateDirectorName();

    // Listen for the custom event to update the name when settings change
    window.addEventListener('settings-updated', updateDirectorName);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('settings-updated', updateDirectorName);
    };
  }, []);
  
  const fallback = directorName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || 'JD';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://picsum.photos/100/100" alt="Directeur" data-ai-hint="person face" />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{directorName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              directeur@ecole.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>Profil</DropdownMenuItem>
          <DropdownMenuItem>Facturation</DropdownMenuItem>
          <DropdownMenuItem>Paramètres</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
