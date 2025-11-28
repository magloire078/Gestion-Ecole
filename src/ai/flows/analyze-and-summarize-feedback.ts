
'use server';
import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const AnalyzeAndSummarizeFeedbackInputSchema = z.object({
  feedbackText: z.string().describe('The feedback text to analyze.'),
});
export type AnalyzeAndSummarizeFeedbackInput = z.infer<
  typeof AnalyzeAndSummarizeFeedbackInputSchema
>;

export const AnalyzeAndSummarizeFeedbackOutputSchema = z.object({
  sentiment: z.string().describe('The sentiment of the feedback.'),
  summary: z.string().describe('A summary of the feedback.'),
  keyImprovementAreas: z
    .string()
    .describe('Key areas for improvement based on the feedback.'),
});
export type AnalyzeAndSummarizeFeedbackOutput = z.infer<
  typeof AnalyzeAndSummarizeFeedbackOutputSchema
>;

const prompt = ai.definePrompt(
  {
    name: 'analyzeAndSummarizeFeedbackPrompt',
    input: {schema: AnalyzeAndSummarizeFeedbackInputSchema},
    output: {schema: AnalyzeAndSummarizeFeedbackOutputSchema},
    prompt: `Analyze the following student feedback and provide a summary, sentiment analysis (Positif, Négatif, Neutre), and key improvement areas.

Feedback:
"{{feedbackText}}"`,
  },
);

export async function analyzeAndSummarizeFeedback(
  input: AnalyzeAndSummarizeFeedbackInput
): Promise<AnalyzeAndSummarizeFeedbackOutput> {
  const {output} = await prompt(input);
  return output!;
}
