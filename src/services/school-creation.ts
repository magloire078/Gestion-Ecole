

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

  async createSchoolSimple(schoolData: SchoolCreationData) {
    console.log("=== CRÉATION SIMPLIFIÉE ===");
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error("❌ Utilisateur non connecté");
    }
    
    console.log("User:", user.uid);
    console.log("Director:", schoolData.directorId);
    
    // Vérification UID
    if (user.uid !== schoolData.directorId) {
      throw new Error("❌ L'utilisateur ne correspond pas au directeur");
    }
    
    const batch = writeBatch(this.db);
    
    try {
      // 1. CRÉER L'ÉCOLE
      console.log("Étape 1: Création école...");
      const schoolRef = doc(collection(this.db, 'ecoles'));
      const schoolId = schoolRef.id;
      const schoolCode = generateSchoolCode(schoolData.name);
      
      const schoolDoc = {
        name: schoolData.name,
        address: schoolData.address || '',
        phone: schoolData.phone || '',
        email: schoolData.email || '',
        schoolCode: schoolCode,
        directorId: schoolData.directorId,
        directorFirstName: schoolData.directorFirstName,
        directorLastName: schoolData.directorLastName,
        createdAt: serverTimestamp(),
        mainLogoUrl: schoolData.mainLogoUrl || '',
        status: 'active',
      };
      batch.set(schoolRef, schoolDoc);
      console.log("✅ École planifiée:", schoolId);

      // 2. CRÉER LE RÔLE "SUPER ADMIN" PAR DÉFAUT
      console.log("Étape 2: Création rôle Super Admin...");
      const adminRoleRef = doc(collection(this.db, `ecoles/${schoolId}/admin_roles`));
      const adminRoleId = adminRoleRef.id;
      batch.set(adminRoleRef, {
          name: 'Super Admin',
          description: 'Accès complet à toutes les fonctionnalités de l\'école.',
          isSystem: true,
          schoolId: schoolId,
          permissions: { manageUsers: true, viewUsers: true, manageClasses: true, manageGrades: true, manageSystem: true, viewAnalytics: true, manageSettings: true, manageBilling: true, manageCommunication: true, manageSchedule: true, manageAttendance: true, manageLibrary: true, manageCantine: true, manageTransport: true, manageInternat: true, manageInventory: true, manageRooms: true, manageActivities: true, manageMedical: true }
      });
      console.log("✅ Rôle Super Admin planifié:", adminRoleId);
      
      // 3. CRÉER LE PROFIL PERSONNEL DU DIRECTEUR
      console.log("Étape 3: Création profil personnel...");
      const staffProfileRef = doc(this.db, `ecoles/${schoolId}/personnel/${schoolData.directorId}`);
      
      const staffProfile = {
        uid: schoolData.directorId,
        email: schoolData.directorEmail,
        displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
        photoURL: '',
        schoolId: schoolId,
        role: 'directeur',
        adminRole: adminRoleId, // Assigner le rôle Super Admin au directeur
        firstName: schoolData.directorFirstName,
        lastName: schoolData.directorLastName,
        hireDate: new Date().toISOString().split('T')[0],
        baseSalary: 0,
        status: 'Actif',
        createdAt: serverTimestamp(),
      };
      batch.set(staffProfileRef, staffProfile);
      console.log("✅ Profil créé et rôle assigné");
      
      // 4. Mettre à jour L'UTILISATEUR
      console.log("Étape 4: Mise à jour utilisateur...");
      const userRef = doc(this.db, `utilisateurs/${schoolData.directorId}`);
      const userDoc = { schoolId: schoolId, updatedAt: serverTimestamp() };
      batch.set(userRef, userDoc, { merge: true });
      console.log("✅ Utilisateur mis à jour");
      
      // 5. Créer le LOG
      console.log("Étape 5: Création log...");
      const logRef = doc(collection(this.db, 'system_logs'));
      const logDoc = {
        adminId: schoolData.directorId,
        action: 'school.created',
        target: schoolRef.path,
        details: { schoolName: schoolData.name, schoolId: schoolId, schoolCode: schoolCode },
        timestamp: serverTimestamp(),
      };
      batch.set(logRef, logDoc);
      console.log("✅ Log créé");
      
      // COMMITTER LE BATCH
      console.log("🚀 Commit du batch...");
      await batch.commit();
      console.log("✅ Batch réussi !");
      
      // 6. Rafraîchir le token
      console.log("Étape 6: Rafraîchissement token...");
      await user.getIdToken(true);
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("🎉 CRÉATION RÉUSSIE !");
      
      return {
        schoolId,
        schoolCode,
        success: true,
        message: "École créée avec succès!"
      };
      
    } catch (error: any) {
        console.error("❌ ERREUR DÉTAILLÉE:", { name: error.name, code: error.code, message: error.message });
        throw new Error(`Échec création: ${error.message}`);
    }
  }
  
  async createSchool(schoolData: SchoolCreationData) {
    // Utiliser la version simplifiée
    return this.createSchoolSimple(schoolData);
  }
}
