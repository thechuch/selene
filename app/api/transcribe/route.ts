import { NextResponse } from "next/server";
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    
    let text: string;
    
    if (contentType.includes("application/json")) {
      const json = await request.json();
      text = json.text;
    } else {
      const formData = await request.formData();
      const audioFile = formData.get("file");
      
      if (!audioFile || !(audioFile instanceof Blob)) {
        return NextResponse.json(
          { error: "Invalid audio file" },
          { status: 400 }
        );
      }

      // Convert audio file to buffer
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      
      try {
        // Create a new document in the transcriptions collection
        const docRef = await db.collection('transcriptions').add({
          text: "Processing...",
          timestamp: new Date(),
          status: 'processing'
        });

        // Your OpenAI transcription logic here
        // After successful transcription:
        await docRef.update({
          text: "Transcription placeholder", // Replace with actual transcription
          status: 'completed'
        });
        
        return NextResponse.json({
          text: "Transcription placeholder", // Replace with actual transcription
          saved: true,
          id: docRef.id
        });
        
      } catch (error) {
        console.error("Firestore operation failed:", error);
        return NextResponse.json(
          { error: "Database operation failed", details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }
    
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
