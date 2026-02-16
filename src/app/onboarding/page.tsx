'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/hooks/use-user';
import { useFirestore } from "@/firebase";
import { doc, writeBatch, collection, query, where, getDocs, getDoc, updateDoc } from "firebase/firestore";
import { Logo } from '@/components/logo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from "@/components/ui/badge";
import type { staff as Staff, user_root, parent as Parent, parent_session } from '@/lib/data-types';
import { Loader2, PlayCircle, School, Users, Heart, ArrowRight, CheckCircle2, Rocket, Sparkles } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { DEMO_DIRECTOR_EMAIL, DEMO_SCHOOL_NAME } from '@/lib/demo-data';
import { SchoolCreationService } from '@/services/school-creation';
import { seedDemoData } from '@/services/demo-seeding';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedHighlight } from '@/components/ui/animated-highlight';

type OnboardingMode = "create" | "join" | "parent";

function RoleCard({
  id,
  title,
  description,
  icon: Icon,
  selected,
  onClick
}: {
  id: OnboardingMode,
  title: string,
  description: string,
  icon: any,
  selected: boolean,
  onClick: () => void
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center p-6 rounded-3xl border-2 transition-all cursor-pointer text-center h-full",
        selected
          ? "bg-white border-[#2D9CDB] shadow-[0_20px_40px_rgba(45,156,219,0.15)] ring-4 ring-[#2D9CDB]/5"
          : "bg-white/50 border-slate-100 hover:border-[#2D9CDB]/40 hover:bg-white shadow-sm"
      )}
    >
      <div className={cn(
        "h-16 w-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
        selected ? "bg-[#2D9CDB] text-white" : "bg-slate-100 text-slate-400"
      )}>
        <Icon className="h-8 w-8" />
      </div>
      <h3 className={cn("text-lg font-black mb-2 font-outfit", selected ? "text-[#0C365A]" : "text-slate-600")}>
        {title}
      </h3>
      <p className="text-sm text-slate-400 font-medium leading-relaxed">
        {description}
      </p>
      {selected && (
        <motion.div
          layoutId="selected-role-check"
          className="absolute -top-3 -right-3 h-8 w-8 bg-[#2D9CDB] rounded-full flex items-center justify-center text-white border-4 border-white shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4" />
        </motion.div>
      )}
    </motion.div>
  );
}

function DemoOnboarding({ onSetupDemo, isProcessing }: { onSetupDemo: () => void, isProcessing: boolean }) {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#f8faff] p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#2D9CDB]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#0C365A]/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        <Card className="rounded-[40px] border-none shadow-[0_40px_100px_rgba(12,54,90,0.08)] bg-white p-8 md:p-12 overflow-hidden">
          <AnimatedHighlight />
          <div className="flex flex-col items-center mb-8 relative z-10 text-center">
            <div className="mb-8 transform scale-[2.2] py-6">
              <Logo compact />
            </div>
            <Badge variant="outline" className="mb-4 px-3 py-1 text-primary border-primary/20 bg-primary/5 uppercase tracking-widest text-[10px] font-black">
              Environnement de Démo
            </Badge>
            <h1 className="text-4xl font-black text-[#0C365A] font-outfit tracking-tight mb-4">Bienvenue sur la Démo</h1>
            <p className="text-slate-500 max-w-md font-medium text-lg">
              Prêt à explorer GéreEcole ? Cliquez ci-dessous pour initialiser un environnement complet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex gap-4">
              <div className="h-10 w-10 shrink-0 bg-blue-100 text-[#2D9CDB] rounded-xl flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Création automatique du <strong>Groupe Scolaire Les Lauréats</strong>.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex gap-4">
              <div className="h-10 w-10 shrink-0 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Inclusion d'élèves, de personnel et de données financières pré-remplies.
              </p>
            </div>
          </div>

          <Button
            className="w-full h-16 rounded-2xl text-xl font-black bg-[#0C365A] hover:bg-[#0C365A]/90 text-white shadow-2xl shadow-blue-900/10 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] relative z-10"
            onClick={onSetupDemo}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <><Loader2 className="mr-3 h-6 w-6 animate-spin" />Initialisation...</>
            ) : (
              <><PlayCircle className="mr-3 h-6 w-6" />Lancer l'expérience de démo</>
            )}
          </Button>
        </Card>
      </motion.div>
    </main>
  );
}


