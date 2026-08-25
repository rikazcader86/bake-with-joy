import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// This checks if the app is already connected so it doesn't connect twice
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// This exports the database so we can use it in our other screens
export const db = getFirestore(app);