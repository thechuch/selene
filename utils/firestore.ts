import { getFirestore } from '../firebaseAdmin';
import * as admin from 'firebase-admin';
import type { Transcription, TranscriptionWithId } from '../types/firestore';

export async function getTranscriptions(
  page: number,
  limit: number,
  searchQuery: string = '',
  lastDocSnapshot?: FirebaseFirestore.QueryDocumentSnapshot
) {
  const db = getFirestore();

  const transcriptionsRef = db.collection('transcriptions');
  let query = transcriptionsRef.orderBy('timestamp', 'desc');

  if (searchQuery) {
    const searchLower = searchQuery.toLowerCase();
    query = transcriptionsRef
      .where('textLower', '>=', searchLower)
      .where('textLower', '<=', searchLower + '\uf8ff')
      .orderBy('textLower')
      .orderBy('timestamp', 'desc');
  }

  if (lastDocSnapshot) {
    query = query.startAfter(lastDocSnapshot);
  }

  const snapshot = await query.limit(limit + 1).get();

  const transcriptions = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TranscriptionWithId[];

  const hasMore = transcriptions.length > limit;
  const nextLastDocSnapshot = hasMore ? snapshot.docs[limit - 1] : null;

  return {
    transcriptions: transcriptions.slice(0, limit),
    hasMore,
    lastDocSnapshot: nextLastDocSnapshot,
  };
}

export async function getTranscription(id: string): Promise<TranscriptionWithId> {
  const db = getFirestore();
  const doc = await db.collection('transcriptions').doc(id).get();
  if (!doc.exists) {
    throw new Error('Transcription not found');
  }
  return {
    id: doc.id,
    ...doc.data()
  } as TranscriptionWithId;
}

export async function createTranscription(text: string): Promise<TranscriptionWithId> {
  const db = getFirestore();
  const now = admin.firestore.Timestamp.now();
  
  const transcription: Transcription = {
    text,
    textLower: text.toLowerCase(),
    timestamp: now,
    status: 'draft',
    metadata: {
      source: 'manual',
      wordCount: text.split(' ').length
    },
    updatedAt: now
  };
  
  const docRef = await db.collection('transcriptions').add(transcription);
  return {
    id: docRef.id,
    ...transcription
  };
}

export async function deleteTranscription(id: string): Promise<void> {
  const db = getFirestore();
  await db.collection('transcriptions').doc(id).delete();
}

export async function updateTranscription(
  id: string, 
  text: string, 
  status: 'draft' | 'completed' = 'draft'
): Promise<void> {
  const db = getFirestore();
  const now = admin.firestore.Timestamp.now();
  
  await db.collection('transcriptions').doc(id).update({
    text,
    textLower: text.toLowerCase(),
    'metadata.source': 'edited',
    'metadata.wordCount': text.split(' ').length,
    status,
    updatedAt: now
  });
}

export async function updateTranscriptionWithAnalysis(id: string, analysis: string): Promise<void> {
  if (!id || !analysis) {
    throw new Error('ID and analysis are required');
  }

  const db = getFirestore();
  const now = admin.firestore.Timestamp.now();
  
  try {
    await db.collection('transcriptions').doc(id).update({
      status: 'processing'
    });

    await db.collection('transcriptions').doc(id).update({
      analysis: {
        strategy: analysis,
        timestamp: now,
        model: 'gpt-4'
      },
      status: 'analyzed',
      updatedAt: now
    });
  } catch (error) {
    await db.collection('transcriptions').doc(id).update({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to update analysis'
    });
    throw error;
  }
} 