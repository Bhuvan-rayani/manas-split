
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDMP1qs_egJbyS2rWiZihynlbA_HBbiMi0",
  authDomain: "manas-nidar-trip.firebaseapp.com",
  projectId: "manas-nidar-trip",
  storageBucket: "manas-nidar-trip.firebasestorage.app",
  messagingSenderId: "268881524512",
  appId: "1:268881524512:web:f66e24a451fb51b537c945",
  measurementId: "G-BVBR6CN7JG"
};

// Check if Firebase is actually configured with non-placeholder values
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && 
         !firebaseConfig.apiKey.includes("YOUR_") && 
         firebaseConfig.projectId && 
         !firebaseConfig.projectId.includes("YOUR_");
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
