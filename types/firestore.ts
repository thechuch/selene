import { Timestamp } from 'firebase-admin/firestore';

export interface TranscriptionMetadata {
  duration?: number;
  wordCount?: number;
  language?: string;
  confidence?: number;
  source: 'recording' | 'manual' | 'edited';
}

export interface TranscriptionAnalysis {
  strategy: string;
  timestamp: Timestamp;
  model: string;
}

export interface Transcription {
  id?: string;
  text: string;
  textLower?: string;
  timestamp: Timestamp;
  status: 'draft' | 'completed' | 'analyzed' | 'processing' | 'error';
  analysis?: TranscriptionAnalysis;
  metadata?: TranscriptionMetadata;
  updatedAt?: Timestamp;
  error?: string;
}

export interface TranscriptionWithId extends Transcription {
  id: string;
} 