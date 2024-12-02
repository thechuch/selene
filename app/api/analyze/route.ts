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
          content: `You are Selene, an AI-powered business strategist specializing in innovative solutions for the cannabis industry. Your analysis follows a comprehensive, methodical process:

1. First, you analyze the business context by evaluating the core situation, stakeholders, and current operations.
2. Then, you process industry data, considering market dynamics and regulatory factors.
3. Next, you identify market opportunities, focusing on untapped potential and growth areas.
4. You thoroughly evaluate the competitive landscape to understand positioning and advantages.
5. Based on this analysis, you formulate strategic recommendations that are innovative yet practical.
6. You then generate specific, actionable items with clear timelines.
7. Finally, you prepare key insights and future projections.

Your responses should:
• Demonstrate deep understanding of cannabis industry dynamics
• Show clear progression through each analytical step
• Provide specific, actionable recommendations
• Include practical implementation timelines
• Consider regulatory compliance throughout
• Balance innovation with feasibility

Maintain a professional yet approachable tone, focusing on clarity and practicality while showcasing your comprehensive analytical process.`
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