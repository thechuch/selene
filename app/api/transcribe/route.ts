import { NextResponse } from "next/server";
import firestore from "../../../firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    console.log("Starting transcription request...");
    console.log("Environment check:", {
      hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    });

    const formData = await request.formData();
    console.log("FormData received");

    // Retrieve the audio file from the form data
    const audioFile = formData.get("file");
    console.log("Audio file retrieved:", audioFile instanceof Blob ? "Blob" : typeof audioFile, "Size:", audioFile instanceof Blob ? audioFile.size : 'N/A');
    
    if (!audioFile || !(audioFile instanceof Blob)) {
      console.error("Invalid audio file provided");
      return NextResponse.json(
        { error: "Invalid audio file provided" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not found");
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Convert to proper audio format if needed
    const audioBlob = new Blob([audioFile], { type: 'audio/webm' });
    console.log("Audio blob created, size:", audioBlob.size);

    console.log("Creating OpenAI form data...");
    const openaiFormData = new FormData();
    openaiFormData.append("file", audioBlob, "recording.webm");
    openaiFormData.append("model", "whisper-1");
    console.log("OpenAI form data created");

    console.log("Sending request to OpenAI...");
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: openaiFormData,
      }
    );
    console.log("OpenAI response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API Error:", errorText);
      console.error("OpenAI API Status:", response.status);
      console.error("OpenAI API Headers:", Object.fromEntries(response.headers.entries()));
      return NextResponse.json(
        { error: `OpenAI API Error: ${errorText}` },
        { status: response.status }
      );
    }

    console.log("Parsing OpenAI response...");
    const data = await response.json();
    console.log("Transcription received:", data.text);

    // Try to save to Firestore if available
    if (firestore) {
      try {
        console.log("Attempting to save to Firestore...");
        const db = firestore.collection('selene-firestore-database');
        await db.doc('transcriptions').collection('records').add({
          text: data.text,
          createdAt: FieldValue.serverTimestamp(),
          timestamp: new Date().toISOString(),
        });
        console.log("Saved to Firestore successfully");
      } catch (firestoreError) {
        console.error("Failed to save to Firestore:", firestoreError);
        // Continue without Firestore
      }
    } else {
      console.log("Firestore not initialized, skipping save");
    }

    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error("Detailed error information:");
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error type:", String(error));
    }
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
