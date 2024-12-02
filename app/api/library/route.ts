import { NextResponse } from "next/server";
import { getTranscriptions } from "../../../utils/firestore";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const searchQuery = searchParams.get('search')?.trim() || '';
    
    const { transcriptions, hasMore } = await getTranscriptions(page, limit, searchQuery);
    
    return NextResponse.json({
      transcriptions,
      hasMore,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch transcriptions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 