import * as admin from 'firebase-admin';

let app: admin.app.App | undefined;

export function getAdminApp() {
  if (app) {
    return app;
  }

  // Log environment variables for debugging
  console.log('Firebase Config Check:', {
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
    console.error('Missing Firebase environment variables.');
    return null;
  }

  try {
    // Initialize the app
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });

    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    if (!/already exists/u.test((error as Error).message)) {
      console.error('Firebase admin initialization error:', error);
      throw error;
    }
    app = admin.app();
  }

  return app;
}

export function getFirestore() {
  const adminApp = getAdminApp();
  if (!adminApp) {
    throw new Error('Firebase Admin not initialized');
  }
  return adminApp.firestore();
}
