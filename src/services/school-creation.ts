

'use client';
import { Firestore } from 'firebase/firestore';
import type { school as SchoolData, user_root, staff } from '@/lib/data-types';

export interface CreateSchoolData {
  name: string;
  drena?: string;
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

  async createSchool(data: CreateSchoolData): Promise<CreateSchoolResult> {
    try {
      // Import dynamique pour éviter les problèmes de SSR
      const { doc, writeBatch, collection, serverTimestamp } = await import('firebase/firestore');
      const { getStorage, ref, uploadString } = await import('firebase/storage');
      
      const batch = writeBatch(this.firestore);

      // 1. Générer un ID et un code d'école
      const schoolRef = doc(collection(this.firestore, 'ecoles'));
      const schoolId = schoolRef.id;
      const schoolCode = this.generateSchoolCode(data.name);
      
      // 2. Créer le document de l'école
      const schoolData: Omit<SchoolData, 'id'> = {
        name: data.name,
        drena: data.drena,
        address: data.address,
        phone: data.phone,
        email: data.email,
        mainLogoUrl: data.mainLogoUrl,
        directorId: data.directorId,
        directorFirstName: data.directorFirstName,
        directorLastName: data.directorLastName,
        directorEmail: data.directorEmail,
        schoolCode,
        createdAt: new Date().toISOString(),
        status: 'active',
        subscription: {
          plan: 'Essentiel',
          status: 'trialing',
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
        }
      };
      
      batch.set(schoolRef, schoolData);
      
      // 3. Mettre à jour l'utilisateur
      const userRef = doc(this.firestore, 'users', data.directorId);
      const userRootData: user_root = {
        schools: { [schoolId]: 'directeur' },
        activeSchoolId: schoolId,
      };
      batch.set(userRef, userRootData, { merge: true });
      
      // 4. Créer le profil personnel (staff)
      const personnelRef = doc(this.firestore, 'ecoles', schoolId, 'personnel', data.directorId);
      
      const personnelData: Omit<staff, 'id'> = {
        uid: data.directorId,
        schoolId,
        firstName: data.directorFirstName,
        lastName: data.directorLastName,
        displayName: `${data.directorFirstName} ${data.directorLastName}`,
        email: data.directorEmail,
        role: 'directeur',
        status: "Actif",
        hireDate: new Date().toISOString().split('T')[0],
        baseSalary: 0,
        photoURL: '',
      };
      
      batch.set(personnelRef, personnelData);
      
      await batch.commit();

      // 5. Créer un fichier placeholder pour initialiser le dossier de l'école dans Storage
      const storage = getStorage(this.firestore.app);
      const placeholderPath = `ecoles/${schoolId}/.placeholder`;
      const placeholderRef = ref(storage, placeholderPath);
      await uploadString(placeholderRef, 'Init').catch(err => {
        // Log l'erreur mais ne pas faire échouer la création de l'école
        console.warn(`Could not create storage placeholder for school ${schoolId}:`, err);
      });
      
      return {
        success: true,
        schoolId,
        schoolCode
      };
      
    } catch (error: any) {
       console.error("Error creating school: ", error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue lors de la création'
      };
    }
  }

  private generateSchoolCode(name: string): string {
    const prefix = name.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNumber}`;
  }
}
