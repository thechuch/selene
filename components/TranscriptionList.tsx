"use client";

import { useState, useEffect, useCallback } from 'react';
import { TranscriptionWithId } from '../types/firestore';
import { FaTrash, FaCopy, FaSearch, FaCalendar, FaEdit, FaChartLine, FaShareAlt, FaFilePdf } from 'react-icons/fa';
import { format } from 'date-fns';
import { useSocket } from '../hooks/useSocket';
import * as admin from 'firebase-admin';

// Add this new component for the analysis display
function AnalysisView({ analysis }: { analysis: TranscriptionWithId['analysis'] }) {
  if (!analysis) return null;

  const sections = analysis.strategy.split('\n\n').filter(Boolean);

  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold text-yellow-400 mb-3">Business Analysis</h3>
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="text-gray-200">
            {section}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
        >
          <FaFilePdf className="text-red-400" />
          <span>Export PDF</span>
        </button>
        <button
          onClick={() => {
            const url = window.location.href;
            navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
          }}
          className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
        >
          <FaShareAlt className="text-blue-400" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}

export default function TranscriptionList() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionWithId[]>([]);
  const [filteredTranscriptions, setFilteredTranscriptions] = useState<TranscriptionWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 5;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [selectedTranscription, setSelectedTranscription] = useState<string | null>(null);

  useEffect(() => {
    fetchTranscriptions();
  }, [page]);

  useEffect(() => {
    filterTranscriptions();
  }, [searchTerm, dateFilter, transcriptions]);

  const filterTranscriptions = () => {
    let filtered = [...transcriptions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter).toDateString();
      filtered = filtered.filter(t => 
        new Date(t.createdAt).toDateString() === filterDate
      );
    }

    setFilteredTranscriptions(filtered);
  };

  const fetchTranscriptions = async () => {
    try {
      const response = await fetch(`/api/transcriptions?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (!response.ok) throw new Error('Failed to fetch transcriptions');
      const data = await response.json();
      
      if (page === 1) {
        setTranscriptions(data.transcriptions);
      } else {
        setTranscriptions(prev => [...prev, ...data.transcriptions]);
      }
      
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transcriptions');
    } finally {
      setLoading(false);
    }
  };

  // WebSocket handlers
  const handleNewTranscription = useCallback((transcription: TranscriptionWithId) => {
    setTranscriptions(prev => [transcription, ...prev]);
  }, []);

  const handleDeleteTranscription = useCallback((id: string) => {
    setTranscriptions(prev => prev.filter(t => t.id !== id));
  }, []);

  // Initialize WebSocket
  const socket = useSocket(handleNewTranscription, handleDeleteTranscription);

  // Update handleDelete to emit deletion event
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transcription?')) return;
    
    try {
      const response = await fetch(`/api/transcriptions?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete transcription');
      
      setTranscriptions(prev => prev.filter(t => t.id !== id));
      
      // Emit deletion event
      socket?.emit('transcriptionDeleted', id);
    } catch (err) {
      console.error('Error deleting transcription:', err);
      alert('Failed to delete transcription');
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy text');
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const handleEdit = (transcription: TranscriptionWithId) => {
    setEditingId(transcription.id);
    setEditText(transcription.text);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/transcriptions?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText }),
      });

      if (!response.ok) throw new Error('Failed to update transcription');
      
      setTranscriptions(prev => 
        prev.map(t => t.id === id ? { ...t, text: editText } : t)
      );
      setEditingId(null);
    } catch (err) {
      console.error('Error updating transcription:', err);
      alert('Failed to update transcription');
    }
  };

  const handleAnalyze = async (transcription: TranscriptionWithId) => {
    try {
      setAnalyzing(transcription.id);
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcriptionId: transcription.id,
          text: transcription.text
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze transcription');
      
      const data = await response.json();
      const updatedTranscription: TranscriptionWithId = {
        ...transcription,
        analysis: {
          strategy: data.analysis,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          model: 'gpt-4',
          keyPoints: data.analysis.split('\n').filter((line: string) => line.startsWith('-'))
        }
      };

      setTranscriptions(prev => 
        prev.map(t => t.id === transcription.id ? updatedTranscription : t)
      );
      setSelectedTranscription(transcription.id);
    } catch (err) {
      console.error('Error analyzing transcription:', err);
      alert('Failed to analyze transcription');
    } finally {
      setAnalyzing(null);
    }
  };

  if (loading && page === 1) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-4">Recent Transcriptions</h2>
      
      {/* Search and Filter Controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search transcriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 text-white px-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
        
        <div className="relative">
          <FaCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-gray-800 text-white px-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>

      {/* Transcriptions List */}
      {filteredTranscriptions.length === 0 ? (
        <p className="text-gray-500">
          {searchTerm || dateFilter ? 'No matching transcriptions found' : 'No transcriptions yet'}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredTranscriptions.map((transcription) => (
            <div 
              key={transcription.id} 
              className={`bg-gray-900 p-4 rounded-lg border transition-colors ${
                selectedTranscription === transcription.id
                  ? 'border-yellow-400'
                  : 'border-yellow-400/20 hover:border-yellow-400/40'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm text-gray-400">
                  {new Date(transcription.createdAt).toLocaleString()}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleCopy(transcription.text)}
                    className="text-gray-400 hover:text-yellow-400 transition-colors"
                    title="Copy text"
                  >
                    <FaCopy />
                  </button>
                  <button
                    onClick={() => handleDelete(transcription.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete transcription"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              {editingId === transcription.id ? (
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-gray-800 text-white p-2 rounded-lg mt-2"
                  rows={4}
                />
              ) : (
                <p className="text-white">{transcription.text}</p>
              )}
              {transcription.metadata && (
                <div className="mt-2 text-sm text-gray-400">
                  {transcription.metadata.wordCount && (
                    <span className="mr-4">Words: {transcription.metadata.wordCount}</span>
                  )}
                  {transcription.metadata.duration && (
                    <span>Duration: {Math.round(transcription.metadata.duration)}s</span>
                  )}
                </div>
              )}
              {/* Action Buttons */}
              <div className="mt-4 flex gap-4">
                <button
                  onClick={() => editingId === transcription.id ? 
                    handleSaveEdit(transcription.id) : handleEdit(transcription)
                  }
                  className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors"
                >
                  <FaEdit />
                  <span>{editingId === transcription.id ? 'Save' : 'Edit'}</span>
                </button>

                <button
                  onClick={() => handleAnalyze(transcription)}
                  disabled={analyzing === transcription.id}
                  className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors disabled:opacity-50"
                >
                  <FaChartLine />
                  <span>{analyzing === transcription.id ? 'Analyzing...' : 'Analyze'}</span>
                </button>
              </div>

              {/* Analysis View */}
              {selectedTranscription === transcription.id && transcription.analysis && (
                <AnalysisView analysis={transcription.analysis} />
              )}
            </div>
          ))}
          
          {/* Load More Button */}
          {hasMore && !searchTerm && !dateFilter && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
} 