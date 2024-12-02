import { getFirestore } from '../firebaseAdmin';
import * as admin from 'firebase-admin';
import type { Transcription } from '../types/firestore';

export async function getTranscriptions(page: number, limit: number) {
  const db = getFirestore();
  const skip = (page - 1) * limit;
  
  const snapshot = await db
    .collection('transcriptions')
    .orderBy('timestamp', 'desc')
    .limit(limit + 1)
    .offset(skip)
    .get();

  const transcriptions = snapshot.docs.slice(0, limit).map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    transcriptions,
    hasMore: snapshot.docs.length > limit
  };
}

export async function getTranscription(id: string) {
  const db = getFirestore();
  const doc = await db.collection('transcriptions').doc(id).get();
  if (!doc.exists) {
    throw new Error('Transcription not found');
  }
  return {
    id: doc.id,
    ...doc.data()
  };
}

export async function createTranscription(text: string) {
  const db = getFirestore();
  const transcription = {
    text,
    textLower: text.toLowerCase(),
    timestamp: admin.firestore.Timestamp.now(),
    status: 'draft',
    metadata: {
      wordCount: text.split(' ').length,
      source: 'manual'
    }
  };
  
  const docRef = await db.collection('transcriptions').add(transcription);
  return {
    id: docRef.id,
    ...transcription
  };
}

export async function deleteTranscription(id: string) {
  const db = getFirestore();
  await db.collection('transcriptions').doc(id).delete();
}

export async function updateTranscription(id: string, text: string, status: 'draft' | 'completed' = 'draft') {
  const db = getFirestore();
  await db.collection('transcriptions').doc(id).update({
    text,
    textLower: text.toLowerCase(),
    'metadata.source': 'edited',
    'metadata.wordCount': text.split(' ').length,
    'status': status,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

export async function updateTranscriptionWithAnalysis(id: string, analysis: string) {
  if (!id || !analysis) {
    throw new Error('ID and analysis are required');
  }

  const db = getFirestore();
  try {
    // First update status to processing
    await db.collection('transcriptions').doc(id).update({
      'status': 'processing'
    });

    // Then update with the analysis
    await db.collection('transcriptions').doc(id).update({
      'analysis': {
        strategy: analysis,
        timestamp: admin.firestore.Timestamp.now(),
        model: 'gpt-4'
      },
      'status': 'analyzed',
      'updatedAt': admin.firestore.Timestamp.now()
    });
  } catch (error) {
    // If there's an error, update the status to reflect that
    await db.collection('transcriptions').doc(id).update({
      'status': 'error',
      'error': error instanceof Error ? error.message : 'Failed to update analysis'
    });
    throw error;
  }
} 