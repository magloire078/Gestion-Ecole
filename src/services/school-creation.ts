
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
    
    // Vérification critique
    if (user.uid !== schoolData.directorId) {
      console.error("UID mismatch:", { user: user.uid, director: schoolData.directorId });
      throw new Error("Vous devez être le directeur de l'école que vous créez");
    }
    
    // Vérifier si l'utilisateur a déjà une école
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

    // Données de l'école
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

    // Données utilisateur (très simple)
    const userRootData = { 
      schoolId: schoolId,
      updatedAt: serverTimestamp()
    };

    // Profil personnel (CRITIQUE: bien formater les données)
    const staffProfileData = {
      uid: schoolData.directorId, // champ 'uid' en minuscule
      email: schoolData.directorEmail,
      displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
      photoURL: '',
      schoolId: schoolId,
      role: 'directeur', // doit être exactement 'directeur'
      firstName: schoolData.directorFirstName,
      lastName: schoolData.directorLastName,
      hireDate: new Date().toISOString().split('T')[0],
      baseSalary: 0,
      status: 'Actif',
      createdAt: serverTimestamp(),
    };

    // Log système
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
      console.log("🔄 Création batch...");
      const batch = writeBatch(this.db);
      
      // ORDRE CRITIQUE:
      // 1. D'abord l'école (création du document principal)
      batch.set(schoolRef, schoolDocData as any);
      
      // 2. Ensuite le profil personnel (l'utilisateur devient membre)
      batch.set(staffProfileRef, staffProfileData as any);
      
      // 3. Puis l'utilisateur (mise à jour du schoolId)
      batch.set(userRootRef, userRootData as any, { merge: true });
      
      // 4. Enfin le log (enregistrement de l'action)
      batch.set(logRef, logData as any);
      
      console.log("✅ Batch prêt, commit...");
      await batch.commit();
      console.log("✅ Batch réussi!");
      
      // Forcer le rafraîchissement du token pour obtenir les nouveaux claims
      console.log("🔄 Rafraîchissement token...");
      await user.getIdToken(true);
      
      // Petit délai pour la propagation
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
      
      // Log détaillé pour debugging
      console.error("Détails erreur:", {
        code: error.code,
        message: error.message,
        name: error.name
      });
      
      // Suggestions d'erreurs courantes
      if (error.code === 'permission-denied') {
        console.error("🔒 Erreur de permission - Vérifiez:");
        console.error("1. Les règles Firestore sont-elles déployées?");
        console.error("2. L'utilisateur est-il authentifié?");
        console.error("3. Le champ 'role' est-il 'directeur'?");
        console.error("4. Le champ 'uid' correspond-il à l'utilisateur?");
      }
      
      throw new Error(`Échec de la création: ${error.message}`);
    }
  }
}
