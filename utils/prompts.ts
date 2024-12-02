export const BUSINESS_STRATEGY_PROMPT = `Below is a transcription from a cannabis industry business conversation. Based on our comprehensive analysis process, provide strategic insights organized into the following sections:

1. Business Context Analysis
   • Evaluate the core business situation and challenges
   • Identify key stakeholders and their needs
   • Assess current business model and operations

2. Industry Data & Market Position
   • Analyze relevant industry trends and data points
   • Evaluate market dynamics specific to the cannabis sector
   • Consider regulatory and compliance factors

3. Market Opportunities
   • Identify untapped market segments or niches
   • Highlight potential growth areas
   • Assess scalability opportunities

4. Competitive Landscape
   • Analyze competitive advantages and challenges
   • Identify market differentiators
   • Evaluate industry positioning

5. Strategic Recommendations
   • Propose innovative solutions aligned with business goals
   • Suggest technology and operational improvements
   • Outline potential partnerships or collaborations

6. Action Items
   • Provide clear, prioritized next steps
   • Include timeline recommendations
   • Define key success metrics

7. Key Insights & Future Outlook
   • Summarize critical insights
   • Project potential long-term impacts
   • Highlight future industry considerations

Please ensure recommendations are practical, cannabis-industry specific, and immediately actionable.

Transcript:
"""
{transcription}
"""`;

export const formatStrategyPrompt = (transcription: string) => {
  return BUSINESS_STRATEGY_PROMPT.replace('{transcription}', transcription);
};