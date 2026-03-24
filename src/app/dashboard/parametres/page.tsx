

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSchoolData } from "@/hooks/use-school-data";
import { useUser, useAuth, useFirestore } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, AlertCircle, Upload, FileSignature, LogOut, Trash2, Users, Check, User, Phone, Globe, Loader2, CheckCircle, School, Building, Mail, Briefcase, Calendar } from "lucide-react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImageUploader } from '@/components/image-uploader';
import { useRouter } from "next/navigation";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { SafeImage } from '@/components/ui/safe-image';
import { InvitationCode } from '@/components/settings/invitation-code';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

const settingsSchema = z.object({
  name: z.string().min(1, "Le nom de l'école est requis."),
  currentAcademicYear: z.string().regex(/^\d{4}-\d{4}$/, "Format invalide (ex: 2024-2025)").optional().or(z.literal('')),
  matricule: z.string().regex(/^[A-Z0-9\/-]*$/, { message: "Format de matricule invalide" }).optional().or(z.literal('')),
  cnpsEmployeur: z.string().regex(/^[0-9]*$/, { message: "Le numéro CNPS doit contenir uniquement des chiffres" }).optional().or(z.literal('')),
  directorFirstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  directorLastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  directorPhone: z.string().regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/, "Numéro de téléphone invalide").optional().or(z.literal('')),
  address: z.string().max(200).optional(),
  phone: z.string().regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/, "Numéro de téléphone invalide").optional().or(z.literal('')),
  website: z.string().url({ message: "URL invalide" }).optional().or(z.literal('')),
  mainLogoUrl: z.string().url({ message: "URL invalide" }).optional().or(z.literal('')),
  digitalSignatureUrl: z.string().url({ message: "URL invalide" }).optional().or(z.literal('')),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
});


type SettingsFormValues = z.infer<typeof settingsSchema>;


