"use client";

import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FaPaperPlane, FaPencilAlt, FaCheck, FaTimes, FaBook } from 'react-icons/fa';
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
}

const thinkingPhrases = [
  "Analyzing context",
  "Processing insights",
  "Generating strategy"
];

const RECENT_ITEMS_LIMIT = 1;

export default function TranscriptionList() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const thinkingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'transcriptions'),
      orderBy('timestamp', 'desc'),
      limit(RECENT_ITEMS_LIMIT)
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

  const handleEdit = (transcription: Transcription) => {
    setEditingId(transcription.id);
    setEditText(transcription.text);
  };

  const startThinkingAnimation = () => {
    setThinkingIndex(0);
    thinkingInterval.current = setInterval(() => {
      setThinkingIndex(prev => (prev + 1) % thinkingPhrases.length);
    }, 2000);
  };

  const stopThinkingAnimation = () => {
    if (thinkingInterval.current) {
      clearInterval(thinkingInterval.current);
      thinkingInterval.current = null;
    }
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

  const getStatusColor = (status: Transcription['status']) => {
    switch (status) {
      case 'draft': return 'text-yellow-400';
      case 'completed': return 'text-green-400';
      case 'analyzed': return 'text-blue-400';
      case 'processing': return 'text-orange-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: Transcription['status']) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'completed': return 'Completed';
      case 'analyzed': return 'Analyzed';
      case 'processing': return 'Processing';
      case 'error': return 'Error';
      default: return status;
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-white">Recent Transcriptions</h2>
        <Link
          href="/library"
          className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FaBook className="w-4 h-4" />
          <span>View Library</span>
        </Link>
      </div>
      <div className="space-y-4">
        {transcriptions.map((transcription) => (
          <div
            key={transcription.id}
            className={`bg-gray-800 p-4 rounded-lg transition-all ${
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
                <div className="flex items-center justify-between text-sm mt-4">
                  <div className="flex items-center space-x-4">
                    <span className={`${getStatusColor(transcription.status)}`}>
                      {getStatusText(transcription.status)}
                    </span>
                    <span className="text-gray-500">
                      {transcription.timestamp.toDate().toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-500">
                    {transcription.metadata?.wordCount ? `${transcription.metadata.wordCount} words` : ''}
                  </div>
                </div>
                {transcription.analysis && (
                  <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-blue-400 font-semibold mb-2">Analysis</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">{transcription.analysis.strategy}</p>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 