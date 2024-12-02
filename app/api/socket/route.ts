import { Server } from 'socket.io';
import { NextResponse } from 'next/server';

let io: Server | null = null;

export async function GET() {
  if (!io) {
    io = new Server({
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected');

      socket.on('transcriptionCreated', (transcription) => {
        // Broadcast to all other clients
        socket.broadcast.emit('newTranscription', transcription);
      });

      socket.on('transcriptionDeleted', (id) => {
        socket.broadcast.emit('deleteTranscription', id);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });

    try {
      const port = process.env.SOCKET_PORT || 3004;
      io.listen(Number(port));
      console.log(`Socket server running on port ${port}`);
    } catch (error) {
      console.error('Socket server error:', error);
      // Don't throw error, just log it
    }
  }

  return NextResponse.json({ status: 'WebSocket server running' });
} 