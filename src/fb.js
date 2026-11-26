import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, runTransaction, serverTimestamp } from 'firebase/firestore';

// Public web config (not a secret). Access is controlled by Firestore security rules.
export const firebaseConfig = {
  apiKey: "AIzaSyAHhwFgyAj0-o7a-mqpM-EhQhpKdD3ivGI",
  authDomain: "le-ceylan-crm.firebaseapp.com",
  projectId: "le-ceylan-crm",
  storageBucket: "le-ceylan-crm.firebasestorage.app",
  messagingSenderId: "403182458196",
  appId: "1:403182458196:web:89de503ba90c30560364c1"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// A second app instance lets an admin create a login without signing themselves out.
let second = null;
export async function createLogin(email, password) {
  if (!second) second = initializeApp(firebaseConfig, 'creator');
  const a2 = getAuth(second);
  const cred = await createUserWithEmailAndPassword(a2, email, password);
  const uid = cred.user.uid;
  await signOut(a2);
  return uid;
}

export { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, runTransaction, serverTimestamp };
