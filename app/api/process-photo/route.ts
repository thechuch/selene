import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin SDK inside the handler
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getAdminApp } = await import('../../../firebaseAdmin');

    const app = getAdminApp();
    if (!app) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    const db = getFirestore(app);

    // Initialize Google Cloud Vision client with credentials from environment variables
    const visionClient = new ImageAnnotatorClient({
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Remove data URL prefix to get pure base64 string
    const base64EncodedImage = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Create a buffer from the base64 string
    const imageBuffer = Buffer.from(base64EncodedImage, 'base64');

    // Perform text detection using Google Cloud Vision API
    const [result] = await visionClient.textDetection({ image: { content: imageBuffer } });
    const detections = result.fullTextAnnotation?.text;

    if (!detections) {
      return NextResponse.json({ error: 'No text detected in image' }, { status: 400 });
    }

    // Parse the extracted text to find relevant information
    const extractedData = parseBusinessCardText(detections);

    // Store the data in Firestore
    const docRef = await db.collection('businessCards').add({
      ...extractedData,
      rawText: detections,
      createdAt: new Date(),
      imageData: `data:image/png;base64,${base64EncodedImage}`,
    });

    return NextResponse.json({ 
      success: true, 
      data: { 
        id: docRef.id,
        ...extractedData 
      } 
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function parseBusinessCardText(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let name = '';
  let email = '';
  let phone = '';
  let company = '';
  let role = '';

  // Regular expressions for matching
  const emailRegex = /\S+@\S+\.\S+/;
  const phoneRegex = /(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/;
  const nameRegex = /^[A-Za-z\s.'-]+$/;

  lines.forEach((line) => {
    // Try to identify the line type
    if (!email && emailRegex.test(line)) {
      email = line.match(emailRegex)?.[0] || '';
    } else if (!phone && phoneRegex.test(line)) {
      phone = line.match(phoneRegex)?.[0] || '';
    } else if (!name && nameRegex.test(line) && line.length > 2) {
      name = line;
    } else if (!company && line.length > 2) {
      company = line;
    } else if (!role && line.length > 2) {
      role = line;
    }
  });

  return {
    name,
    email,
    phone,
    company,
    role,
    processedAt: new Date().toISOString()
  };
} 