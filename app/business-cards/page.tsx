"use client";

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { FaEnvelope, FaPhone, FaBuilding, FaUser } from 'react-icons/fa';
import Image from 'next/image';

interface BusinessCard {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  imageData: string;
  createdAt: Date;
}

export default function BusinessCardsPage() {
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBusinessCards() {
      try {
        setIsLoading(true);
        setError(null);
        
        const q = query(collection(db, 'businessCards'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedCards = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as BusinessCard[];

        setCards(fetchedCards);
      } catch (err) {
        console.error('Error fetching business cards:', err);
        setError('Failed to load business cards. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBusinessCards();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Business Cards</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-400 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Business Cards</h1>
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Business Cards</h1>
        
        {cards.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No business cards found. Try scanning some cards first!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div 
                key={card.id}
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
              >
                {card.imageData && (
                  <div className="relative h-48 bg-gray-700">
                    <Image
                      src={card.imageData}
                      alt={`Business card for ${card.name}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{card.name}</h3>
                  
                  {card.role && (
                    <div className="flex items-center text-gray-400 mb-2">
                      <FaUser className="w-4 h-4 mr-2" />
                      <span>{card.role}</span>
                    </div>
                  )}
                  
                  {card.company && (
                    <div className="flex items-center text-gray-400 mb-2">
                      <FaBuilding className="w-4 h-4 mr-2" />
                      <span>{card.company}</span>
                    </div>
                  )}
                  
                  {card.email && (
                    <div className="flex items-center text-gray-400 mb-2">
                      <FaEnvelope className="w-4 h-4 mr-2" />
                      <a 
                        href={`mailto:${card.email}`}
                        className="hover:text-yellow-400 transition-colors"
                      >
                        {card.email}
                      </a>
                    </div>
                  )}
                  
                  {card.phone && (
                    <div className="flex items-center text-gray-400">
                      <FaPhone className="w-4 h-4 mr-2" />
                      <a 
                        href={`tel:${card.phone}`}
                        className="hover:text-yellow-400 transition-colors"
                      >
                        {card.phone}
                      </a>
                    </div>
                  )}
                </div>
                
                <div className="px-6 py-4 bg-gray-700/50">
                  <div className="text-sm text-gray-400">
                    Added {card.createdAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 