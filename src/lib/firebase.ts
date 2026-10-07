import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCE42qMA0Nz00I1opX6ehh-95p115rO4jQ",
  authDomain: "erpchatapp-6ba84.firebaseapp.com",
  projectId: "erpchatapp-6ba84",
  storageBucket: "erpchatapp-6ba84.firebasestorage.app",
  messagingSenderId: "231188371997",
  appId: "1:231188371997:web:2a21b34fb010da296a84f4",
  measurementId: "G-QJC64GH6VY"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
