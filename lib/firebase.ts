import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

let clientDb: ReturnType<typeof getFirestore> | null = null;

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
};

// Initialize Firebase only on the client side
function initializeFirebase() {
  if (typeof window === 'undefined') return null;

  try {
    // Log config for debugging (excluding sensitive info)
    console.log('Firebase Client Config Check:', {
      hasProjectId: !!firebaseConfig.projectId,
      hasApiKey: !!firebaseConfig.apiKey,
      projectId: firebaseConfig.projectId
    });

    if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
      throw new Error('Missing required Firebase configuration. Check your environment variables.');
    }

    let app;
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      console.log('Firebase client initialized successfully');
    } else {
      app = getApps()[0];
    }

    if (!clientDb) {
      clientDb = getFirestore(app);
    }

    return clientDb;
  } catch (error) {
    console.error('Error initializing Firebase client:', error);
    throw error;
  }
}

// Export a function to get the Firestore instance
export function getDb() {
  if (!clientDb) {
    clientDb = initializeFirebase();
  }
  return clientDb;
}

// For backward compatibility
export const db = typeof window === 'undefined' ? null : getDb(); 