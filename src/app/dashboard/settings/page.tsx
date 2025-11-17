
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const SCHOOL_NAME_KEY = 'schoolName';
const DIRECTOR_NAME_KEY = 'directorName';
const FOUNDER_NAME_KEY = 'founderName';

export default function SettingsPage() {
  const { toast } = useToast();
  const [schoolName, setSchoolName] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [founderName, setFounderName] = useState("");
  const [userEmail, setUserEmail] = useState("directeur@ecole.com");

  useEffect(() => {
    // We need to wait for the component to mount before accessing localStorage
    setSchoolName(localStorage.getItem(SCHOOL_NAME_KEY) || "GèreEcole");
    setDirectorName(localStorage.getItem(DIRECTOR_NAME_KEY) || "Jean Dupont");
    setFounderName(localStorage.getItem(FOUNDER_NAME_KEY) || "");
  }, []);

  const handleSaveChanges = () => {
    localStorage.setItem(SCHOOL_NAME_KEY, schoolName);
    localStorage.setItem(DIRECTOR_NAME_KEY, directorName);
    localStorage.setItem(FOUNDER_NAME_KEY, founderName);

    // Dispatch a custom event to notify other components of the change
    window.dispatchEvent(new CustomEvent('settings-updated'));

    toast({
      title: "Paramètres enregistrés",
      description: "Les informations de l'école ont été mises à jour.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre compte et de votre école.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>École</CardTitle>
          <CardDescription>Modifiez les détails de votre établissement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school-name">Nom de l'École</Label>
            <Input 
              id="school-name" 
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Nom de votre école" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="director-name">Nom du Directeur</Label>
            <Input 
              id="director-name" 
              value={directorName}
              onChange={(e) => setDirectorName(e.target.value)}
              placeholder="Nom du directeur ou de la directrice" 
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="founder-name">Nom du Fondateur (optionnel)</Label>
            <Input 
              id="founder-name" 
              value={founderName}
              onChange={(e) => setFounderName(e.target.value)}
              placeholder="Nom du fondateur ou de la fondatrice" 
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSaveChanges}>Enregistrer les Modifications</Button>
        </CardFooter>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Les informations de votre profil (non modifiables ici).</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={directorName} disabled />
            </div>
            <div className="space-y-2 mt-4">
                <Label>Email</Label>
                <Input value={userEmail} disabled />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
