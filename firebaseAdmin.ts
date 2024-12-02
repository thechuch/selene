import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

export function getAdminApp(): App | null {
  try {
    if (!getApps().length) {
      if (
        !process.env.FIREBASE_PROJECT_ID ||
        !process.env.FIREBASE_CLIENT_EMAIL ||
        !process.env.FIREBASE_PRIVATE_KEY
      ) {
        console.error('Missing Firebase environment variables:', {
          hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
          hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
        return null;
      }

      const firebaseConfig = {
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      };

      return initializeApp(firebaseConfig);
    } else {
      return getApps()[0];
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return null;
  }
}

export function getFirestore() {
  const adminApp = getAdminApp();
  if (!adminApp) {
    throw new Error('Firebase Admin not initialized');
  }
  return getAdminFirestore(adminApp);
}
