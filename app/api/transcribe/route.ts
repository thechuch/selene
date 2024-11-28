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
    
    if (contentType.includes("application/json")) {
      const { text } = await request.json();
      
      const docRef = await db.collection('transcriptions').add({
        text,
        timestamp: new Date(),
        status: 'completed'
      });

      return NextResponse.json({
        text,
        saved: true,
        id: docRef.id
      });
    } else {
      const formData = await request.formData();
      const audioFile = formData.get("file");
      
      if (!audioFile || !(audioFile instanceof Blob)) {
        return NextResponse.json(
          { error: "Invalid audio file" },
          { status: 400 }
        );
      }

      // Create a new document first
      const docRef = await db.collection('transcriptions').add({
        text: "Processing...",
        timestamp: new Date(),
        status: 'processing'
      });

      try {
        // Process audio file with OpenAI
        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("model", "whisper-1");

        const response = await fetch(
          "https://api.openai.com/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Update the document with transcription
        await docRef.update({
          text: data.text,
          status: 'completed'
        });
        
        return NextResponse.json({
          text: data.text,
          saved: true,
          id: docRef.id
        });
        
      } catch (error) {
        // Update document with error status
        await docRef.update({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        console.error("Transcription failed:", error);
        return NextResponse.json(
          { error: "Transcription failed", details: error instanceof Error ? error.message : 'Unknown error' },
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
