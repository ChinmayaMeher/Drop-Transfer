import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Use your actual Firebase configuration keys here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://drop-transfer-01-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com", // <-- Extremely important for images!
  messagingSenderId: "123456789",
  appId: "1:123456:web:abcdef",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the database and storage so App.jsx can use them
export const db = getDatabase(app);
export const storage = getStorage(app);
