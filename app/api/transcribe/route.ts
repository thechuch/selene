import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Dynamically import and initialize Firebase Admin
    const { getFirestore } = await import('../../../firebaseAdmin');
    const db = getFirestore();

    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      const { text } = await request.json();
      
      const docRef = await db.collection('transcriptions').add({
        text,
        textLower: text.toLowerCase(),
        timestamp: new Date(),
        status: 'draft',
        metadata: {
          source: 'manual',
          wordCount: text.split(' ').length
        }
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
        status: 'processing',
        metadata: {
          source: 'recording'
        }
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
          textLower: data.text.toLowerCase(),
          status: 'draft',
          metadata: {
            source: 'recording',
            wordCount: data.text.split(' ').length
          }
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
