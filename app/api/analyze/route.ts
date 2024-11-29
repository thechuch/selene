import { NextResponse } from "next/server";
import { formatStrategyPrompt } from "../../../utils/prompts";
import { updateTranscriptionWithAnalysis } from "../../../utils/firestore";
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
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
          content: "You are an expert business strategist with experience helping small and medium businesses grow."
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