export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const { schoolId, schoolData, loading, updateSchoolData } = useSchoolData();
  const [error, setError] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "", directorFirstName: "", directorLastName: "", currentAcademicYear: "", matricule: "", cnpsEmployeur: "", directorPhone: "", address: "", phone: "", website: "", mainLogoUrl: "", digitalSignatureUrl: "", email: "",
    }
  });

  useEffect(() => {
    if (schoolData) {
      form.reset({
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
      });
    }
  }, [schoolData, form]);

  const handleSaveChanges = async (values: SettingsFormValues) => {
    setError(null);
    setIsSaving(true);
    try {
      const dataToSave = { ...values };
      await updateSchoolData(dataToSave);
      form.reset(values, { keepValues: true, keepDirty: false });
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

  const handleLogoUploadComplete = (url: string) => {
    form.setValue('mainLogoUrl', url, { shouldDirty: true });
    form.handleSubmit(handleSaveChanges)();
  }

  const handleSignatureUploadComplete = (url: string) => {
    form.setValue('digitalSignatureUrl', url, { shouldDirty: true });
    form.handleSubmit(handleSaveChanges)();
  }

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
    return <div className="space-y-6"><Skeleton className="h-[500px] w-full rounded-3xl" /></div>;
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <div className="space-y-8 min-h-[600px]">
      {error && (
        <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/5 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Hero Header Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-primary/10 to-transparent p-8 md:p-12 border shadow-inner"
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/60 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative h-32 w-32 md:h-40 md:w-40 rounded-3xl border-2 border-white bg-white/80 backdrop-blur-md shadow-2xl flex items-center justify-center p-2 overflow-hidden overflow-hidden">
              <SafeImage src={form.watch('mainLogoUrl')} alt="Logo" width={120} height={120} className="object-contain" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ImageUploader
                  onUploadComplete={handleLogoUploadComplete}
                  storagePath={`ecoles/${schoolId}/logos/`}
                  resizeWidth={300}
                >
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-10 w-10">
                    <Upload className="h-6 w-6" />
                  </Button>
                </ImageUploader>
              </div>
            </div>
          </div>
          <div className="text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider backdrop-blur-md border border-primary/20">
              <CheckCircle className="h-3 w-3" />
              ID: {schoolData?.matricule || "Établissement Actif"}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground/90">
              {form.watch('name') || "Mon Établissement"}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5 bg-white/40 border px-3 py-1 rounded-full backdrop-blur-sm">
                <Calendar className="h-4 w-4 text-primary/60" />
                {form.watch('currentAcademicYear') || "2024-2025"}
              </span>
              <span className="flex items-center gap-1.5 bg-white/40 border px-3 py-1 rounded-full backdrop-blur-sm">
                <Building className="h-4 w-4 text-primary/60" />
                {form.watch('address') || "Adresse non définie"}
              </span>
            </div>
          </div>
        </div>

        {/* Background Decorations */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-b from-white to-neutral-50/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Accès & Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {schoolData?.schoolCode && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
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

          <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-br from-red-50/50 to-white/50 backdrop-blur-md border border-red-100/50 overflow-hidden">
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

        <div className="lg:col-span-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-8">
              <Tabs defaultValue="general" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start gap-4 h-14 bg-transparent border-b rounded-none mb-8 px-0">
                  <TabsTrigger value="general" className="relative h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 font-semibold transition-all group">
                    <span className="relative z-10">Général</span>
                    {activeTab === "general" && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.3)]" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="relative h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 font-semibold transition-all group">
                    <span className="relative z-10">Administration</span>
                    {activeTab === "admin" && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.3)]" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="relative h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 font-semibold transition-all group">
                    <span className="relative z-10">Contact</span>
                    {activeTab === "contact" && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.3)]" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="director" className="relative h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 font-semibold transition-all group">
                    <span className="relative z-10">Directeur</span>
                    {activeTab === "director" && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.3)]" />
                    )}
                  </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <TabsContent value="general" className="relative space-y-6 mt-0">
                      <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
                      <Card className="rounded-[2rem] border-none shadow-2xl shadow-primary/5 bg-white/80 backdrop-blur-xl border border-white/20 p-6 md:p-8 overflow-hidden relative">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                          <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 font-bold"><School className="h-4 w-4 text-primary" />Nom de l&apos;Établissement</FormLabel>
                              <FormControl><Input className="rounded-2xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="currentAcademicYear" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 font-bold"><Calendar className="h-4 w-4 text-primary" />Année Académique</FormLabel>
                              <FormControl><Input placeholder="Ex: 2024-2025" className="rounded-2xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="md:col-span-2">
                            <FormField control={form.control} name="address" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 font-bold"><Building className="h-4 w-4 text-primary" />Adresse Physique</FormLabel>
                                <FormControl><Input placeholder="Quartier, Rue, Ville..." className="rounded-2xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>
                      </Card>
                    </TabsContent>

                    <TabsContent value="admin" className="space-y-6 mt-0">
                      <Card className="rounded-[2rem] border-none shadow-2xl shadow-primary/5 bg-white/80 backdrop-blur-xl border border-white/20 p-6 md:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormField control={form.control} name="matricule" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 font-bold"><FileSignature className="h-4 w-4 text-primary" />Matricule Officiel</FormLabel>
                              <FormControl><Input placeholder="Ex: 0123/ETAB/2024" className="rounded-2xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="cnpsEmployeur" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 font-bold"><Briefcase className="h-4 w-4 text-primary" />N° CNPS Employeur</FormLabel>
                              <FormControl><Input placeholder="Numéro d'immatriculation" className="rounded-2xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </Card>
                    </TabsContent>

                    <TabsContent value="contact" className="space-y-6 mt-0">
                      <Card className="rounded-[2rem] border-none shadow-2xl shadow-primary/5 bg-white/80 backdrop-blur-xl border border-white/20 p-6 md:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 font-bold"><Phone className="h-4 w-4 text-primary" />Téléphone</FormLabel>
                              <FormControl><Input type="tel" className="rounded-2xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 font-bold"><Mail className="h-4 w-4 text-primary" />Email de Contact</FormLabel>
                              <FormControl><Input type="email" placeholder="contact@ecole.com" className="rounded-2xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="md:col-span-2">
                            <FormField control={form.control} name="website" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 font-bold"><Globe className="h-4 w-4 text-primary" />Site Internet</FormLabel>
                                <FormControl><Input type="url" placeholder="https://www.votre-école.com" className="rounded-2xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>
                      </Card>
                    </TabsContent>

                    <TabsContent value="director" className="space-y-6 mt-0">
                      <Card className="rounded-[2rem] border-none shadow-2xl shadow-primary/5 bg-white/80 backdrop-blur-xl border border-white/20 p-6 md:p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <FormField control={form.control} name="directorFirstName" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">Prénom</FormLabel>
                              <FormControl><Input className="rounded-2xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="directorLastName" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">Nom</FormLabel>
                              <FormControl><Input className="rounded-2xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="directorPhone" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">Téléphone</FormLabel>
                              <FormControl><Input type="tel" className="rounded-2xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <Separator className="opacity-50" />

                        <FormField control={form.control} name="digitalSignatureUrl" render={({ field }) => (
                          <FormItem className="space-y-4">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="space-y-1">
                                <FormLabel className="flex items-center gap-2 text-xl font-black tracking-tight">
                                  <FileSignature className="h-6 w-6 text-primary" />
                                  Signature Numérique
                                </FormLabel>
                                <FormDescription className="max-w-md text-sm leading-relaxed font-medium text-muted-foreground/80">
                                  Cette signature apparaîtra sur tous les documents officiels générés par la plateforme (bulletins, certificats). Format PNG transparent recommandé pour un rendu optimal.
                                </FormDescription>
                              </div>
                              <ImageUploader
                                onUploadComplete={handleSignatureUploadComplete}
                                storagePath={`ecoles/${schoolId}/signatures/`}
                                resizeWidth={600}
                              >
                                <Button type="button" variant="outline" className="rounded-2xl h-14 px-8 font-bold shadow-sm border-primary/20 hover:bg-primary/5 hover:text-primary transition-all active:scale-95">
                                  <Upload className="h-5 w-5 mr-3" />
                                  Mettre à jour
                                </Button>
                              </ImageUploader>
                            </div>

                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              className="relative group max-w-sm mx-auto md:mx-0 overflow-hidden"
                            >
                              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-[2rem] blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
                              <div className="relative h-40 w-full rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 backdrop-blur-sm flex items-center justify-center overflow-hidden p-6">
                                {field.value ? (
                                  <img
                                    src={field.value}
                                    alt="Signature"
                                    className="max-h-full max-w-full object-contain filter drop-shadow-2xl"
                                  />
                                ) : (
                                  <div className="text-muted-foreground flex flex-col items-center gap-3">
                                    <div className="p-4 rounded-full bg-primary/10">
                                      <FileSignature className="h-8 w-8 text-primary opacity-40" />
                                    </div>
                                    <p className="text-xs uppercase font-black tracking-widest opacity-30 text-center">Aucune signature<br />enregistrée</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </Card>
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </Tabs>

              <div className="flex items-center justify-between pt-6 border-t sticky bottom-6 bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] z-20 shadow-2xl border-white/50 ring-1 ring-black/5">
                <div className="hidden md:block">
                  <p className="text-sm text-muted-foreground font-semibold flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    Connecté en tant que <span className="text-foreground">{user?.displayName}</span>
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={isSaving || !form.formState.isDirty}
                  className="rounded-2xl h-16 px-12 text-lg font-black shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-primary/90 text-white gap-3"
                >
                  {isSaving ? (
                    <><Loader2 className="h-6 w-6 animate-spin" /> Enregistrement...</>
                  ) : (
                    <><Check className="h-6 w-6" /> Enregistrer les Modifications</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] p-10 border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)]">
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
            <AlertDialogCancel className="rounded-2xl h-14 px-8 font-bold bg-neutral-100 border-none hover:bg-neutral-200 transition-all">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAccount} className="rounded-2xl h-14 px-8 font-bold bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-200 transition-all">
              Oui, quitter l&apos;école
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

