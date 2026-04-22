'use client';

import { useCallback, useMemo } from 'react';
import { useUser } from './use-user';
import { useSchoolData } from './use-school-data';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from './use-toast';

export function useUserSession() {
    const { user, loading: userLoading, schoolId, isDirector, setActiveSchool: setUserActiveSchool, loadingTimeout, reloadUser } = useUser();
    const { schoolData, subscription, loading: schoolLoading, error: schoolError } = useSchoolData();
    const auth = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const isLoading = userLoading || (user && !user.isParent && (schoolLoading || !schoolData));

    const handleParentLogout = useCallback(() => {
        localStorage.removeItem('parent_session_id');
        localStorage.removeItem('parent_school_id');
        localStorage.removeItem('parent_student_ids');
        toast({ title: "Déconnexion réussie", description: "Vous avez quitté le portail parent." });
        router.push('/parent-access');
        router.refresh();
    }, [router, toast]);

    const handleRegularLogout = useCallback(async () => {
        try {
            await signOut(auth);
            // Clean up sensitive localStorage data
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('firebase:') || key.startsWith('parent_')) {
                    localStorage.removeItem(key);
                }
            });
            toast({
                title: "Déconnexion réussie",
                description: "Vous avez été déconnecté(e).",
            });
            router.push('/auth/login');
        } catch (error) {
            console.error("Logout error: ", error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de se déconnecter. Veuillez réessayer.",
            });
        }
    }, [auth, router, toast]);

    const logout = useCallback(() => {
        if (user?.isParent) {
            handleParentLogout();
        } else {
            handleRegularLogout();
        }
    }, [user?.isParent, handleParentLogout, handleRegularLogout]);

    const isSuperAdmin = useMemo(() => user?.profile?.isAdmin === true, [user?.profile?.isAdmin]);

    const displayName = useMemo(() => user?.displayName || 'Utilisateur', [user?.displayName]);

    const userRole = useMemo(() => {
        if (!user) return '';
        if (user.isParent) return 'Portail Parent';
        if (isSuperAdmin) return 'Super Administrateur';
        return isDirector ? 'Directeur' : user?.profile?.role || 'Membre';
    }, [user, isSuperAdmin, isDirector]);

    const initials = useMemo(() => {
        if (!displayName) return 'U';
        return displayName
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }, [displayName]);

    const planName = useMemo(() => {
        if (isSuperAdmin) return null;
        return subscription?.plan || 'Gratuit';
    }, [isSuperAdmin, subscription?.plan]);

    const switchSchool = useCallback(async (schoolId: string) => {
        await setUserActiveSchool(schoolId);
        toast({ title: "Changement d'établissement", description: "Vous avez changé d'établissement avec succès." });
    }, [setUserActiveSchool, toast]);

    return {
        user,
        schoolId,
        schoolData,
        subscription,
        isSubscriptionActive: useMemo(() => {
            if (isSuperAdmin) return true;
            if (!subscription?.endDate) return false;
            return (subscription.status === 'active' || subscription.status === 'trialing') && new Date(subscription.endDate) > new Date();
        }, [isSuperAdmin, subscription]),
        subscriptionStatus: useMemo(() => {
            if (isSuperAdmin) return 'active';
            if (!subscription?.endDate) return 'none';
            const isExpired = new Date(subscription.endDate) < new Date();
            if (isExpired) return 'expired';
            const diff = new Date(subscription.endDate).getTime() - new Date().getTime();
            const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if (daysLeft <= 7) return 'warning';
            return 'active';
        }, [isSuperAdmin, subscription]),
        daysRemaining: useMemo(() => {
            if (!subscription?.endDate) return 0;
            const diff = new Date(subscription.endDate).getTime() - new Date().getTime();
            return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }, [subscription]),
        isLoading,
        isDirector,
        isSuperAdmin,
        displayName,
        userRole,
        initials,
        planName,
        schoolError,
        logout,
        switchSchool,
        loadingTimeout,
        reloadUser,
    };
}
