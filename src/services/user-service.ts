'use client';

import { Firestore, doc, getDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import type { AppUser, UserProfile, user_root, parent as Parent } from '@/lib/data-types';
import { allPermissions } from '@/lib/permissions';

export async function fetchUserAppData(firestore: Firestore, firebaseUser: FirebaseUser): Promise<AppUser | null> {
    const userRootRef = doc(firestore, 'users', firebaseUser.uid);
    try {
        const userRootDoc = await getDoc(userRootRef);

        if (!userRootDoc.exists()) {
            // Authenticated user but no user_root doc -> needs onboarding
            return { 
                uid: firebaseUser.uid, 
                authUser: firebaseUser, 
                isParent: false, 
                schoolId: null, 
                schools: {}, 
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

        if (activeSchoolId && activeRole === 'parent') {
            const parentProfileRef = doc(firestore, `ecoles/${activeSchoolId}/parents/${firebaseUser.uid}`);
            const parentProfileSnap = await getDoc(parentProfileRef);
            const parentData = parentProfileSnap.data() as Parent;
            
            return {
                uid: firebaseUser.uid,
                authUser: firebaseUser,
                isParent: true,
                schoolId: activeSchoolId,
                schools: schoolAffiliations,
                parentStudentIds: parentData?.studentIds || [],
                displayName: parentData?.displayName || firebaseUser.displayName,
                email: firebaseUser.email,
                photoURL: parentData?.photoURL || firebaseUser.photoURL,
            };
        } else {
            let userProfile: UserProfile | undefined = undefined;

            if (activeSchoolId) {
                const staffProfileRef = doc(firestore, `ecoles/${activeSchoolId}/personnel/${firebaseUser.uid}`);
                const profileSnap = await getDoc(staffProfileRef);
                if (profileSnap.exists()) {
                    userProfile = profileSnap.data() as UserProfile;

                    if (userProfile.role === 'directeur') {
                        userProfile.permissions = allPermissions;
                    } else if (userProfile.adminRole) {
                        const roleRef = doc(firestore, `ecoles/${activeSchoolId}/admin_roles/${userProfile.adminRole}`);
                        const roleSnap = await getDoc(roleRef);
                        if (roleSnap.exists()) {
                            userProfile.permissions = roleSnap.data().permissions;
                        }
                    }
                }
            }
            
            if (isSuperAdmin) {
                if (!userProfile) userProfile = {} as UserProfile;
                userProfile.isAdmin = true;
            }
            
            return {
                uid: firebaseUser.uid,
                authUser: firebaseUser,
                isParent: false,
                schoolId: activeSchoolId,
                schools: schoolAffiliations,
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
