import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBe2N7ZQUVPqPwtfg2_GFafy-oC8KveNJQ",
  authDomain: "tree-768f6.firebaseapp.com",
  projectId: "tree-768f6",
  storageBucket: "tree-768f6.firebasestorage.app",
  messagingSenderId: "943027874759",
  appId: "1:943027874759:web:6a76057587f66a1eae87e2",
  measurementId: "G-3WFHXV7DTC"
};

// Avoid re-initialization on hot reload
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Export Auth instance for client usage
export const auth = getAuth(app);

// Persist session in local storage (browser) so the user stays logged in
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

// Firestore DB
export const db = getFirestore(app);

// Initialize Analytics only in browser and if supported
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  }).catch(() => {});
}

export default app;


