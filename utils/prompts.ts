export const BUSINESS_STRATEGY_PROMPT = `As an expert business strategist, analyze the following conversation with a business owner and create a strategic recommendation. Focus on:

1. Core Business Challenges
2. Immediate Opportunities
3. Strategic Recommendations
4. Action Steps

Conversation transcript:
"""
{transcription}
"""

Provide a structured analysis that the business owner can immediately act upon.`;

export const formatStrategyPrompt = (transcription: string) => {
  return BUSINESS_STRATEGY_PROMPT.replace('{transcription}', transcription);
};