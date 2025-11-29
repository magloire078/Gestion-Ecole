
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSchoolData } from "@/hooks/use-school-data";
import { useUser } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const { 
    schoolData,
    loading, 
    updateSchoolData 
  } = useSchoolData();

  const [name, setName] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [matricule, setMatricule] = useState("");
  const [directorPhone, setDirectorPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (schoolData) {
      setName(schoolData.name || "");
      setDirectorName(schoolData.directorName || "");
      setMatricule(schoolData.matricule || "");
      setDirectorPhone(schoolData.directorPhone || "");
    }
  }, [schoolData]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await updateSchoolData({
        name,
        directorName,
        matricule,
        directorPhone
      });
      toast({
        title: "Paramètres enregistrés",
        description: "Les informations de l'école ont été mises à jour.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'enregistrer les paramètres. Vérifiez vos permissions.",
      });
    } finally {
        setIsSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (schoolData?.schoolCode) {
      navigator.clipboard.writeText(schoolData.schoolCode);
      toast({
        title: "Code copié !",
        description: "Le code de l'établissement a été copié dans le presse-papiers.",
      });
    }
  };
  
  const renderSkeleton = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Paramètres Généraux</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre compte et de votre école.
        </p>
      </div>
      {[...Array(2)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Skeleton className="h-10 w-48" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  if (loading) {
      return renderSkeleton();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Paramètres Généraux</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre compte et de votre école.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>École</CardTitle>
          <CardDescription>Modifiez les détails de votre établissement et consultez son code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school-name">Nom de l'École</Label>
            <Input 
              id="school-name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de votre école" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school-matricule">Matricule de l'Établissement</Label>
            <Input 
              id="school-matricule" 
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              placeholder="Ex: 0123/ETAB/2024" 
            />
          </div>
           {schoolData?.schoolCode && (
            <div className="space-y-2">
              <Label htmlFor="school-code">Code d'Invitation</Label>
              <div className="flex items-center gap-2">
                <Input id="school-code" value={schoolData.schoolCode} readOnly className="bg-muted" />
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copier le code</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Partagez ce code avec les enseignants pour leur permettre de rejoindre votre école.</p>
            </div>
           )}
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
            <Label htmlFor="director-phone">Téléphone du Directeur</Label>
            <Input 
              id="director-phone" 
              type="tel"
              value={directorPhone}
              onChange={(e) => setDirectorPhone(e.target.value)}
              placeholder="Numéro de téléphone" 
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer les Modifications"}
          </Button>
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
                <Input value={user?.displayName || ''} disabled />
            </div>
            <div className="space-y-2 mt-4">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
