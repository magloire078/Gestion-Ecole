
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole } from '@/lib/data-types';
import { doc, getDoc } from 'firebase/firestore';

export interface UserProfile extends AppUser {
    permissions?: Partial<AdminRole['permissions']>;
    isAdmin?: boolean;
}

export interface UserContext {
    authUser: FirebaseUser;
    uid: string;
    profile?: UserProfile;
}

const allPermissions: Required<AdminRole['permissions']> = {
    manageUsers: true, viewUsers: true, manageSchools: true, viewSchools: true,
    manageClasses: true, manageGrades: true, manageSystem: true, viewAnalytics: true,
    manageSettings: true, manageBilling: true, manageCommunication: true,
    manageSchedule: true, manageAttendance: true, manageLibrary: true, manageCantine: true,
    manageTransport: true, manageInternat: true, manageInventory: true,
    manageRooms: true, manageActivities: true, manageMedical: true,
    viewSupportTickets: true, manageSupportTickets: true, apiAccess: true,
    exportData: true
};

const rolePermissions: Record<string, Partial<AdminRole['permissions']>> = {
    'directeur': allPermissions,
    'directeur_pedagogique': { manageClasses: true, manageSchedule: true, viewUsers: true, manageGrades: true },
    'enseignant': { viewUsers: true, manageGrades: true, manageAttendance: true },
    'enseignant_principal': { viewUsers: true, manageGrades: true, manageAttendance: true, manageCommunication: true },
    'secretaire': { manageUsers: true, viewUsers: true, manageBilling: true, manageSchedule: true },
    'comptable': { manageBilling: true, viewUsers: true },
    'bibliothecaire': { manageLibrary: true },
    'surveillant': { manageAttendance: true, manageInternat: true },
    'infirmier': { manageMedical: true },
    'chauffeur': { manageTransport: true },
    // Les autres rôles n'ont pas de permissions spéciales par défaut
};


export function useUser() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
        setUser(null);
        setLoading(false);
        return;
    }
    
    const unsubscribe = onIdTokenChanged(auth, async (authUser) => {
        if (authUser) {
            
            const userRootRef = doc(firestore, 'utilisateurs', authUser.uid);
            const userRootSnap = await getDoc(userRootRef);
            
            const isAdmin = userRootSnap.exists() && userRootSnap.data().isAdmin === true;
            const schoolId = userRootSnap.exists() ? userRootSnap.data().schoolId : null;

            let userProfile: UserProfile | undefined = undefined;

            if (schoolId) {
                const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
                const profileSnap = await getDoc(profileRef);
                
                if (profileSnap.exists()) {
                    const profileData = profileSnap.data() as AppUser;
                    
                    userProfile = { 
                        ...profileData, 
                        isAdmin: isAdmin,
                        permissions: rolePermissions[profileData.role] || {}
                    };

                }
            } else if (isAdmin) {
                // Gérer le cas d'un admin de plateforme sans école spécifique
                userProfile = {
                    uid: authUser.uid,
                    email: authUser.email || '',
                    schoolId: '',
                    role: 'directeur', // Traité comme un directeur au niveau de la plateforme
                    firstName: authUser.displayName || 'Admin',
                    lastName: 'Platform',
                    hireDate: '',
                    baseSalary: 0,
                    isAdmin: true,
                    permissions: allPermissions,
                };
            }

            setUser({
                authUser,
                uid: authUser.uid,
                profile: userProfile
            });
        } else {
            setUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return {user, loading};
}
