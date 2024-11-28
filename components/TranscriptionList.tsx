"use client";

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Transcription {
  id: string;
  text: string;
  timestamp: any;
}

export default function TranscriptionList() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'transcriptions'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTranscriptions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transcription[];
      
      setTranscriptions(newTranscriptions);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">Recent Transcriptions</h2>
      <div className="space-y-4">
        {transcriptions.map((transcription) => (
          <div
            key={transcription.id}
            className="bg-gray-800 p-4 rounded-lg"
          >
            <p className="text-gray-300">{transcription.text}</p>
            <p className="text-sm text-gray-500 mt-2">
              {transcription.timestamp?.toDate().toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
} 