
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
import { useAuthProtection } from '@/hooks/use-auth-protection';

export default function SettingsPage() {
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const { toast } = useToast();
  const { user } = useUser();
  const { schoolName: initialSchoolName, directorName: initialDirectorName, loading, updateSchoolData } = useSchoolData();

  const [schoolName, setSchoolName] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [founderName, setFounderName] = useState(""); // This can remain local or be moved to Firestore if needed
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    if (!loading) {
      setSchoolName(initialSchoolName || "");
      setDirectorName(initialDirectorName || "");
      // You might want to fetch founderName from Firestore as well if it's important
    }
  }, [initialSchoolName, initialDirectorName, loading]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await updateSchoolData({
        name: schoolName,
        directorName: directorName,
        // founderName: founderName // Uncomment to save founderName to Firestore
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
  
  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

  if (loading) {
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
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
                 <CardFooter className="border-t px-6 py-4">
                    <Skeleton className="h-10 w-48" />
                </CardFooter>
            </Card>
          </div>
      )
  }

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
