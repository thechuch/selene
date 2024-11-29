import { Server } from 'socket.io';
import { NextResponse } from 'next/server';

const io = new Server({
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

const port = process.env.SOCKET_PORT || 3004;
io.listen(Number(port));

export async function GET() {
  return NextResponse.json({ status: 'WebSocket server running' });
} 