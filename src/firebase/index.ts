
// Ce fichier sert de point d'entrée centralisé pour les services et hooks Firebase.

// Exportez directement les hooks dont vous avez besoin depuis leur emplacement.
// Cela rend les imports dans le reste de l'application plus clairs.

export { useUser } from '@/hooks/use-user';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';

// Exportez les fournisseurs et les instances de service si nécessaire.
// Note : Les composants doivent privilégier les hooks (useAuth, useFirestore) plutôt que d'importer directement les instances.
export {
  FirebaseClientProvider,
  useFirebase,
  useAuth,
  useFirestore,
  useStorage,
  useFirebaseApp,
} from './client-provider';

export { firebaseFirestore as db } from './config';
