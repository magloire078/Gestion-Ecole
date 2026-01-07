
'use client';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp,
  setDoc,
  getDocs,
  query,
  where,
  limit
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { school, user_root, staff, system_log } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { getAuth } from 'firebase/auth';

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

export class SchoolCreationService {
  private db: Firestore;

  constructor(firestore: Firestore) {
    this.db = firestore;
  }
  
  async createSchool(schoolData: SchoolCreationData) {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error("Utilisateur non connecté");
    }
    
    // Vérification UID
    if (user.uid !== schoolData.directorId) {
      throw new Error("L'utilisateur ne correspond pas au directeur");
    }
    
    const batch = writeBatch(this.db);
    
    try {
      // 1. Créer le document ÉCOLE
      const schoolRef = doc(collection(this.db, 'ecoles'));
      const schoolId = schoolRef.id;
      const schoolCode = generateSchoolCode(schoolData.name);
      
      const schoolDoc: Omit<school, 'id'> = {
        name: schoolData.name,
        address: schoolData.address || '',
        phone: schoolData.phone || '',
        email: schoolData.email || '',
        schoolCode: schoolCode,
        directorId: schoolData.directorId,
        directorFirstName: schoolData.directorFirstName,
        directorLastName: schoolData.directorLastName,
        directorPhone: user.phoneNumber || '',
        createdAt: new Date().toISOString(),
        mainLogoUrl: schoolData.mainLogoUrl || '',
        status: 'active',
        isSetupComplete: false, // Initialisé à false
        subscription: {
          plan: 'Essentiel',
          status: 'trialing',
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(), // 30 jours d'essai
          maxStudents: 50,
          maxCycles: 5,
        }
      };
      
      batch.set(schoolRef, schoolDoc);

      // 2. Mettre à jour le document racine de l'UTILISATEUR
      const userRef = doc(this.db, `utilisateurs/${schoolData.directorId}`);
      
      const userDoc: user_root = {
        schoolId: schoolId,
      };
      
      batch.set(userRef, userDoc);
      
      // 3. Créer le profil PERSONNEL pour le directeur
      const staffProfileRef = doc(this.db, `ecoles/${schoolId}/personnel/${user.uid}`);
      const staffProfileData: Omit<staff, 'id'> = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
          photoURL: user.photoURL || '',
          schoolId: schoolId,
          role: 'directeur',
          firstName: schoolData.directorFirstName,
          lastName: schoolData.directorLastName,
          hireDate: new Date().toISOString().split('T')[0],
          baseSalary: 0,
          status: 'Actif',
      };
      batch.set(staffProfileRef, staffProfileData);

      // 4. Exécuter le batch
      await batch.commit();

      // 5. Rafraîchir le token pour inclure le schoolId dans les claims (côté serveur)
      await user.getIdToken(true);
      
      return {
        schoolId,
        schoolCode,
        success: true,
        message: "École créée avec succès!"
      };
      
    } catch (error: any) {
      console.error("❌ ERREUR DÉTAILLÉE:", {
        name: error.name,
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: '[BATCH] /ecoles & /utilisateurs & /personnel',
          operation: 'write'
      }));
      
      throw new Error(`Échec création: ${error.message}`);
    }
  }
}
