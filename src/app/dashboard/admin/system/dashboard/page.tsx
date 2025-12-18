
// app/admin/system/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Settings,
  Shield,
  Wrench,
  Loader2,
  Building
} from 'lucide-react';
import { SchoolsTable } from '@/components/admin/schools-table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const SystemSettings = () => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsRef = doc(firestore, 'system_settings/default');
    const { data: settingsData, loading: settingsLoading } = useDoc(settingsRef);
    
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (settingsData) {
            setMaintenanceMode(settingsData.maintenanceMode || false);
        }
    }, [settingsData]);

    const handleSave = async () => {
        setIsSaving(true);
        const dataToSave = { maintenanceMode };
        try {
            await setDoc(settingsRef, dataToSave, { merge: true });
            toast({ title: "Paramètres sauvegardés", description: "Le mode maintenance a été mis à jour."});
        } catch (e) {
             const permissionError = new FirestorePermissionError({
                path: settingsRef.path,
                operation: 'write',
                requestResourceData: dataToSave,
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (settingsLoading) {
        return <Skeleton className="h-24 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Configuration Globale
                </CardTitle>
                <CardDescription>Gérez l'état général de la plateforme.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor="maintenance-mode" className="font-semibold">Mode Maintenance</Label>
                        <p className="text-sm text-muted-foreground">
                            Lorsque activé, seuls les super-admins peuvent se connecter.
                        </p>
                    </div>
                    <Switch
                        id="maintenance-mode"
                        checked={maintenanceMode}
                        onCheckedChange={setMaintenanceMode}
                    />
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Enregistrer les modifications
                </Button>
            </CardFooter>
        </Card>
    );
};


export default function SystemAdminDashboard() {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Administration Système</h1>
                <p className="text-sm text-muted-foreground">
                  Panneau de contrôle global de la plateforme GèreEcole
                </p>
              </div>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="schools" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="schools">
              <Building className="h-4 w-4 mr-2" />
              Écoles
            </TabsTrigger>
            <TabsTrigger value="system">
              <Settings className="h-4 w-4 mr-2" />
              Système
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schools">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Écoles</CardTitle>
                <CardDescription>
                  Liste complète de toutes les écoles et leur statut d'abonnement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SchoolsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
