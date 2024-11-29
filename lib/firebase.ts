import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
};

// Log config for debugging (excluding sensitive info)
console.log('Firebase Client Config Check:', {
  hasProjectId: !!firebaseConfig.projectId,
  hasApiKey: !!firebaseConfig.apiKey,
  projectId: firebaseConfig.projectId
});

// Initialize Firebase
try {
  const app = initializeApp(firebaseConfig);
  console.log('Firebase client initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase client:', error);
  throw error;
}

const db = getFirestore();
export { db }; 