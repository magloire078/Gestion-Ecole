
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
import type { school, user_root, staff, admin_role, system_log } from '@/lib/data-types';
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
    console.log("🚀 Début création école");
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error("Vous devez être connecté pour créer une école");
    }
    
    if (user.uid !== schoolData.directorId) {
      console.error("UID mismatch:", { user: user.uid, director: schoolData.directorId });
      throw new Error("Vous devez être le directeur de l'école que vous créez");
    }
    
    console.log("📋 Vérification école existante...");
    const q = query(
      collection(this.db, "ecoles"), 
      where("directorId", "==", schoolData.directorId), 
      limit(1)
    );
    
    const existingSchoolSnap = await getDocs(q);
    if (!existingSchoolSnap.empty) {
      const existingSchool = existingSchoolSnap.docs[0].data();
      throw new Error(`Vous êtes déjà directeur/rice de l'école "${existingSchool.name}".`);
    }

    const schoolRef = doc(collection(this.db, 'ecoles'));
    const schoolId = schoolRef.id;
    const schoolCode = generateSchoolCode(schoolData.name);
    
    console.log("✅ ID école généré:", schoolId);
    console.log("✅ Code école:", schoolCode);
    
    const userRootRef = doc(this.db, `utilisateurs/${schoolData.directorId}`);
    const staffProfileRef = doc(this.db, `ecoles/${schoolId}/personnel/${schoolData.directorId}`);
    const logRef = doc(collection(this.db, 'system_logs'));

    const schoolDocData = {
      name: schoolData.name,
      address: schoolData.address,
      phone: schoolData.phone || '',
      email: schoolData.email || '',
      schoolCode: schoolCode,
      directorId: schoolData.directorId,
      directorFirstName: schoolData.directorFirstName,
      directorLastName: schoolData.directorLastName,
      createdAt: serverTimestamp(),
      mainLogoUrl: schoolData.mainLogoUrl || '',
      subscription: {
        plan: 'Essentiel',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        maxStudents: 50,
        maxCycles: 2,
        activeModules: [],
      },
      status: 'active',
    };

    const userRootData = { 
      schoolId: schoolId,
      updatedAt: serverTimestamp()
    };

    const staffProfileData = {
      uid: schoolData.directorId,
      email: schoolData.directorEmail,
      displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
      photoURL: '',
      schoolId: schoolId,
      role: 'directeur',
      firstName: schoolData.directorFirstName,
      lastName: schoolData.directorLastName,
      hireDate: new Date().toISOString().split('T')[0],
      baseSalary: 0,
      status: 'Actif',
      createdAt: serverTimestamp(),
    };

    const logData = {
      adminId: schoolData.directorId,
      action: 'school.created',
      target: schoolRef.path,
      details: { 
        schoolName: schoolData.name,
        schoolId: schoolId,
      },
      ipAddress: 'N/A (client-side)',
      userAgent: 'N/A (client-side)',
      timestamp: serverTimestamp(),
    };

    try {
      console.log("🔄 Étape 1: Création du document école...");
      await setDoc(schoolRef, schoolDocData as any);
      console.log("✅ Document école créé.");

      console.log("🔄 Étape 2: Création des documents liés (personnel, utilisateur, log)...");
      const subsequentBatch = writeBatch(this.db);
      subsequentBatch.set(staffProfileRef, staffProfileData as any);
      subsequentBatch.set(userRootRef, userRootData as any, { merge: true });
      subsequentBatch.set(logRef, logData as any);
      await subsequentBatch.commit();
      console.log("✅ Documents liés créés.");
      
      console.log("🔄 Rafraîchissement token...");
      await user.getIdToken(true);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("🎉 Création terminée avec succès!");
      
      return { 
        schoolId, 
        schoolCode,
        success: true,
        message: "École créée avec succès!"
      };
      
    } catch (error: any) {
      console.error("❌ Erreur lors de la création:", error);
      console.error("Détails erreur:", { code: error.code, message: error.message, name: error.name });
      
      if (error.code === 'permission-denied') {
        console.error("🔒 Erreur de permission - Vérifiez les règles Firestore.");
      }
      
      throw new Error(`Échec de la création: ${error.message}`);
    }
  }
}
