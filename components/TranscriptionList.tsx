"use client";

import { useEffect, useState, useRef } from 'react';
import { FaPaperPlane, FaPencilAlt, FaCheck, FaTimes, FaBook } from 'react-icons/fa';
import Link from 'next/link';
import type { TranscriptionWithId } from '../types/firestore';

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
  const [transcriptions, setTranscriptions] = useState<TranscriptionWithId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const thinkingInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial transcriptions
  useEffect(() => {
    const fetchTranscriptions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/library?page=1&limit=${RECENT_ITEMS_LIMIT}`);
        if (!response.ok) {
          throw new Error('Failed to fetch transcriptions');
        }
        const data = await response.json();
        setTranscriptions(data.transcriptions);
        setError(null);
      } catch (err) {
        console.error('Error fetching transcriptions:', err);
        setError('Failed to fetch transcriptions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranscriptions();
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

  const handleEdit = (transcription: TranscriptionWithId) => {
    setEditingId(transcription.id);
    setEditText(transcription.text);
  };

  const handleSave = async (submit: boolean = false) => {
    if (!editingId) return;

    try {
      if (submit) {
        setIsSubmitting(true);
        startThinkingAnimation();
      }

      const response = await fetch(`/api/transcriptions?id=${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: editText, submit }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transcription');
      }

      // Refresh transcriptions after update
      const refreshResponse = await fetch(`/api/library?page=1&limit=${RECENT_ITEMS_LIMIT}`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setTranscriptions(data.transcriptions);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    );
  }

  if (transcriptions.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        No transcriptions yet.
        <Link href="/library" className="view-all-link">
          <FaBook className="w-4 h-4" />
          <span>View All Transcriptions</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transcriptions.map((transcription) => (
        <div
          key={transcription.id}
          className={`transcription-card ${
            editingId === transcription.id ? 'ring-2 ring-yellow-400' : ''
          }`}
        >
          {editingId === transcription.id ? (
            <div className="space-y-4">
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 resize-none"
              />
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  {isSubmitting && (
                    <div className="thinking-animation">
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
                    className="px-3 py-2 rounded-lg bg-gray-800/50 text-white hover:bg-gray-700/50 transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaTimes className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-lg bg-gray-800/50 text-white hover:bg-gray-700/50 transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <button
                  onClick={() => handleEdit(transcription)}
                  className="ml-4 p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <FaPencilAlt className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>
                  {transcription.metadata?.source === 'recording' ? 'Recorded' : 'Typed'} •{' '}
                  {new Date(transcription.timestamp.seconds * 1000).toLocaleString()}
                </span>
                <span className={`capitalize ${
                  transcription.status === 'error' ? 'text-red-400' :
                  transcription.status === 'analyzed' ? 'text-blue-400' :
                  transcription.status === 'completed' ? 'text-green-400' :
                  'text-yellow-400'
                }`}>
                  {transcription.status}
                </span>
              </div>
              {transcription.analysis && (
                <div className="analysis-section">
                  <h3 className="text-yellow-400 font-medium mb-2">Analysis</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{transcription.analysis.strategy}</p>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      <Link href="/library" className="view-all-link">
        <FaBook className="w-4 h-4" />
        <span>View All Transcriptions</span>
      </Link>
    </div>
  );
} 