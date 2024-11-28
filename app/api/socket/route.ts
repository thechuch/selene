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

  socket.on('transcriptionStart', () => {
    console.log('Transcription started');
  });

  socket.on('transcriptionUpdate', (text) => {
    socket.broadcast.emit('transcriptionUpdate', text);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const port = process.env.SOCKET_PORT || 3001;
io.listen(Number(port));

export async function GET() {
  return NextResponse.json({ status: 'Socket server running' });
} 