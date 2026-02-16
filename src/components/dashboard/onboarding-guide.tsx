'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getCountFromServer, where } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
    School,
    Users,
    UserPlus,
    Layers,
    CalendarCheck,
    CreditCard,
    CheckCircle2,
    ArrowRight,
    Sparkles,
    Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function OnboardingGuide() {
    const { schoolId, schoolData, currentAcademicYear, mainLogoUrl } = useSchoolData();
    const firestore = useFirestore();
    const [stats, setStats] = useState({
        personnel: 0,
        classes: 0,
        students: 0,
        cycles: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!schoolId || !firestore) return;

        const fetchOnboardingStats = async () => {
            try {
                const personnelQuery = query(collection(firestore, `ecoles/${schoolId}/personnel`));
                const classesQuery = query(collection(firestore, `ecoles/${schoolId}/classes`));
                const studentsQuery = query(collection(firestore, `ecoles/${schoolId}/eleves`));

                const [personnelSnap, classesSnap, studentsSnap] = await Promise.all([
                    getCountFromServer(personnelQuery),
                    getCountFromServer(classesQuery),
                    getCountFromServer(studentsQuery)
                ]);

                setStats({
                    personnel: personnelSnap.data().count,
                    classes: classesSnap.data().count,
                    students: studentsSnap.data().count,
                    cycles: schoolData?.cycles?.length || 0
                });
            } catch (error) {
                console.error("Error fetching onboarding stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOnboardingStats();
    }, [schoolId, firestore, schoolData?.cycles]);

    const steps = useMemo(() => [
        {
            id: 'structure',
            title: 'Structure Pédagogique',
            description: 'Configurez vos cycles et classes.',
            icon: Layers,
            completed: stats.classes > 0,
            href: '/dashboard/pedagogie/structure',
            required: true
        },
        {
            id: 'academic_year',
            title: 'Année Académique',
            description: 'Définissez l\'année scolaire en cours.',
            icon: CalendarCheck,
            completed: !!currentAcademicYear,
            href: '/dashboard/parametres',
            required: true
        },
        {
            id: 'personnel',
            title: 'Équipe Administrative',
            description: 'Ajoutez vos premiers collaborateurs.',
            icon: Users,
            completed: stats.personnel > 1, // On compte > 1 car le directeur est déjà dedans
            href: '/dashboard/rh',
            required: true
        },
        {
            id: 'students',
            title: 'Dossiers Élèves',
            description: 'Inscrivez vos premiers élèves.',
            icon: UserPlus,
            completed: stats.students > 0,
            href: '/dashboard/dossiers-eleves',
            required: true
        },
        {
            id: 'logo',
            title: 'Image de marque',
            description: 'Ajoutez le logo de votre école.',
            icon: ImageIcon,
            completed: !!mainLogoUrl,
            href: '/dashboard/parametres',
            required: false // Optionnel comme demandé
        }
    ], [stats, currentAcademicYear, mainLogoUrl]);

    const requiredSteps = steps.filter(s => s.required);
    const completedRequiredSteps = requiredSteps.filter(s => s.completed).length;
    const progress = Math.round((completedRequiredSteps / requiredSteps.length) * 100);

    // Ne pas afficher si tout est prêt (étapes requises complétées)
    if (!loading && progress === 100) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            <Card className="overflow-hidden border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white/80 backdrop-blur-md">
                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-600 to-indigo-600" />

                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
                                <CardTitle className="text-xl font-black text-slate-800 font-outfit">
                                    Bienvenue sur votre espace, {schoolData?.name}
                                </CardTitle>
                            </div>
                            <p className="text-slate-500 font-medium text-sm">
                                Finissez la configuration pour débloquer toute la puissance de GéreEcole.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 min-w-[200px]">
                            <div className="flex justify-between w-full text-xs font-bold uppercase tracking-wider text-slate-400">
                                <span>Progression</span>
                                <span className="text-blue-600">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2 w-full bg-slate-100" />
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {steps.map((step, index) => (
                            <Link href={step.href} key={step.id}>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className={cn(
                                        "relative group flex flex-col p-4 rounded-2xl border transition-all duration-300 h-full",
                                        step.completed
                                            ? "bg-emerald-50/50 border-emerald-100"
                                            : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5"
                                    )}
                                >
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-colors",
                                        step.completed ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                                    )}>
                                        {step.completed ? <CheckCircle2 className="h-6 w-6" /> : <step.icon className="h-6 w-6" />}
                                    </div>

                                    <h4 className={cn(
                                        "text-sm font-bold mb-1",
                                        step.completed ? "text-emerald-700" : "text-slate-700"
                                    )}>
                                        {step.title}
                                        {!step.required && <span className="ml-1.5 text-[10px] text-slate-400 font-normal italic">(Bonus)</span>}
                                    </h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        {step.description}
                                    </p>

                                    {step.completed && (
                                        <div className="absolute top-3 right-3">
                                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                                        </div>
                                    )}
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
