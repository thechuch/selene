import * as admin from "firebase-admin";

let firestore: admin.firestore.Firestore | null = null;

const initializeFirebase = () => {
  if (firestore) return firestore;
  
  try {
    if (!admin.apps.length) {
      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
        console.warn("Firebase credentials not found, skipping initialization");
        return null;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: `https://selene-c0c22.firebaseio.com`,
      });
      console.log("Firebase Admin initialized successfully");
    }
    
    firestore = admin.firestore();
    return firestore;
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    return null;
  }
};

export default initializeFirebase();
