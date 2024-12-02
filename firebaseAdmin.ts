import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Timestamp } from 'firebase-admin/firestore';

let adminDb: ReturnType<typeof getAdminFirestore> | null = null;

export function getAdminApp(): App | null {
  try {
    if (!getApps().length) {
      console.log('Firebase Admin Config Check:', {
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      if (
        !process.env.FIREBASE_PROJECT_ID ||
        !process.env.FIREBASE_CLIENT_EMAIL ||
        !process.env.FIREBASE_PRIVATE_KEY
      ) {
        console.error('Missing Firebase Admin environment variables');
        return null;
      }

      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

      return initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    }

    return getApps()[0];
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return null;
  }
}

export function getFirestore() {
  if (!adminDb) {
    const app = getAdminApp();
    if (!app) {
      throw new Error('Firebase Admin not initialized - check environment variables');
    }
    adminDb = getAdminFirestore(app);
  }
  return adminDb;
}

export { Timestamp };
