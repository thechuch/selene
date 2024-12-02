"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FaSearch, FaChevronLeft, FaChevronRight, FaArrowLeft } from 'react-icons/fa';
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
  matchType?: 'text' | 'analysis' | 'both';
}

const ITEMS_PER_PAGE = 10;

export default function Library() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastVisibleRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const createBaseQuery = useCallback(() => {
    return query(
      collection(db, 'transcriptions'),
      orderBy('timestamp', 'desc'),
      limit(ITEMS_PER_PAGE)
    );
  }, []);

  const createSearchQueries = useCallback((searchTerm: string) => {
    const searchLower = searchTerm.toLowerCase();
    return {
      textQuery: query(
        collection(db, 'transcriptions'),
        orderBy('textLower'),
        orderBy('timestamp', 'desc'),
        where('textLower', '>=', searchLower),
        where('textLower', '<=', searchLower + '\uf8ff'),
        limit(ITEMS_PER_PAGE)
      ),
      analysisQuery: query(
        collection(db, 'transcriptions'),
        orderBy('analysis.strategy'),
        where('analysis.strategy', '>=', searchLower),
        where('analysis.strategy', '<=', searchLower + '\uf8ff'),
        limit(ITEMS_PER_PAGE)
      )
    };
  }, []);

  const fetchTranscriptions = useCallback(async (searchTerm = '', reset = false) => {
    try {
      setIsLoading(true);
      setError(null);

      if (searchTerm) {
        const { textQuery, analysisQuery } = createSearchQueries(searchTerm);

        const [textSnapshot, analysisSnapshot] = await Promise.all([
          getDocs(textQuery).catch(() => null),
          getDocs(analysisQuery).catch(() => null)
        ]);

        const results = new Map<string, Transcription>();
        
        if (textSnapshot) {
          textSnapshot.docs.forEach(doc => {
            results.set(doc.id, { 
              id: doc.id, 
              ...doc.data(), 
              matchType: 'text' 
            } as Transcription);
          });
        }
        
        if (analysisSnapshot) {
          analysisSnapshot.docs.forEach(doc => {
            if (!results.has(doc.id)) {
              results.set(doc.id, { 
                id: doc.id, 
                ...doc.data(), 
                matchType: 'analysis' 
              } as Transcription);
            } else {
              const existing = results.get(doc.id);
              if (existing) {
                existing.matchType = 'both';
              }
            }
          });
        }

        const combinedResults = Array.from(results.values())
          .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
          .slice(0, ITEMS_PER_PAGE);

        setTranscriptions(combinedResults);
        lastVisibleRef.current = null;
        setTotalPages(Math.ceil(results.size / ITEMS_PER_PAGE));

      } else {
        const baseQuery = createBaseQuery();
        const q = reset ? baseQuery : 
          query(
            collection(db, 'transcriptions'),
            orderBy('timestamp', 'desc'),
            ...(lastVisibleRef.current ? [startAfter(lastVisibleRef.current)] : []),
            limit(ITEMS_PER_PAGE)
          );

        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transcription[];

        setTranscriptions(docs);
        lastVisibleRef.current = snapshot.docs[snapshot.docs.length - 1] || null;

        if (reset) {
          const countSnapshot = await getDocs(collection(db, 'transcriptions'));
          setTotalPages(Math.ceil(countSnapshot.size / ITEMS_PER_PAGE));
        }
      }
    } catch (error) {
      console.error('Error fetching transcriptions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch transcriptions');
      if (error instanceof Error && error.message.includes('index')) {
        const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com\S+/);
        if (urlMatch) {
          setError(`Please create the required index by visiting: ${urlMatch[0]}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [createBaseQuery, createSearchQueries]);

  // Debounced search
  const debouncedSearch = useCallback((searchTerm: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchTranscriptions(searchTerm, true);
    }, 300);
  }, [fetchTranscriptions]);

  // Initial load
  useEffect(() => {
    fetchTranscriptions('', true);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [fetchTranscriptions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    debouncedSearch(searchQuery);
  };

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      fetchTranscriptions(searchQuery);
    }
  }, [currentPage, totalPages, fetchTranscriptions, searchQuery]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      fetchTranscriptions(searchQuery, true);
    }
  }, [currentPage, fetchTranscriptions, searchQuery]);

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

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/"
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Recorder</span>
          </Link>
          <h1 className="text-4xl font-light bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-700 text-transparent bg-clip-text">
            Transcription Library
          </h1>
          <div className="w-24" />
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcriptions..."
              className="w-full bg-gray-900 text-white rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-8 text-red-500">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
          </div>
        ) : transcriptions.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {searchQuery ? 'No matching transcriptions found.' : 'No transcriptions yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {transcriptions.map((transcription) => (
              <div
                key={transcription.id}
                className="bg-gray-800 rounded-lg p-6 transition-all hover:ring-2 hover:ring-yellow-400/50"
              >
                <div className="mb-4">
                  <p className="text-gray-300 line-clamp-3">{transcription.text}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span className={`${getStatusColor(transcription.status)}`}>
                      {transcription.status.charAt(0).toUpperCase() + transcription.status.slice(1)}
                    </span>
                    {searchQuery && transcription.matchType && (
                      <span className="text-xs px-2 py-1 rounded bg-gray-700">
                        {transcription.matchType === 'both' 
                          ? 'Matches text & analysis'
                          : `Matches ${transcription.matchType}`}
                      </span>
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
              </div>
            ))}
          </div>
        )}

        {!isLoading && transcriptions.length > 0 && (
          <div className="flex justify-center items-center space-x-4 mt-8">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 