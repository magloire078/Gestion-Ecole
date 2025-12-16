
'use client';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { SCHOOL_TEMPLATES } from '@/lib/templates';
import type { school, user_root, staff, cycle, niveau, subject, admin_role } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

interface SchoolCreationData {
    name: string;
    address: string;
    mainLogoUrl: string;
    phone: string;
    email: string;
    directorId: string;
    directorFirstName: string;
    directorLastName: string;
    directorEmail: string;
}

const generateSchoolCode = (name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase();
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNumber}`;
};

const getAllPermissions = (value: boolean) => ({
    manageUsers: value, viewUsers: value, manageSchools: value, viewSchools: value,
    manageClasses: value, manageGrades: value, manageSystem: value, viewAnalytics: value,
    manageSettings: value, manageBilling: value, manageCommunication: value,
    manageSchedule: value, manageAttendance: value, manageLibrary: value, manageCantine: value,
    manageTransport: value, manageInternat: value, manageInventory: value,
    manageRooms: value, manageActivities: value, manageMedical: value,
    viewSupportTickets: value, manageSupportTickets: value, apiAccess: value,
    exportData: value
});

const DEFAULT_ROLES: Omit<admin_role, 'id' | 'schoolId' | 'level'>[] = [
  {
    name: 'Directeur',
    description: 'Accès complet à toutes les fonctionnalités',
    permissions: getAllPermissions(true),
    isSystem: true,
  },
  {
    name: 'Enseignant Principal',
    description: 'Gestion complète d\'une classe',
    permissions: { viewUsers: true, manageGrades: true, manageAttendance: true, manageCommunication: true },
    isSystem: true,
  },
  {
    name: 'Enseignant',
    description: 'Enseignant par matière spécifique',
    permissions: { viewUsers: true, manageGrades: true, manageAttendance: true },
    isSystem: true,
  },
  {
    name: 'Secrétariat',
    description: 'Gestion administrative des élèves et de la facturation',
    permissions: { viewUsers: true, manageUsers: true, manageBilling: true, manageSchedule: true },
    isSystem: true,
  },
  {
    name: 'Comptable',
    description: 'Gestion financière et facturation',
    permissions: { manageBilling: true },
    isSystem: true,
  }
];


export class SchoolCreationService {
  private db: Firestore;

  constructor(firestore: Firestore) {
    this.db = firestore;
  }

  async createSchool(schoolData: SchoolCreationData) {
    const schoolRef = doc(collection(this.db, 'ecoles'));
    const schoolId = schoolRef.id;
    const schoolCode = generateSchoolCode(schoolData.name);
    
    const batch = writeBatch(this.db);

    // 1. Create the main school document
    const schoolDocData: Omit<school, 'id'> = {
      name: schoolData.name,
      address: schoolData.address,
      phone: schoolData.phone,
      email: schoolData.email,
      schoolCode: schoolCode,
      directorId: schoolData.directorId,
      directorFirstName: schoolData.directorFirstName,
      directorLastName: schoolData.directorLastName,
      createdAt: serverTimestamp() as any,
      mainLogoUrl: schoolData.mainLogoUrl,
      subscription: {
        plan: 'Essentiel',
        status: 'trialing',
        maxStudents: 50,
        maxCycles: 2,
      }
    };
    batch.set(schoolRef, schoolDocData);

    // 2. Add user to the /utilisateurs collection
    const userRef = doc(this.db, 'utilisateurs', schoolData.directorId);
    const userRootData: user_root = { schoolId };
    batch.set(userRef, userRootData);

    // 3. Create a staff profile for the director
    const staffRef = doc(this.db, `ecoles/${schoolId}/personnel`, schoolData.directorId);
    const directorProfileData: Omit<staff, 'id'> = {
        uid: schoolData.directorId,
        schoolId: schoolId,
        role: 'directeur',
        adminRole: 'directeur', // The ID for the director role
        firstName: schoolData.directorFirstName,
        lastName: schoolData.directorLastName,
        displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
        email: schoolData.directorEmail,
        hireDate: new Date().toISOString(),
        baseSalary: 0,
        status: 'Actif',
    };
    batch.set(staffRef, directorProfileData);

    // 4. Initialize school structure (Cycles and Niveaux)
    const template = SCHOOL_TEMPLATES.IVORIAN_SYSTEM;

    for (const cycle of template.cycles) {
        const cycleRef = doc(collection(this.db, `ecoles/${schoolId}/cycles`));
        const cycleData: Omit<cycle, 'id'> = { ...cycle, schoolId, isActive: true, createdAt: new Date().toISOString() };
        batch.set(cycleRef, cycleData);
        
        const niveauxForCycle = template.niveaux[cycle.name as keyof typeof template.niveaux] || [];
        
        for (const [index, niveauName] of niveauxForCycle.entries()) {
            const niveauRef = doc(collection(this.db, `ecoles/${schoolId}/niveaux`));
            const niveauData: Omit<niveau, 'id'> = {
                name: niveauName,
                code: niveauName.replace(/\s+/g, '').toUpperCase(),
                cycleId: cycleRef.id,
                schoolId: schoolId,
                order: index + 1,
                ageMin: 5,
                ageMax: 6,
                capacity: 30,
                createdAt: new Date().toISOString()
            };
            batch.set(niveauRef, niveauData);
        }
    }
    
    // 5. Initialize default subjects
    for (const subject of template.subjects) {
      const subjectRef = doc(collection(this.db, `ecoles/${schoolId}/matieres`));
      const subjectData: Omit<subject, 'id'> = { ...subject, schoolId };
      batch.set(subjectRef, subjectData);
    }
    
    // 6. Create default roles for the school
    DEFAULT_ROLES.forEach(role => {
        const roleId = role.name.toLowerCase().replace(/ /g, '_');
        const roleRef = doc(this.db, `ecoles/${schoolId}/admin_roles`, roleId);
        batch.set(roleRef, { ...role, schoolId, level: 0 });
    });
    
    return batch.commit().then(() => {
        return { schoolId, schoolCode };
    }).catch(e => {
         const permissionError = new FirestorePermissionError({
            path: `[BATCH WRITE] /ecoles/${schoolId}`,
            operation: 'create',
            requestResourceData: { schoolName: schoolData.name, director: schoolData.directorId },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw e;
    });
  }
}
