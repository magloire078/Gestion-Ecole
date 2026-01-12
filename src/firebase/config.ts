
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAmhQB4yUoskfJIoBme4OStNkpGzXUxR7c",
  authDomain: "greecole.firebaseapp.com",
  projectId: "greecole",
  storageBucket: "greecole.appspot.com",
  messagingSenderId: "97019754371",
  appId: "1:97019754371:web:4822d9c017bf4be808e8b6"
};


let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  firestore = getFirestore(app);
}

// Exporting the initialized services
// We avoid exporting 'app' directly to encourage using the service-specific exports.
// @ts-ignore
export { auth, firestore };
