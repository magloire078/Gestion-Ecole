
'use client';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { school, user_root, staff, admin_role } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export interface CreateSchoolData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  mainLogoUrl?: string;
  directorId: string;
  directorFirstName: string;
  directorLastName: string;
  directorEmail: string;
}

export interface CreateSchoolResult {
  success: boolean;
  schoolId?: string;
  schoolCode?: string;
  error?: string;
}

export class SchoolCreationService {
  constructor(private firestore: Firestore) {}

  private generateSchoolCode(name: string): string {
    const prefix = name.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNumber}`;
  }

  private getDirectorPermissions() {
    return {
      manageUsers: true, viewUsers: true, manageClasses: true, manageGrades: true, manageDiscipline: true, manageSettings: true, manageBilling: true, manageCommunication: true, manageSchedule: true, manageAttendance: true, manageLibrary: true, manageCantine: true, manageTransport: true, manageInternat: true, manageInventory: true, manageRooms: true, manageActivities: true, manageMedical: true, viewSupportTickets: true, manageSupportTickets: true, apiAccess: true, exportData: true,
    };
  }

  async createSchool(data: CreateSchoolData): Promise<CreateSchoolResult> {
    const batch = writeBatch(this.firestore);
    
    try {
      // 1. Créer le document ÉCOLE
      const schoolRef = doc(collection(this.firestore, 'ecoles'));
      const schoolId = schoolRef.id;
      const schoolCode = this.generateSchoolCode(data.name);
      
      const schoolDoc: school = {
        name: data.name,
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        schoolCode: schoolCode,
        directorId: data.directorId,
        directorFirstName: data.directorFirstName,
        directorLastName: data.directorLastName,
        directorEmail: data.directorEmail,
        createdAt: new Date().toISOString(),
        mainLogoUrl: data.mainLogoUrl || '',
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
      const directorRoleRef = doc(collection(this.firestore, `ecoles/${schoolId}/admin_roles`));
      const directorRoleData: Omit<admin_role, 'id'> = {
          name: 'Directeur',
          description: 'Accès complet à toutes les fonctionnalités de l\'école.',
          schoolId: schoolId,
          isSystem: true,
          permissions: this.getDirectorPermissions()
      };
      batch.set(directorRoleRef, directorRoleData);

      // 3. Mettre à jour le document racine de l'UTILISATEUR
      const userRef = doc(this.firestore, 'users', data.directorId);
      const userDoc: user_root = {
        schools: [{ schoolId: schoolId, role: 'directeur' }],
        activeSchoolId: schoolId,
        isSuperAdmin: false,
      };
      batch.set(userRef, userDoc, { merge: true });
      
      // 4. Créer le profil PERSONNEL pour le directeur
      const staffProfileRef = doc(this.firestore, `ecoles/${schoolId}/personnel`, data.directorId);
      const staffProfileData: Omit<staff, 'id'> = {
          uid: data.directorId,
          email: data.directorEmail,
          displayName: `${data.directorFirstName} ${data.directorLastName}`,
          photoURL: '',
          schoolId: schoolId,
          role: 'directeur',
          adminRole: directorRoleRef.id,
          firstName: data.directorFirstName,
          lastName: data.directorLastName,
          hireDate: new Date().toISOString().split('T')[0],
          baseSalary: 0,
          status: 'Actif',
      };
      batch.set(staffProfileRef, staffProfileData);

      await batch.commit();
      
      return {
        success: true,
        schoolId,
        schoolCode,
      };
      
    } catch (error: any) {
      console.error("Erreur détaillée:", error);
      
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: '[BATCH] /ecoles & /users & /personnel',
          operation: 'write'
      }));
      
      return {
        success: false,
        error: error.message || 'Erreur inconnue lors de la création'
      };
    }
  }
}