export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading, hasSchool, reloadUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [mode, setMode] = useState<OnboardingMode>("create");
  const [schoolCode, setSchoolCode] = useState('');
  const [role, setRole] = useState('enseignant');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parentAccessCode, setParentAccessCode] = useState('');

  const handleSetupDemo = async () => {
    if (!user || !user.uid) return;
    setIsProcessing(true);

    const schoolService = new SchoolCreationService(firestore);
    try {
      const directorNameParts = user.displayName?.split(' ') || ['Directeur', ''];
      const result = await schoolService.createSchool({
        name: DEMO_SCHOOL_NAME,
        drena: 'DRENA Abidjan 1',
        directorId: user.uid,
        directorFirstName: directorNameParts[0],
        directorLastName: directorNameParts.slice(1).join(' '),
        directorEmail: user.email!,
      });

      if (result.success && result.schoolId) {
        toast({ title: "École de démo créée...", description: "Remplissage des données en cours." });
        await seedDemoData(firestore, result.schoolId);
        toast({ title: 'Environnement de démo prêt !', description: 'Redirection vers votre tableau de bord.' });
        await reloadUser();
        router.push('/dashboard');
      } else {
        throw new Error(result.error || "La création de l'école de démo a échoué.");
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
      setIsProcessing(false);
    }
  };

  const searchParams = useSearchParams();
  const forceMode = searchParams.get('force') === 'true';

  if (loading) return <LoadingScreen />;
  if (!user) { router.replace('/auth/login'); return <LoadingScreen />; }
  if (hasSchool && !forceMode) { router.replace('/dashboard'); return <LoadingScreen />; }
  if (user && user.email === DEMO_DIRECTOR_EMAIL && !hasSchool) {
    return <DemoOnboarding onSetupDemo={handleSetupDemo} isProcessing={isProcessing} />;
  }

  const handleJoinSchool = async () => {
    if (!user || !user.uid || !user.displayName || !user.email) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Informations manquantes.' });
      return;
    }
    if (!schoolCode.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le code de l\'établissement est requis.' });
      return;
    }
    setIsProcessing(true);
    try {
      const schoolsRef = collection(firestore, 'ecoles');
      const q = query(schoolsRef, where("schoolCode", "==", schoolCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast({ variant: 'destructive', title: 'Code Invalide', description: 'Aucun établissement trouvé.' });
        setIsProcessing(false);
        return;
      }
      const schoolDoc = querySnapshot.docs[0];
      const schoolId = schoolDoc.id;
      const nameParts = user.displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const userRootRef = doc(firestore, `users/${user.uid}`);
      const staffProfileRef = doc(firestore, `ecoles/${schoolId}/personnel/${user.uid}`);
      const batch = writeBatch(firestore);
      const staffProfileData: Omit<Staff, 'id'> = {
        uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL || '',
        schoolId: schoolId, role: role as any, firstName: firstName, lastName: lastName,
        hireDate: new Date().toISOString().split('T')[0], baseSalary: 0, status: 'Actif',
        isAdmin: user.profile?.isAdmin || false,
      };
      batch.set(staffProfileRef, staffProfileData);
      const userRootSnap = await getDoc(userRootRef);
      const currentSchools = userRootSnap.exists() ? (userRootSnap.data() as user_root).schools || {} : {};
      const updatedSchools = { ...currentSchools, [schoolId]: role };
      batch.set(userRootRef, { schools: updatedSchools, activeSchoolId: schoolId }, { merge: true });
      await batch.commit();
      await reloadUser();
      toast({ title: 'Bienvenue !', description: `Vous avez rejoint ${schoolDoc.data().name}.` });
      router.replace('/dashboard');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } finally { setIsProcessing(false); }
  };

  const handleParentJoin = async () => {
    if (!user || !user.uid) return;
    if (!parentAccessCode.trim()) return;
    setIsProcessing(true);
    try {
      const sessionsRef = collection(firestore, 'sessions_parents');
      const q = query(sessionsRef, where("accessCode", "==", parentAccessCode.trim()), where("isActive", "==", true));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast({ variant: 'destructive', title: 'Code Invalide', description: 'Code incorrect ou expiré.' });
        setIsProcessing(false);
        return;
      }
      const sessionDoc = querySnapshot.docs[0];
      const sessionData = sessionDoc.data() as parent_session;
      const schoolId = sessionData.schoolId!;
      const studentIds = sessionData.studentIds!;
      const batch = writeBatch(firestore);
      const userRootRef = doc(firestore, `users/${user.uid}`);
      const userRootSnap = await getDoc(userRootRef);
      const currentSchools = userRootSnap.exists() ? (userRootSnap.data() as user_root).schools || {} : {};
      const updatedSchools = { ...currentSchools, [schoolId]: 'parent' };
      batch.set(userRootRef, { schools: updatedSchools, activeSchoolId: schoolId }, { merge: true });
      const parentProfileRef = doc(firestore, `ecoles/${schoolId}/parents/${user.uid}`);
      const parentProfileSnap = await getDoc(parentProfileRef);
      const existingStudentIds = parentProfileSnap.exists() ? (parentProfileSnap.data() as Parent).studentIds || [] : [];
      const newStudentIds = [...new Set([...existingStudentIds, ...studentIds])];
      batch.set(parentProfileRef, { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL, schoolId: schoolId, studentIds: newStudentIds }, { merge: true });
      for (const studentId of studentIds) {
        const studentRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const parentIds = [...new Set([...(studentSnap.data().parentIds || []), user.uid])];
          batch.update(studentRef, { parentIds: parentIds });
        }
      }
      batch.update(sessionDoc.ref, { isActive: false });
      await batch.commit();
      await reloadUser();
      toast({ title: 'Accès parent activé!', description: 'Redirection...' });
      router.replace('/dashboard');
    } catch (error) { toast({ variant: 'destructive', title: 'Erreur', description: 'Échec de la liaison.' }); }
    finally { setIsProcessing(false); }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#f8faff] p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-[#2D9CDB]/5 blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-[#0C365A]/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl relative z-10"
      >
        <Card className="rounded-[40px] border-none shadow-[0_40px_100px_rgba(12,54,90,0.08)] bg-white p-6 md:p-14 overflow-hidden">
          <AnimatedHighlight />

          <div className="flex flex-col items-center mb-12 relative z-10 text-center">
            <div className="mb-10 transform scale-[2.5] py-2">
              <Logo compact />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#0C365A] font-outfit tracking-tight mb-4">
              Démarrage du compte
            </h1>
            <p className="text-slate-400 max-w-md font-medium text-lg leading-relaxed">
              Pour commencer, dites-nous comment vous souhaitez utiliser GéreEcole aujourd'hui.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
            <RoleCard
              id="create"
              selected={mode === "create"}
              onClick={() => setMode("create")}
              title="Créer une école"
              description="Pour les fondateurs et directeurs d'établissements."
              icon={School}
            />
            <RoleCard
              id="join"
              selected={mode === "join"}
              onClick={() => setMode("join")}
              title="Rejoindre (Staff)"
              description="Pour les enseignants et l'équipe administrative."
              icon={Users}
            />
            <RoleCard
              id="parent"
              selected={mode === "parent"}
              onClick={() => setMode("parent")}
              title="Accès Parent"
              description="Pour suivre la scolarité et les notes de vos enfants."
              icon={Heart}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="max-w-xl mx-auto w-full bg-slate-50/50 border border-slate-100/50 p-8 rounded-[32px] relative z-10"
            >
              {mode === 'create' && (
                <div className="text-center space-y-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0C365A] text-white shadow-xl shadow-blue-900/10">
                    <Rocket className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-[#0C365A]">Nouvel Établissement</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      Vous allez être guidé pas à pas pour configurer la structure pédagogique de votre école.
                    </p>
                  </div>
                </div>
              )}

              {mode === 'join' && (
                <div className="space-y-6">
                  <div className="grid gap-2 text-center mb-4">
                    <h3 className="text-xl font-bold text-[#0C365A]">Profil Personnel</h3>
                    <p className="text-sm text-slate-500 font-medium">Saisissez le code fourni par votre établissement.</p>
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Code École</Label>
                      <Input
                        placeholder="Ex: LAU-1234"
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                        disabled={isProcessing}
                        className="h-12 rounded-xl bg-white border-transparent focus:border-[#2D9CDB] shadow-sm transition-all text-center font-bold tracking-widest text-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Votre Rôle</Label>
                      <Select value={role} onValueChange={setRole} disabled={isProcessing}>
                        <SelectTrigger className="h-12 rounded-xl bg-white border-transparent focus:border-[#2D9CDB] shadow-sm text-slate-600 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enseignant">Enseignant(e)</SelectItem>
                          <SelectItem value="secretaire">Secrétaire</SelectItem>
                          <SelectItem value="comptable">Comptable</SelectItem>
                          <SelectItem value="surveillant">Surveillant(e)</SelectItem>
                          <SelectItem value="personnel">Autre Personnel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'parent' && (
                <div className="space-y-6">
                  <div className="grid gap-2 text-center mb-4">
                    <h3 className="text-xl font-bold text-[#0C365A]">Espace Parent</h3>
                    <p className="text-sm text-slate-500 font-medium">Saisissez le code d'accès de votre enfant.</p>
                  </div>
                  <div className="space-y-1.5 max-w-xs mx-auto">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 text-center block w-full">Code d'Accès</Label>
                    <Input
                      placeholder="Code à 6 chiffres"
                      value={parentAccessCode}
                      onChange={(e) => setParentAccessCode(e.target.value)}
                      disabled={isProcessing}
                      maxLength={6}
                      className="h-14 rounded-2xl bg-white border-transparent focus:border-[#2D9CDB] shadow-sm transition-all text-center font-black tracking-[0.2em] text-2xl text-[#2D9CDB]"
                    />
                  </div>
                </div>
              )}

              <div className="pt-8">
                <Button
                  className={cn(
                    "w-full h-14 rounded-2xl text-lg font-bold shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]",
                    mode === 'create' ? "bg-[#0C365A] hover:bg-[#0C365A]/90 text-white shadow-blue-900/10" : "bg-[#2D9CDB] hover:bg-[#2D9CDB]/90 text-white shadow-blue-400/20"
                  )}
                  onClick={mode === 'create' ? () => router.push('/onboarding/create-school') : mode === 'join' ? handleJoinSchool : handleParentJoin}
                  disabled={isProcessing || (mode === 'join' && !schoolCode.trim()) || (mode === 'parent' && parentAccessCode.length < 6)}
                >
                  {isProcessing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Vérification...</>
                  ) : (
                    <span className="flex items-center gap-2">Continuer <ArrowRight className="h-5 w-5" /></span>
                  )}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </Card>
      </motion.div>
    </main>
  );
}
