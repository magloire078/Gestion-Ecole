
'use client';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { school, user_root, staff, admin_role } from '@/lib/data-types';
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
    const prefix = name.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNumber}`;
};

export class SchoolCreationService {
  private db: Firestore;

  constructor(firestore: Firestore) {
    this.db = firestore;
  }
  
  async createSchool(schoolData: SchoolCreationData) {
    const batch = writeBatch(this.db);
    
    try {
      // 1. Créer le document ÉCOLE
      const schoolRef = doc(collection(this.db, 'ecoles'));
      const schoolId = schoolRef.id;
      const schoolCode = generateSchoolCode(schoolData.name);
      
      const schoolDoc: school = {
        name: schoolData.name,
        address: schoolData.address || '',
        phone: schoolData.phone || '',
        email: schoolData.email || '',
        schoolCode: schoolCode,
        directorId: schoolData.directorId,
        directorFirstName: schoolData.directorFirstName,
        directorLastName: schoolData.directorLastName,
        directorEmail: schoolData.directorEmail,
        directorPhone: schoolData.phone,
        createdAt: new Date().toISOString(),
        mainLogoUrl: schoolData.mainLogoUrl || '',
        status: 'active',
        isSetupComplete: false,
        subscription: {
          plan: 'Essentiel',
          status: 'trialing',
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
          maxStudents: 50,
          maxCycles: 5,
        }
      };
      
      batch.set(schoolRef, schoolDoc);

      // 2. Créer le rôle système "Directeur"
      const directorRoleRef = doc(collection(this.db, `ecoles/${schoolId}/admin_roles`));
      const directorRoleData: Omit<admin_role, 'id'> = {
          name: 'Directeur',
          description: 'Accès complet à toutes les fonctionnalités de l\'école.',
          schoolId: schoolId,
          isSystem: true,
          permissions: { manageUsers: true, viewUsers: true, manageClasses: true, manageGrades: true, manageDiscipline: true, manageSettings: true, manageBilling: true, manageCommunication: true, manageSchedule: true, manageAttendance: true, manageLibrary: true, manageCantine: true, manageTransport: true, manageInternat: true, manageInventory: true, manageRooms: true, manageActivities: true, manageMedical: true, viewSupportTickets: true, manageSupportTickets: true }
      };
      batch.set(directorRoleRef, directorRoleData);

      // 3. Mettre à jour le document racine de l'UTILISATEUR
      const userRef = doc(this.db, 'users', schoolData.directorId);
      const userDoc: user_root = {
        schoolId: schoolId,
        isAdmin: false, // Default to false
      };
      batch.set(userRef, userDoc, { merge: true });
      
      // 4. Créer le profil PERSONNEL pour le directeur
      const staffProfileRef = doc(this.db, `ecoles/${schoolId}/personnel`, schoolData.directorId);
      const staffProfileData: Omit<staff, 'id'> = {
          uid: schoolData.directorId, // Ajout de l'UID
          email: schoolData.directorEmail,
          displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
          photoURL: '',
          schoolId: schoolId,
          role: 'directeur',
          adminRole: directorRoleRef.id,
          firstName: schoolData.directorFirstName,
          lastName: schoolData.directorLastName,
          hireDate: new Date().toISOString().split('T')[0],
          baseSalary: 0,
          status: 'Actif',
      };
      batch.set(staffProfileRef, staffProfileData);

      await batch.commit();
      
      return {
        schoolId,
        schoolCode,
        success: true,
        message: "École créée avec succès!"
      };
      
    } catch (error: any) {
      console.error("Erreur détaillée:", error);
      
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: '[BATCH] /ecoles & /users & /personnel',
          operation: 'write'
      }));
      
      throw new Error(`Échec de la création: ${error.message}`);
    }
  }
}
