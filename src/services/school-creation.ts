

'use client';
import { Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export interface CreateSchoolData {
  name: string;
  country?: string;
  region?: string;
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
      // La création (doc école + profil personnel directeur + affiliation
      // sur users/{uid}) se fait côté serveur (SDK admin) : les règles
      // Firestore interdisent désormais au client d'écrire directement la
      // carte users/{uid}.schools, qui détermine l'appartenance/le rôle sur
      // chaque école (isSchoolMember/isDirector en dépendent).
      const auth = getAuth(this.firestore.app);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'Vous devez être connecté pour créer une école.' };
      }
      const idToken = await currentUser.getIdToken();

      const response = await fetch('/api/onboarding/create-school', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: data.name,
          country: data.country,
          region: data.region,
          drena: data.drena,
          address: data.address,
          phone: data.phone,
          email: data.email,
          mainLogoUrl: data.mainLogoUrl,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error || "La création de l'école a échoué." };
      }
      return { success: true, schoolId: result.schoolId, schoolCode: result.schoolCode };
    } catch (error: any) {
      console.error('Error creating school: ', error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue lors de la création',
      };
    }
  }
}
