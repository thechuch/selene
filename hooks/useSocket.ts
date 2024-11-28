import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { TranscriptionWithId } from '../types/firestore';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3001';

export function useSocket(
  onNewTranscription: (transcription: TranscriptionWithId) => void,
  onDeleteTranscription: (id: string) => void
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL);

    // Set up event listeners
    socketRef.current.on('newTranscription', (transcription: TranscriptionWithId) => {
      console.log('New transcription received:', transcription);
      onNewTranscription(transcription);
    });

    socketRef.current.on('deleteTranscription', (id: string) => {
      console.log('Delete transcription received:', id);
      onDeleteTranscription(id);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onNewTranscription, onDeleteTranscription]);

  return socketRef.current;
} 