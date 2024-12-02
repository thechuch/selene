"use client";

import { useState, useEffect } from 'react';
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
}

const ITEMS_PER_PAGE = 10;

export default function Library() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);

  const fetchTranscriptions = async (searchTerm = '', reset = false) => {
    try {
      setIsLoading(true);
      let q;

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        
        // Create two queries: one for text search and one for analysis search
        const textQuery = query(
          collection(db, 'transcriptions'),
          orderBy('textLower'),
          orderBy('timestamp', 'desc'),
          where('textLower', '>=', searchLower),
          where('textLower', '<=', searchLower + '\uf8ff'),
          limit(ITEMS_PER_PAGE)
        );

        const analysisQuery = query(
          collection(db, 'transcriptions'),
          orderBy('analysis.strategy'),
          where('analysis.strategy', '>=', searchLower),
          where('analysis.strategy', '<=', searchLower + '\uf8ff'),
          limit(ITEMS_PER_PAGE)
        );

        // Execute both queries
        const [textSnapshot, analysisSnapshot] = await Promise.all([
          getDocs(textQuery).catch(e => {
            console.error('Text search error:', e);
            return null;
          }),
          getDocs(analysisQuery).catch(e => {
            console.error('Analysis search error:', e);
            return null;
          })
        ]);

        // Combine and deduplicate results
        const results = new Map<string, any>();
        
        if (textSnapshot) {
          textSnapshot.docs.forEach(doc => {
            results.set(doc.id, { id: doc.id, ...doc.data(), matchType: 'text' });
          });
        }
        
        if (analysisSnapshot) {
          analysisSnapshot.docs.forEach(doc => {
            if (!results.has(doc.id)) {
              results.set(doc.id, { id: doc.id, ...doc.data(), matchType: 'analysis' });
            } else {
              // If document matches both queries, mark it as such
              results.get(doc.id).matchType = 'both';
            }
          });
        }

        // Convert map to array and sort by timestamp
        const combinedResults = Array.from(results.values())
          .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
          .slice(0, ITEMS_PER_PAGE);

        setTranscriptions(combinedResults);
        setLastVisible(null); // Reset pagination for combined results
        
        // Set total pages based on unique matches
        setTotalPages(Math.ceil(results.size / ITEMS_PER_PAGE));

      } else {
        // Regular listing without search
        q = query(
          collection(db, 'transcriptions'),
          orderBy('timestamp', 'desc'),
          ...(lastVisible && !reset ? [startAfter(lastVisible)] : []),
          limit(ITEMS_PER_PAGE)
        );

        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transcription[];

        setTranscriptions(docs);
        
        if (snapshot.docs.length > 0) {
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        } else {
          setLastVisible(null);
        }

        // Get total count for pagination
        const countSnapshot = await getDocs(collection(db, 'transcriptions'));
        setTotalPages(Math.ceil(countSnapshot.size / ITEMS_PER_PAGE));
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching transcriptions:', error);
      setIsLoading(false);
      
      // Show Firebase index creation link if that's the error
      if (error instanceof Error && error.message.includes('index')) {
        console.error('Firebase Index Creation Link:', error.message);
        const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com\S+/);
        if (urlMatch) {
          alert(`Please create the required index by visiting: ${urlMatch[0]}`);
        }
      }
    }
  };

  useEffect(() => {
    fetchTranscriptions();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTranscriptions(searchQuery, true);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      fetchTranscriptions(searchQuery);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      fetchTranscriptions(searchQuery, true);
    }
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
          <div className="w-24" /> {/* Spacer for alignment */}
        </div>

        {/* Search Bar */}
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

        {/* Transcriptions Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
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
                    <p className="text-gray-300 text-sm line-clamp-4">
                      {transcription.analysis.strategy}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-8 flex justify-center items-center space-x-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 