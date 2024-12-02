import { NextResponse } from "next/server";
import { getTranscriptions, getTranscription, deleteTranscription, updateTranscription } from "../../../utils/firestore";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      const transcription = await getTranscription(id);
      return NextResponse.json(transcription);
    }
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const { transcriptions, hasMore } = await getTranscriptions(page, limit);
    
    return NextResponse.json({ transcriptions, hasMore });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcriptions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing transcription ID' },
        { status: 400 }
      );
    }
    
    await deleteTranscription(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transcription' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing transcription ID' },
        { status: 400 }
      );
    }

    const { text, submit } = await request.json();
    if (!text) {
      return NextResponse.json(
        { error: 'Missing text' },
        { status: 400 }
      );
    }

    // If submit is true, mark as completed and trigger analysis
    if (submit) {
      const { getFirestore } = await import('../../../firebaseAdmin');
      const db = getFirestore();
      await db.collection('transcriptions').doc(id).update({
        text,
        textLower: text.toLowerCase(),
        'metadata.source': 'edited',
        'metadata.wordCount': text.split(' ').length,
        'status': 'completed',
        updatedAt: new Date()
      });

      // Trigger analysis
      const response = await fetch(`${request.headers.get('origin')}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcriptionId: id, text }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger analysis');
      }

      return NextResponse.json({ success: true, analyzed: true });
    } else {
      // Just update the text and keep as draft
      const { getFirestore } = await import('../../../firebaseAdmin');
      const db = getFirestore();
      await db.collection('transcriptions').doc(id).update({
        text,
        textLower: text.toLowerCase(),
        'status': 'draft',
        updatedAt: new Date()
      });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to update transcription' },
      { status: 500 }
    );
  }
} 