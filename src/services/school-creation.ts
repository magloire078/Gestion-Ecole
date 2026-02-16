

'use client';
import { Firestore } from 'firebase/firestore';
import type { school as SchoolData, user_root, staff } from '@/lib/data-types';
import { doc, writeBatch, collection, serverTimestamp, getDocs, query, where, QueryDocumentSnapshot } from 'firebase/firestore';

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
  constructor(private firestore: Firestore) { }

  async createSchool(data: CreateSchoolData): Promise<CreateSchoolResult> {
    try {
      // 0. Vérification de la restriction (Abonnement requis pour > 1 école)
      const schoolsSnapshot = await getDocs(
        query(collection(this.firestore, 'ecoles'), where('directorId', '==', data.directorId))
      );

      if (!schoolsSnapshot.empty) {
        const hasActiveSubscription = schoolsSnapshot.docs.some((doc: QueryDocumentSnapshot) => {
          const school = doc.data() as SchoolData;
          return school.subscription?.status === 'active';
        });

        if (!hasActiveSubscription) {
          return {
            success: false,
            error: "SUBSCRIPTION_REQUIRED: Vous devez avoir au moins un établissement avec un abonnement actif pour créer une nouvelle école. L'école actuelle est toujours en période d'essai."
          };
        }
      }

      // Import dynamique pour éviter les problèmes de SSR
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
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        mainLogoUrl: data.mainLogoUrl || '',
        website: '',
        directorId: data.directorId,
        directorFirstName: data.directorFirstName || '',
        directorLastName: data.directorLastName || '',
        directorEmail: data.directorEmail || '',
        schoolCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
      batch.update(userRef, {
        [`schools.${schoolId}`]: 'directeur',
        activeSchoolId: schoolId,
      });

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

      // 6. Envoyer l'email de bienvenue
      try {
        const { MailService } = await import('./mail-service');
        const mailService = new MailService(this.firestore);
        await mailService.sendWelcomeEmail(
          data.directorEmail,
          data.directorFirstName,
          data.name
        );
      } catch (mailError) {
        console.error("Failed to send welcome email:", mailError);
        // On ne bloque pas la réussite de la création pour une erreur d'email
      }

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
