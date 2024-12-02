"use client";

import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { FaPaperPlane, FaPencilAlt, FaCheck, FaTimes, FaBook, FaSpinner } from 'react-icons/fa';
import Link from 'next/link';

interface TranscriptionAnalysis {
  strategy: string;
  timestamp: Timestamp;
  model: string;
}

interface Transcription {
  id: string;
  text: string;
  timestamp: Timestamp;
  status: 'draft' | 'completed' | 'analyzed' | 'processing' | 'error';
  analysis?: TranscriptionAnalysis;
  metadata?: {
    source?: 'recording' | 'manual' | 'edited';
    wordCount?: number;
  };
  error?: string;
}

const thinkingPhrases = [
  "Analyzing business context",
  "Processing industry data",
  "Identifying market opportunities",
  "Evaluating competitive landscape",
  "Formulating strategic recommendations",
  "Generating action items",
  "Finalizing strategy report",
  "Preparing insights"
];

const RECENT_ITEMS_LIMIT = 5;

export default function TranscriptionList() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const dbRef = useRef(getDb());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const thinkingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const db = dbRef.current;
    if (!db) {
      setError('Firebase not initialized');
      return;
    }

    const q = query(
      collection(db, 'transcriptions'),
      orderBy('timestamp', 'desc'),
      limit(RECENT_ITEMS_LIMIT)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const newTranscriptions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transcription[];
        setTranscriptions(newTranscriptions);
        setError(null);
      },
      (err) => {
        console.error('Error fetching transcriptions:', err);
        setError('Failed to fetch transcriptions');
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editText]);

  useEffect(() => {
    return () => {
      if (thinkingInterval.current) {
        clearInterval(thinkingInterval.current);
      }
    };
  }, []);

  const startThinkingAnimation = () => {
    setThinkingIndex(0);
    let currentIndex = 0;
    
    thinkingInterval.current = setInterval(() => {
      currentIndex++;
      if (currentIndex >= thinkingPhrases.length) {
        if (thinkingInterval.current) {
          clearInterval(thinkingInterval.current);
        }
      } else {
        setThinkingIndex(currentIndex);
      }
    }, 2500);
  };

  const stopThinkingAnimation = () => {
    if (thinkingInterval.current) {
      clearInterval(thinkingInterval.current);
      thinkingInterval.current = null;
    }
  };

  const handleEdit = (transcription: Transcription) => {
    setEditingId(transcription.id);
    setEditText(transcription.text);
  };

  const handleSave = async (submit: boolean = false) => {
    if (!editingId) return;

    try {
      if (submit) {
        setIsSubmitting(true);
        startThinkingAnimation();
        
        const response = await fetch(`/api/transcriptions?id=${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: editText, submit: true }),
        });

        if (!response.ok) {
          throw new Error('Failed to update transcription');
        }
      } else {
        const response = await fetch(`/api/transcriptions?id=${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: editText, submit: false }),
        });

        if (!response.ok) {
          throw new Error('Failed to update transcription');
        }
      }

      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating transcription:', error);
      alert('Failed to update transcription. Please try again.');
    } finally {
      setIsSubmitting(false);
      stopThinkingAnimation();
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transcriptions.map((transcription) => (
        <div
          key={transcription.id}
          className={`bg-gray-800 rounded-lg p-4 transition-all hover:ring-2 hover:ring-yellow-400/50 ${
            editingId === transcription.id ? 'ring-2 ring-yellow-400' : ''
          }`}
        >
          {editingId === transcription.id ? (
            <div className="space-y-4">
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
              />
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  {isSubmitting && (
                    <div className="flex items-center space-x-3 text-yellow-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      <span className="text-sm font-medium animate-pulse">
                        {thinkingPhrases[thinkingIndex]}...
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaTimes className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaCheck className="w-4 h-4" />
                    <span>Save Draft</span>
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={isSubmitting}
                    className={`px-3 py-2 rounded-lg text-white transition-colors flex items-center space-x-1 ${
                      isSubmitting 
                        ? 'bg-orange-500 cursor-not-allowed' 
                        : 'bg-yellow-400 hover:bg-orange-500'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent" />
                    ) : (
                      <FaPaperPlane className="w-4 h-4" />
                    )}
                    <span>{isSubmitting ? 'Submitting' : 'Submit'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="text-gray-300 whitespace-pre-wrap">{transcription.text}</p>
                </div>
                {transcription.status === 'draft' && (
                  <button
                    onClick={() => handleEdit(transcription)}
                    className="ml-4 p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    <FaPencilAlt className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`${getStatusColor(transcription.status)} flex items-center`}>
                    {transcription.status === 'processing' && (
                      <FaSpinner className="w-3 h-3 mr-1 animate-spin" />
                    )}
                    {transcription.status.charAt(0).toUpperCase() + transcription.status.slice(1)}
                  </span>
                  {transcription.error && (
                    <span className="text-red-500 text-xs">{transcription.error}</span>
                  )}
                </div>
                <span className="text-gray-500">
                  {transcription.timestamp.toDate().toLocaleString()}
                </span>
              </div>
              {transcription.analysis && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                  <h3 className="text-blue-400 font-semibold mb-2">Analysis</h3>
                  <p className="text-gray-300 whitespace-pre-wrap line-clamp-3">
                    {transcription.analysis.strategy}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      {transcriptions.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No transcriptions yet.
        </div>
      )}
      <div className="flex justify-center mt-4">
        <Link
          href="/library"
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <FaBook className="w-4 h-4 mr-2" />
          <span>View All Transcriptions</span>
        </Link>
      </div>
    </div>
  );
}

function getStatusColor(status: Transcription['status']) {
  switch (status) {
    case 'draft': return 'text-yellow-400';
    case 'completed': return 'text-green-400';
    case 'analyzed': return 'text-blue-400';
    case 'processing': return 'text-orange-400';
    case 'error': return 'text-red-400';
    default: return 'text-gray-400';
  }
} 