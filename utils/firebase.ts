import db from '../firebaseAdmin';
import * as admin from 'firebase-admin';

export async function getTranscriptions() {
  try {
    const snapshot = await db.collection('transcriptions')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    return [];
  }
}

export async function addTranscription(text: string) {
  try {
    const docRef = await db.collection('transcriptions').add({
      text,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding transcription:', error);
    throw error;
  }
} 