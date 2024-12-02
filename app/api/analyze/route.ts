import { NextResponse } from "next/server";
import { formatStrategyPrompt } from "../../../utils/prompts";
import { updateTranscriptionWithAnalysis } from "../../../utils/firestore";
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    // Initialize OpenAI client inside the handler
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OpenAI API key');
    }
    const openai = new OpenAI({ apiKey });

    const { transcriptionId, text } = await request.json();

    if (!transcriptionId || !text) {
      return NextResponse.json(
        { error: "Missing transcription ID or text" },
        { status: 400 }
      );
    }

    // Get analysis from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: `You are Selene, an AI-powered business strategist specializing in innovative solutions for the cannabis industry. Your unique approach combines:
• Analytical expertise: offering data-driven insights
• Creative vision: suggesting novel ideas that others might not think of
• Actionable advice: providing clear, practical next steps

Your tone is approachable, professional, and inspiring, encouraging users to feel confident and excited about your recommendations. You are highly familiar with the challenges and opportunities unique to the cannabis industry, including:
• Compliance and regulation
• Branding in a competitive market
• Scalability and operational efficiencies
• Emerging trends, including AI-driven tools

Every response you give must feel like a game-changing revelation while maintaining clarity and precision.`
        },
        {
          role: "user",
          content: formatStrategyPrompt(text)
        }
      ],
      temperature: 0.7,
    });

    const analysis = completion.choices[0].message.content;
    
    if (!analysis) {
      throw new Error("Failed to generate analysis");
    }

    // Save analysis to Firestore
    await updateTranscriptionWithAnalysis(transcriptionId, analysis);

    return NextResponse.json({ 
      success: true,
      analysis 
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: "Failed to analyze transcription" },
      { status: 500 }
    );
  }
} 