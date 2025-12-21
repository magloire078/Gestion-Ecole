
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
    
    // Vérification UID
    if (user.uid !== schoolData.directorId) {
      throw new Error("❌ L'utilisateur ne correspond pas au directeur");
    }
    
    try {
      // 1. Créer l'ÉCOLE d'abord (document principal)
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
      
      await setDoc(schoolRef, schoolDoc);
      console.log("✅ École créée:", schoolId);

      // 2. Créer le rôle "Super Admin" par défaut
      console.log("Étape 2: Création rôle Super Admin...");
      const adminRoleRef = doc(collection(this.db, `ecoles/${schoolId}/admin_roles`));
      const adminRoleId = adminRoleRef.id;
      await setDoc(adminRoleRef, {
          name: 'Super Admin',
          description: 'Accès complet à toutes les fonctionnalités de l\'école.',
          isSystem: true,
          schoolId: schoolId,
          permissions: { manageUsers: true, viewUsers: true, manageClasses: true, manageGrades: true, manageSystem: true, viewAnalytics: true, manageSettings: true, manageBilling: true, manageCommunication: true, manageSchedule: true, manageAttendance: true, manageLibrary: true, manageCantine: true, manageTransport: true, manageInternat: true, manageInventory: true, manageRooms: true, manageActivities: true, manageMedical: true }
      });
      console.log("✅ Rôle Super Admin créé:", adminRoleId);
      
      // 3. Créer le PROFIL PERSONNEL
      console.log("Étape 3: Création profil personnel...");
      const staffProfileRef = doc(this.db, `ecoles/${schoolId}/personnel/${schoolData.directorId}`);
      
      const staffProfile = {
        uid: schoolData.directorId,
        email: schoolData.directorEmail,
        displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
        photoURL: '',
        schoolId: schoolId,
        role: 'directeur', // ⚠️ Doit être exactement 'directeur'
        adminRole: adminRoleId,
        firstName: schoolData.directorFirstName,
        lastName: schoolData.directorLastName,
        hireDate: new Date().toISOString().split('T')[0],
        baseSalary: 0,
        status: 'Actif',
        createdAt: serverTimestamp(),
      };
      
      await setDoc(staffProfileRef, staffProfile);
      console.log("✅ Profil créé");
      
      // 4. Mettre à jour l'UTILISATEUR
      console.log("Étape 4: Mise à jour utilisateur...");
      const userRef = doc(this.db, `utilisateurs/${schoolData.directorId}`);
      
      const userDoc = {
        schoolId: schoolId,
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(userRef, userDoc, { merge: true });
      console.log("✅ Utilisateur mis à jour");
      
      // 5. Créer le LOG
      console.log("Étape 5: Création log...");
      const logRef = doc(collection(this.db, 'system_logs'));
      
      const logDoc = {
        adminId: schoolData.directorId,
        action: 'school.created',
        target: schoolRef.path,
        details: {
          schoolName: schoolData.name,
          schoolId: schoolId,
          schoolCode: schoolCode,
        },
        timestamp: serverTimestamp(),
      };
      
      await setDoc(logRef, logDoc);
      console.log("✅ Log créé");
      
      // 6. Rafraîchir le token
      console.log("Étape 6: Rafraîchissement token...");
      await user.getIdToken(true);
      
      console.log("🎉 CRÉATION RÉUSSIE !");
      
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
      
      if (error.code === 'permission-denied') {
        console.error("🔴 ERREUR PERMISSION - Vérifiez:");
        console.error("1. Règles Firestore déployées?");
        console.error("2. Utilisateur authentifié? UID:", user?.uid);
        console.error("3. Document path qui échoue?");
      }
      
      throw new Error(`Échec création: ${error.message}`);
    }
  }
  
  async createSchool(schoolData: SchoolCreationData) {
    return this.createSchoolSimple(schoolData);
  }
}
