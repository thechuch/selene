"use client";

import { useState, useEffect } from 'react';
import { FaSearch, FaChevronLeft, FaChevronRight, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import type { Transcription } from '../../types/firestore';

const ITEMS_PER_PAGE = 10;

export default function Library() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTranscriptions = async (page: number, search: string = '') => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...(search && { search })
      });

      const response = await fetch(`/api/library?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transcriptions');
      }

      const data = await response.json();
      setTranscriptions(data.transcriptions);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching transcriptions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch transcriptions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTranscriptions(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTranscriptions(1, searchQuery);
  };

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
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
          <>
            <div className="space-y-4">
              {transcriptions.map((transcription) => (
                <div key={transcription.id} className="bg-gray-900 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`text-sm ${getStatusColor(transcription.status)}`}>
                      {transcription.status.charAt(0).toUpperCase() + transcription.status.slice(1)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(transcription.timestamp.seconds * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-white">{transcription.text}</p>
                  {transcription.analysis && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                      <h3 className="text-yellow-400 mb-2">Analysis</h3>
                      <p className="text-gray-300">{transcription.analysis.strategy}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-8">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-900 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaChevronLeft />
              </button>
              <span className="text-gray-400">Page {currentPage}</span>
              <button
                onClick={handleNextPage}
                disabled={!hasMore}
                className="p-2 rounded-lg bg-gray-900 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaChevronRight />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 