import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// REPLACE THIS OBJECT WITH YOUR EXACT FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL:
    "https://console.firebase.google.com/project/drop-transfer-01/database/drop-transfer-01-default-rtdb/data/~2F",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456:web:abcdef",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and export it
export const db = getDatabase(app);
