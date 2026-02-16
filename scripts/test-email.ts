import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Chargement manuel des variables d'env depuis .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
}

// Configuration Firebase (Issue de votre environnement)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function testEmail() {
    const to = "magloire078@gmail.com";
    const userName = "Magloire";
    const schoolName = "École de Test GéreEcole";

    console.log(`Tentative d'envoi d'un email de test à ${to}...`);

    try {
        const mailCollection = collection(firestore, 'mail');
        const docRef = await addDoc(mailCollection, {
            to: to,
            message: {
                subject: `Bienvenue sur GéreEcole - ${schoolName}`,
                html: `
                  <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h1 style="color: #0C365A;">Bienvenue, ${userName} !</h1>
                    <p>Ceci est un email de test pour valider le système de notifications de <strong>GéreEcole</strong>.</p>
                    <p>Votre école <strong>${schoolName}</strong> est prête à être gérée.</p>
                    <div style="margin: 20px 0;">
                      <a href="https://gereecole.com/dashboard" style="background-color: #2D9CDB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accéder au tableau de bord</a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 0.8em; color: #777;">L'équipe GéreEcole - Test Technique</p>
                  </div>
                `
            },
            delivery: {
                startTime: serverTimestamp(),
                state: 'PENDING'
            }
        });
        console.log("Document d'email créé avec l'ID:", docRef.id);
        console.log("Vérifiez votre boîte mail (et les spams) ainsi que la collection 'mail' dans la console Firebase.");
    } catch (e) {
        console.error("Erreur lors de la création du document mail:", e);
    }
}

testEmail();
