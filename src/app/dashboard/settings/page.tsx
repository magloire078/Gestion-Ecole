
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
  const [schoolName, setSchoolName] = useState("GèreEcole");
  const [directorName, setDirectorName] = useState("Jean Dupont");
  const [founderName, setFounderName] = useState("");

  useEffect(() => {
    const savedSchoolName = localStorage.getItem(SCHOOL_NAME_KEY);
    const savedDirectorName = localStorage.getItem(DIRECTOR_NAME_KEY);
    const savedFounderName = localStorage.getItem(FOUNDER_NAME_KEY);

    if (savedSchoolName) setSchoolName(savedSchoolName);
    if (savedDirectorName) setDirectorName(savedDirectorName);
    if (savedFounderName) setFounderName(savedFounderName);
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
            <Label htmlFor="school-name">Nom de l'école</Label>
            <Input 
              id="school-name" 
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Nom de votre école" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="director-name">Nom du directeur</Label>
            <Input 
              id="director-name" 
              value={directorName}
              onChange={(e) => setDirectorName(e.target.value)}
              placeholder="Nom du directeur ou de la directrice" 
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="founder-name">Nom du fondateur (optionnel)</Label>
            <Input 
              id="founder-name" 
              value={founderName}
              onChange={(e) => setFounderName(e.target.value)}
              placeholder="Nom du fondateur ou de la fondatrice" 
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSaveChanges}>Enregistrer les modifications</Button>
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
                <Input value="directeur@ecole.com" disabled />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
