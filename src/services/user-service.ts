'use client';

import { Firestore, doc, getDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import type { AppUser, UserProfile, user_root, parent as Parent } from '@/lib/data-types';
import { allPermissions } from '@/lib/permissions';

export async function fetchUserAppData(firestore: Firestore, firebaseUser: FirebaseUser): Promise<AppUser | null> {
    const projectId = (firestore as any)._databaseId?.projectId || (firestore as any).app?.options?.projectId || 'unknown';
    console.log(`[UserService] Starting fetchUserAppData for ${firebaseUser.uid} (Project: ${projectId})`);

    const start = performance.now();
    const userRootRef = doc(firestore, 'users', firebaseUser.uid);
    try {
        let userRootDoc: any;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                userRootDoc = await getDoc(userRootRef);
                break; // Success
            } catch (e: any) {
                attempts++;
                const isOfflineError = e.code === 'unavailable' || e.message?.toLowerCase().includes('offline');
                if (isOfflineError && attempts < maxAttempts) {
                    console.warn(`[UserService] Offline error (attempt ${attempts}), retrying in 2s...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw e; // Rethrow if not offline error or max attempts reached
                }
            }
        }

        console.log(`[UserService] userRoot doc fetched in ${(performance.now() - start).toFixed(2)}ms`);

        if (!userRootDoc.exists()) {
            // Authenticated user but no user_root doc -> needs onboarding
            return {
                uid: firebaseUser.uid,
                authUser: firebaseUser,
                isParent: false,
                schoolId: null,
                schools: {},
                schoolNames: {},
                displayName: firebaseUser.displayName,
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL
            };
        }

        const userData = userRootDoc.data() as user_root;
        const isSuperAdmin = userData.isSuperAdmin === true;
        const schoolAffiliations = userData.schools || {};
        const schoolIds = Object.keys(schoolAffiliations).filter(id => id.length > 10);

        const activeSchoolId = userData.activeSchoolId && schoolAffiliations[userData.activeSchoolId]
            ? userData.activeSchoolId
            : schoolIds[0] || null;

        const activeRole = activeSchoolId ? schoolAffiliations[activeSchoolId] : null;

        // Parallelize fetching of school names and profile
        const schoolNamesPromise = Promise.all(schoolIds.map(async (id) => {
            const rowStart = performance.now();
            try {
                const schoolSnap = await getDoc(doc(firestore, 'ecoles', id));
                console.log(`[UserService] School ${id} fetched in ${(performance.now() - rowStart).toFixed(2)}ms`);
                return { id, name: schoolSnap.exists() ? (schoolSnap.data().name || `École ${id.substring(0, 6)}`) : `Inconnue (${id.substring(0, 6)})` };
            } catch (e) {
                return { id, name: `Erreur (${id.substring(0, 6)})` };
            }
        }));

        let profilePromise: Promise<any> = Promise.resolve(undefined);
        if (activeSchoolId) {
            if (activeRole === 'parent') {
                profilePromise = getDoc(doc(firestore, `ecoles/${activeSchoolId}/parents/${firebaseUser.uid}`));
            } else {
                profilePromise = getDoc(doc(firestore, `ecoles/${activeSchoolId}/personnel/${firebaseUser.uid}`));
            }
        }

        const profileStart = performance.now();
        const [schoolNamesList, profileSnap] = await Promise.all([schoolNamesPromise, profilePromise]);
        console.log(`[UserService] Parallel fetches completed in ${(performance.now() - profileStart).toFixed(2)}ms`);

        const schoolNames: { [key: string]: string } = {};
        schoolNamesList.forEach(item => { schoolNames[item.id] = item.name; });

        if (activeSchoolId && activeRole === 'parent') {
            const parentData = profileSnap?.exists() ? (profileSnap.data() as Parent) : null;

            return {
                uid: firebaseUser.uid,
                authUser: firebaseUser,
                isParent: true,
                schoolId: activeSchoolId,
                schools: schoolAffiliations,
                schoolNames: schoolNames,
                parentStudentIds: parentData?.studentIds || [],
                displayName: parentData?.displayName || firebaseUser.displayName,
                email: firebaseUser.email,
                photoURL: parentData?.photoURL || firebaseUser.photoURL,
            };
        } else {
            let userProfile: UserProfile | undefined = undefined;

            if (activeSchoolId && profileSnap?.exists()) {
                userProfile = profileSnap.data() as UserProfile;

                if (userProfile.role === 'directeur') {
                    userProfile.permissions = allPermissions;
                } else if (userProfile.adminRole) {
                    const roleSnap = await getDoc(doc(firestore, `ecoles/${activeSchoolId}/admin_roles/${userProfile.adminRole}`));
                    if (roleSnap.exists()) {
                        userProfile.permissions = roleSnap.data().permissions;
                    }
                }
            }

            if (isSuperAdmin) {
                if (!userProfile) userProfile = {} as UserProfile;
                userProfile.isAdmin = true;
                userProfile.isSuperAdmin = true;
            }

            return {
                uid: firebaseUser.uid,
                authUser: firebaseUser,
                isParent: false,
                schoolId: activeSchoolId,
                schools: schoolAffiliations,
                schoolNames: schoolNames,
                profile: userProfile,
                displayName: userProfile?.displayName || firebaseUser.displayName,
                email: firebaseUser.email,
                photoURL: userProfile?.photoURL || firebaseUser.photoURL,
            };
        }

    } catch (error) {
        console.error("Error fetching user data in service:", error);
        return null;
    }
}
