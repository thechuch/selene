import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface Transcription {
  text: string;
  timestamp: Timestamp | FieldValue;
  createdAt: string;
  metadata?: {
    duration?: number;
    wordCount?: number;
    language?: string;
    confidence?: number;
    source: 'recording' | 'manual' | 'edited';
  };
  status: 'draft' | 'completed' | 'analyzed';
  analysis?: {
    strategy: string;
    timestamp: Timestamp | FieldValue;
    model: string;
    keyPoints?: string[];
  };
}

export interface TranscriptionWithId extends Transcription {
  id: string;
} 