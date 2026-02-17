'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Building, User, Mail, Phone, Globe, Calendar, CreditCard, Layout, MapPin, Users, School as SchoolIcon, Loader2, BookUser, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { school as School } from '@/lib/data-types';
import { useFirestore } from '@/firebase';
import { collection, query, getCountFromServer, where, doc, getDoc } from 'firebase/firestore';

interface SchoolViewDetailsProps {
    school: School & { id: string };
}

export function SchoolViewDetails({ school }: SchoolViewDetailsProps) {
    const firestore = useFirestore();
    const [stats, setStats] = useState({
        students: 0,
        classes: 0,
        teachers: 0,
        revenue: 0,
        loading: true
    });

    useEffect(() => {
        async function fetchStats() {
            if (!school.id || !firestore) return;
            try {
                const studentsQuery = query(collection(firestore, `ecoles/${school.id}/eleves`));
                const classesQuery = query(collection(firestore, `ecoles/${school.id}/classes`));
                const teachersQuery = query(collection(firestore, `ecoles/${school.id}/personnel`), where('role', '==', 'enseignant'));
                const financeDocRef = doc(firestore, `ecoles/${school.id}/stats/finance`);

                const [studentsSnap, classesSnap, teachersSnap, financeSnap] = await Promise.all([
                    getCountFromServer(studentsQuery),
                    getCountFromServer(classesQuery),
                    getCountFromServer(teachersQuery),
                    getDoc(financeDocRef)
                ]);

                setStats({
                    students: studentsSnap.data().count,
                    classes: classesSnap.data().count,
                    teachers: teachersSnap.data().count,
                    revenue: financeSnap.exists() ? (financeSnap.data().totalTuitionFees || 0) : 0,
                    loading: false
                });
            } catch (error) {
                console.error("Error fetching school stats:", error);
                setStats(s => ({ ...s, loading: false }));
            }
        }
        fetchStats();
    }, [school.id, firestore]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return 'Date invalide';
        return format(date, 'PPP', { locale: fr });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);
    };

    const InfoSection = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
        <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-white/5 text-blue-600 dark:text-blue-400">
                    <Icon className="h-4 w-4" />
                </div>
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</h4>
            </div>
            <div className="grid gap-3 pt-1">
                {children}
            </div>
        </div>
    );

    const InfoItem = ({ label, value, icon: Icon }: { label: string, value: string | React.ReactNode, icon?: any }) => (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
            <div className="flex items-center gap-2 group">
                {Icon && <Icon className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />}
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{value || 'Non renseigné'}</span>
            </div>
        </div>
    );

    return (
        <div className="grid gap-6 py-4">
            {/* Statistiques en tête */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Élèves', value: stats.students, icon: Users, color: 'blue' },
                    { label: 'Classes', value: stats.classes, icon: SchoolIcon, color: 'indigo' },
                    { label: 'Enseignants', value: stats.teachers, icon: BookUser, color: 'cyan' },
                    { label: 'Revenus (Prévu)', value: formatCurrency(stats.revenue), icon: Banknote, color: 'emerald' },
                ].map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border border-${item.color}-100 bg-${item.color}-50/30 dark:border-white/5 dark:bg-white/5 flex flex-col gap-1`}>
                        <div className={`p-1.5 w-fit rounded-lg bg-${item.color}-100 dark:bg-${item.color}-900/30 text-${item.color}-600 dark:text-${item.color}-400 mb-1`}>
                            <item.icon className="h-4 w-4" />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">{item.label}</p>
                        <p className="text-xl font-black text-slate-700 dark:text-slate-100 truncate">
                            {stats.loading ? <Loader2 className="h-3 w-3 animate-spin text-slate-300" /> : item.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Informations Générales */}
                <InfoSection title="Informations Générales" icon={Building}>
                    <InfoItem label="Nom de l'établissement" value={school.name} />
                    <InfoItem label="Code École" value={school.schoolCode} />
                    <InfoItem label="Matricule" value={school.matricule} />
                    <InfoItem label="DRENA" value={school.drena} />
                    <InfoItem label="Statut" value={
                        <Badge variant="outline" className={school.status === 'active' ? 'border-emerald-100 text-emerald-600 bg-emerald-50' : 'border-rose-100 text-rose-600 bg-rose-50'}>
                            {school.status || 'Active'}
                        </Badge>
                    } />
                </InfoSection>

                {/* Contact & Localisation */}
                <InfoSection title="Contact & Localisation" icon={MapPin}>
                    <InfoItem label="Adresse" value={school.address} icon={MapPin} />
                    <InfoItem label="Téléphone" value={school.phone} icon={Phone} />
                    <InfoItem label="Email" value={school.email} icon={Mail} />
                    <InfoItem label="Site Web" value={school.website} icon={Globe} />
                </InfoSection>

                {/* Direction */}
                <InfoSection title="Direction" icon={User}>
                    <InfoItem label="Directeur" value={`${school.directorFirstName} ${school.directorLastName}`} icon={User} />
                    <InfoItem label="Téléphone Directeur" value={school.directorPhone} icon={Phone} />
                    <InfoItem label="Email Directeur" value={school.directorEmail} icon={Mail} />
                </InfoSection>

                {/* Abonnement & Système */}
                <InfoSection title="Abonnement & Système" icon={CreditCard}>
                    <InfoItem label="Plan actuel" value={
                        <Badge className="bg-blue-600 text-white border-none">
                            {school.subscription?.plan || 'Essentiel'}
                        </Badge>
                    } icon={CreditCard} />
                    <InfoItem label="Statut" value={school.subscription?.status || 'Active'} />
                    <InfoItem label="Capacité (Élèves)" value={school.subscription?.maxStudents?.toString()} />
                    <InfoItem label="Créée le" value={formatDate(school.createdAt)} icon={Calendar} />
                </InfoSection>
            </div>

            {/* Modules Actifs */}
            {school.subscription?.activeModules && school.subscription.activeModules.length > 0 && (
                <InfoSection title="Modules Complémentaires" icon={Layout}>
                    <div className="flex flex-wrap gap-2">
                        {school.subscription.activeModules.map((module) => (
                            <Badge key={module} variant="secondary" className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider capitalize">
                                {module}
                            </Badge>
                        ))}
                    </div>
                </InfoSection>
            )}
        </div>
    );
}
