import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { getFirestore } = await import('../../../firebaseAdmin');
    const db = getFirestore();
    
    // Get the most recent transcription
    const snapshot = await db.collection('transcriptions')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ message: "No transcriptions found" });
    }

    const doc = snapshot.docs[0];
    return NextResponse.json({
      id: doc.id,
      data: doc.data()
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: "Failed to test Firestore" },
      { status: 500 }
    );
  }
} 