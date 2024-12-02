import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Check for migration secret to prevent unauthorized access
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.MIGRATION_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { getFirestore } = await import('../../../firebaseAdmin');
    const db = getFirestore();
    
    // Get all transcriptions
    const snapshot = await db.collection('transcriptions').get();
    
    const updates: Promise<any>[] = [];
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each document
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Only update if textLower doesn't exist and text exists
      if (!data.textLower && data.text && typeof data.text === 'string' && data.text !== 'Processing...') {
        updates.push(
          doc.ref.update({
            textLower: data.text.toLowerCase(),
            updatedAt: new Date()
          })
          .then(() => { updatedCount++; })
          .catch(error => {
            errorCount++;
            errors.push(`Error updating doc ${doc.id}: ${error.message}`);
          })
        );
      }
    });

    // Wait for all updates to complete
    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      totalDocuments: snapshot.size,
      updatedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: "Migration failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 