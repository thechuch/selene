import formidable, { Fields, Files, File } from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase-admin/firestore';
import { getFirestore } from '../../firebaseAdmin';
import fs from 'fs/promises';
import type { Transcription } from '../../types/firestore';

// Disable Next.js body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getFirestore();
    const now = Timestamp.now();
    const form = formidable();

    // Parse the form data
    const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    if (files.file) {
      // Handle audio transcription
      const audioFile = files.file[0] as File;
      
      // Create initial transcription document
      const initialTranscription: Omit<Transcription, 'id'> = {
        text: 'Processing...',
        textLower: 'processing...',
        timestamp: now,
        status: 'processing',
        metadata: {
          source: 'recording',
          wordCount: 0
        },
        updatedAt: now
      };

      const docRef = await db.collection('transcriptions').add(initialTranscription);

      try {
        // Read the audio file
        const fileData = await fs.readFile(audioFile.filepath);
        
        // Create form data for OpenAI API
        const formData = new FormData();
        formData.append('file', new Blob([fileData]), audioFile.originalFilename || 'recording.webm');
        formData.append('model', 'whisper-1');

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Update transcription with results
        const updatedTranscription: Partial<Transcription> = {
          text: data.text,
          textLower: data.text.toLowerCase(),
          status: 'draft',
          metadata: {
            source: 'recording',
            wordCount: data.text.split(' ').length
          },
          updatedAt: now
        };

        await docRef.update(updatedTranscription);

        return res.status(200).json({
          id: docRef.id,
          ...updatedTranscription,
          saved: true
        });

      } catch (error) {
        // Update document with error status
        await docRef.update({
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to process audio',
          updatedAt: now
        });

        console.error('Audio processing error:', error);
        return res.status(500).json({
          error: 'Failed to process audio',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

    } else {
      // Handle text transcription
      const textField = fields.text;
      const text = Array.isArray(textField) ? textField[0] : textField;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const transcription: Omit<Transcription, 'id'> = {
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

      return res.status(200).json({
        id: docRef.id,
        ...transcription,
        saved: true
      });
    }
  } catch (error) {
    console.error('API route error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 