import db from '../firebaseAdmin';
import * as admin from 'firebase-admin';
import type { Transcription } from '../types/firestore';

const transcriptionsRef = db.collection('transcriptions');

export async function saveTranscription(text: string, metadata?: Partial<Transcription['metadata']>) {
  try {
    const transcription: Omit<Transcription, 'id'> = {
      text,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
      metadata: {
        wordCount: text.split(' ').length,
        ...metadata
      },
      status: 'completed'
    };

    const docRef = await transcriptionsRef.add(transcription);
    return docRef.id;
  } catch (error) {
    console.error('Error saving transcription:', error);
    throw error;
  }
}

export async function getTranscriptions(page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;
    
    // Get one extra item to check if there are more pages
    const snapshot = await transcriptionsRef
      .orderBy('timestamp', 'desc')
      .limit(limit + 1)
      .offset(offset)
      .get();

    const transcriptions = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const hasMore = snapshot.docs.length > limit;

    return {
      transcriptions,
      hasMore
    };
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    throw error;
  }
}

export async function getTranscription(id: string) {
  try {
    const doc = await transcriptionsRef.doc(id).get();
    if (!doc.exists) {
      throw new Error('Transcription not found');
    }
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error fetching transcription:', error);
    throw error;
  }
}

export async function deleteTranscription(id: string) {
  try {
    await transcriptionsRef.doc(id).delete();
    return true;
  } catch (error) {
    console.error('Error deleting transcription:', error);
    throw error;
  }
}

export async function updateTranscription(id: string, text: string) {
  try {
    await transcriptionsRef.doc(id).update({
      text,
      'metadata.source': 'edited',
      'status': 'completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error updating transcription:', error);
    throw error;
  }
}

export async function updateTranscriptionWithAnalysis(id: string, analysis: string) {
  if (!id || !analysis) {
    throw new Error('ID and analysis are required');
  }

  try {
    await transcriptionsRef.doc(id).update({
      'analysis': {
        strategy: analysis,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        model: 'gpt-4'
      },
      'status': 'analyzed'
    });
    return true;
  } catch (error) {
    console.error('Error updating transcription analysis:', error);
    throw error;
  }
} 