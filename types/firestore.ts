import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface TranscriptionMetadata {
  duration?: number;
  wordCount?: number;
  language?: string;
  confidence?: number;
  source: 'recording' | 'manual' | 'edited';
}

export interface TranscriptionAnalysis {
  strategy: string;
  timestamp: Timestamp | FieldValue;
  model: string;
  keyPoints?: string[];
}

export interface Transcription {
  text: string;
  timestamp: Timestamp | FieldValue;
  createdAt: string;
  metadata: TranscriptionMetadata;
  status: 'draft' | 'completed' | 'analyzed';
  analysis?: TranscriptionAnalysis;
}

export interface TranscriptionWithId extends Transcription {
  id: string;
} 