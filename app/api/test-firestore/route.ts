import { NextResponse } from "next/server";
import db from "../../../firebaseAdmin";
import * as admin from 'firebase-admin';

interface ErrorDetails {
  message: string;
  name: string;
  code?: string;
  details?: unknown;
  stack?: string;
}

export async function GET() {
  try {
    console.log("Starting Firestore test...");
    
    // Test basic connectivity
    await db.collection('_healthcheck').doc('test').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'ok'
    });
    
    console.log("Health check document created");
    
    // Get all collections
    const collections = await db.listCollections();
    console.log("Available collections:", collections.map(col => col.id));
    
    // Test write with more fields
    const testRef = await db.collection('test').add({
      message: 'Test message',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
      metadata: {
        environment: process.env.NODE_ENV,
        test: true
      }
    });
    
    console.log("Document written with ID:", testRef.id);
    
    // Try to read it back
    const docSnapshot = await testRef.get();
    const docData = docSnapshot.data();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Firestore connection successful',
      docId: testRef.id,
      collections: collections.map(col => col.id),
      testDocument: docData
    });
    
  } catch (error) {
    console.error('Firestore test failed:', error);
    
    // Get more error details
    const errorDetails: ErrorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as { code?: string }).code,
      details: (error as { details?: unknown }).details,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    
    console.error('Detailed error:', errorDetails);
    
    return NextResponse.json({ 
      success: false, 
      error: errorDetails,
      config: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        region: process.env.FIREBASE_REGION || 'default',
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
} 