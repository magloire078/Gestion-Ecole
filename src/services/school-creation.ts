
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
      
      // 2. Créer le PROFIL PERSONNEL
      console.log("Étape 2: Création profil personnel...");
      const staffProfileRef = doc(this.db, `ecoles/${schoolId}/personnel/${schoolData.directorId}`);
      
      const staffProfile = {
        uid: schoolData.directorId,
        email: schoolData.directorEmail,
        displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
        photoURL: '',
        schoolId: schoolId,
        role: 'directeur', // ⚠️ Doit être exactement 'directeur'
        firstName: schoolData.directorFirstName,
        lastName: schoolData.directorLastName,
        hireDate: new Date().toISOString().split('T')[0],
        baseSalary: 0,
        status: 'Actif',
        createdAt: serverTimestamp(),
      };
      
      await setDoc(staffProfileRef, staffProfile);
      console.log("✅ Profil créé");
      
      // 3. Mettre à jour l'UTILISATEUR
      console.log("Étape 3: Mise à jour utilisateur...");
      const userRef = doc(this.db, `utilisateurs/${schoolData.directorId}`);
      
      const userDoc = {
        schoolId: schoolId,
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(userRef, userDoc, { merge: true });
      console.log("✅ Utilisateur mis à jour");
      
      // 4. Créer le LOG
      console.log("Étape 4: Création log...");
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
      
      // 5. Rafraîchir le token
      console.log("Étape 5: Rafraîchissement token...");
      await user.getIdToken(true);
      
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("🎉 CRÉATION RÉUSSIE !");
      console.log("School ID:", schoolId);
      console.log("School Code:", schoolCode);
      
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
      
      // Afficher plus d'infos selon le type d'erreur
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
    // Utiliser la version simplifiée
    return this.createSchoolSimple(schoolData);
  }
}
