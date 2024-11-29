import * as admin from 'firebase-admin';

// Check if we're already initialized
if (!admin.apps.length) {
  try {
    // Log environment variables for debugging
    console.log('Firebase Config Check:', {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      projectId: process.env.FIREBASE_PROJECT_ID
    });

    // Initialize the app
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    });

    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    throw error;
  }
}

const db = admin.firestore();
export default db;
