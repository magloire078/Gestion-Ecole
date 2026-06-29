'use client';

import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSchoolData } from "@/hooks/use-school-data";
import { useUser, useAuth, useFirestore } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, AlertCircle, LogOut, Check, User, Users } from "lucide-react";
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { doc, deleteDoc } from 'firebase/firestore';
import { signOut } from "firebase/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { settingsSchema, type SettingsFormValues } from "@/components/settings/general/settings-schema";
import { SettingsHeroHeader } from "@/components/settings/general/settings-hero-header";
import { TabGeneral } from "@/components/settings/general/tab-general";
import { TabAdmin } from "@/components/settings/general/tab-admin";
import { TabContact } from "@/components/settings/general/tab-contact";
import { TabDirector } from "@/components/settings/general/tab-director";

export default function SettingsPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const { schoolData, loading, updateSchoolData } = useSchoolData();
  const [error, setError] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const methods = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "", directorFirstName: "", directorLastName: "", currentAcademicYear: "", matricule: "", cnpsEmployeur: "", directorPhone: "", address: "", phone: "", website: "", mainLogoUrl: "", digitalSignatureUrl: "", email: "",
      startMonth: "septembre",
      endMonth: "juin",
    }
  });

  useEffect(() => {
    if (schoolData) {
      methods.reset({
        name: schoolData.name || "",
        currentAcademicYear: schoolData.currentAcademicYear || "",
        directorFirstName: schoolData.directorFirstName || "",
        directorLastName: schoolData.directorLastName || "",
        matricule: schoolData.matricule || "",
        cnpsEmployeur: schoolData.cnpsEmployeur || "",
        directorPhone: schoolData.directorPhone || "",
        address: schoolData.address || "",
        phone: schoolData.phone || "",
        website: schoolData.website || "",
        mainLogoUrl: schoolData.mainLogoUrl || "",
        digitalSignatureUrl: schoolData.digitalSignatureUrl || "",
        email: schoolData.email || "",
        startMonth: schoolData.startMonth || "septembre",
        endMonth: schoolData.endMonth || "juin",
      });
    }
  }, [schoolData, methods]);

  const handleSaveChanges = async (values: SettingsFormValues) => {
    setError(null);
    setIsSaving(true);
    try {
      const dataToSave = { ...values };
      await updateSchoolData(dataToSave);
      methods.reset(values, { keepValues: true, keepDirty: false });
      toast({
        title: "✅ Succès", description: "Les paramètres ont été mis à jour.", duration: 3000,
      });
    } catch (error: any) {
      let errorMessage = "Impossible d'enregistrer les paramètres.";
      if (error.code === 'permission-denied') errorMessage = "Accès refusé.";
      setError(errorMessage);
      toast({
        variant: "destructive", title: "❌ Erreur", description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (schoolData?.schoolCode) {
      navigator.clipboard.writeText(schoolData.schoolCode);
      toast({ title: "Code copié !", description: "Copié dans le presse-papiers." });
    }
  };

  const handleResetAccount = async () => {
    if (!user || !user.authUser || !firestore) return;
    try {
      await deleteDoc(doc(firestore, 'users', user.authUser.uid));
      await signOut(auth);
      window.location.href = '/login';
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Échec de réinitialisation." });
    }
  };

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-[500px] w-full rounded-xl" /></div>;
  }

  return (
    <div className="space-y-4 min-h-[600px]">
      {error && (
        <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormProvider {...methods}>
        {/* Header Isolé : Ne re-rend que ce composant quand on tape dans les champs surveillés */}
        <SettingsHeroHeader />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <Card className="rounded-xl border-none shadow-xl bg-gradient-to-b from-white to-neutral-50/50 backdrop-blur-md flex-1 flex flex-col">
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Accès & Codes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                {schoolData?.schoolCode && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                    <p className="text-xs font-medium text-primary/70">Code d'invitation</p>
                    <div className="flex items-center justify-between">
                      <code className="text-xl font-black tracking-widest text-primary">{schoolData.schoolCode}</code>
                      <Button size="icon" variant="ghost" onClick={handleCopyCode} className="h-8 w-8 hover:bg-primary/10 text-primary">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground italic">Partagez ce code avec vos collaborateurs pour qu'ils rejoignent l'école.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-none shadow-xl bg-gradient-to-br from-red-50/50 to-white/50 backdrop-blur-md border border-red-100/50 overflow-hidden shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Zone Critique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Action destructrice. Vous serez dissocié de cet établissement.</p>
                <Button variant="destructive" className="w-full rounded-xl shadow-lg shadow-red-200" onClick={() => setIsResetDialogOpen(true)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Quitter l'École
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 flex flex-col h-full">
            <form onSubmit={methods.handleSubmit(handleSaveChanges)} className="flex flex-col h-full">
              <Tabs defaultValue="general" className="w-full flex-1" onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start gap-4 h-14 bg-transparent border-b rounded-none mb-8 px-0 overflow-x-auto overflow-y-hidden flex-nowrap">
                  <TabsTrigger value="general" className="relative h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 font-semibold transition-all group whitespace-nowrap">
                    <span className="relative z-10">Général</span>
                    {activeTab === "general" && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.3)]" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="relative h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 font-semibold transition-all group whitespace-nowrap">
                    <span className="relative z-10">Administration</span>
                    {activeTab === "admin" && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.3)]" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="relative h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 font-semibold transition-all group whitespace-nowrap">
                    <span className="relative z-10">Contact</span>
                    {activeTab === "contact" && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.3)]" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="director" className="relative h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 font-semibold transition-all group whitespace-nowrap">
                    <span className="relative z-10">Directeur</span>
                    {activeTab === "director" && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.3)]" />
                    )}
                  </TabsTrigger>
                </TabsList>

                <div className="relative">
                  <TabsContent value="general" className="mt-0 outline-none">
                    <TabGeneral />
                  </TabsContent>
                  <TabsContent value="admin" className="mt-0 outline-none">
                    <TabAdmin />
                  </TabsContent>
                  <TabsContent value="contact" className="mt-0 outline-none">
                    <TabContact />
                  </TabsContent>
                  <TabsContent value="director" className="mt-0 outline-none">
                    <TabDirector />
                  </TabsContent>
                </div>
              </Tabs>

              <div className="mt-auto flex items-center justify-between pt-6 border-t sticky bottom-6 bg-white/80 backdrop-blur-xl p-6 rounded-xl z-20 shadow-2xl border-white/50 ring-1 ring-black/5">
                <div className="hidden md:block">
                  <div className="text-sm text-muted-foreground font-semibold flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    Connecté en tant que <span className="text-foreground">{user?.displayName}</span>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isSaving || !methods.formState.isDirty}
                  className="rounded-xl h-16 px-12 text-lg font-black shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-primary/90 text-white gap-3"
                >
                  {isSaving ? (
                    <><Loader2 className="h-6 w-6 animate-spin" /> Enregistrement...</>
                  ) : (
                    <><Check className="h-6 w-6" /> Enregistrer</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </FormProvider>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent className="rounded-xl p-10 border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)]">
          <AlertDialogHeader className="space-y-4">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto md:mx-0">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <AlertDialogTitle className="text-3xl font-black tracking-tight">Confirmer l&apos;Action</AlertDialogTitle>
            <AlertDialogDescription className="text-lg leading-relaxed font-medium text-muted-foreground/80">
              Êtes-vous sûr de vouloir quitter cet établissement ? Toutes vos données associées à cette école sur votre profil seront réinitialisées. Cette opération est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-8 gap-4 sm:gap-0">
            <AlertDialogCancel className="rounded-xl h-14 px-8 font-bold bg-neutral-100 border-none hover:bg-neutral-200 transition-all">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAccount} className="rounded-xl h-14 px-8 font-bold bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-200 transition-all">
              Oui, quitter l&apos;école
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

