export const BUSINESS_STRATEGY_PROMPT = `Below is a transcription of a business-related conversation from the cannabis industry. Your task is to analyze and provide strategic insights based on the following areas:

1. Core Challenge or Opportunity
   Identify the main challenge or opportunity discussed in the transcript.

2. Innovative Solutions
   Suggest creative, outside-the-box strategies tailored to the cannabis industry.

3. Action Plan
   Break down actionable next steps the user can take, emphasizing feasibility and impact.

4. Future Potential
   Highlight long-term opportunities that could arise if these strategies are implemented.

Ensure your response is engaging, insightful, and leaves the user with a sense of excitement about the next steps.

Transcript:
"""
{transcription}
"""`;

export const formatStrategyPrompt = (transcription: string) => {
  return BUSINESS_STRATEGY_PROMPT.replace('{transcription}', transcription);
};