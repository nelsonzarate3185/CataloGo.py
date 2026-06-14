import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Fallbacks prevent Firebase from throwing "auth/invalid-api-key" during
// SSR pre-rendering at build time (when NEXT_PUBLIC_* vars aren't set).
// In production (Vercel) the real env vars are always present.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "build-placeholder",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "build-placeholder.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "build-placeholder",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "build-placeholder.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
