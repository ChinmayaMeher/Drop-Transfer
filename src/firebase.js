import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Use your actual Firebase configuration keys here

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: "https://drop-transfer-01-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the database and storage so App.jsx can use them
export const db = getDatabase(app);
export const storage = getStorage(app);

// forcing vercel to update
