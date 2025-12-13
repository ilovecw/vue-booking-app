import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDYZHM1XYZGmV1Z6jo3f01x4h1UM_P_vGQ",
  authDomain: "p4-pickleball.firebaseapp.com",
  projectId: "p4-pickleball",
  storageBucket: "p4-pickleball.firebasestorage.app",
  messagingSenderId: "657367200268",
  appId: "1:657367200268:web:2379ef9901c7872b163429"
};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);