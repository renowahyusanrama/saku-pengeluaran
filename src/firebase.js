import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { resolveDataMode } from './firebase-config.js';

const dataMode = resolveDataMode();

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let auth = null;
let db = null;

export async function ensureAnonymousSession() {
  if (dataMode !== 'cloud') return false;

  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }

  const user = await new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      unsubscribe();
      resolve(currentUser);
    }, reject);
  });

  if (!user) {
    await signInAnonymously(auth);
  }

  return true;
}

export function subscribeSharedExpenses(onValue, onError) {
  if (dataMode !== 'cloud' || !db) {
    onValue([]);
    return () => {};
  }

  const ref = doc(db, 'shared', 'expenses');
  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      onValue([]);
      return;
    }

    const payload = snapshot.data();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    onValue(items);
  }, (error) => {
    if (onError) onError(error);
  });
}

export async function saveSharedExpenses(items) {
  if (dataMode !== 'cloud' || !db) {
    throw new Error('Firebase cloud sync is not configured.');
  }

  const ref = doc(db, 'shared', 'expenses');
  await setDoc(ref, {
    items,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
