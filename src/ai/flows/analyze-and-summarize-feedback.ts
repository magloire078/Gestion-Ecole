'use server';
/**
 * @fileOverview Analyzes and summarizes student feedback, providing both sentiment and a concise summary.
 *
 * - analyzeAndSummarizeFeedback - A function that analyzes and summarizes student feedback.
 * - AnalyzeAndSummarizeFeedbackInput - The input type for the function.
 * - AnalyzeAndSummarizeFeedbackOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeAndSummarizeFeedbackInputSchema = z.object({
  feedbackText: z
    .string()
    .describe('The text of the student feedback to analyze and summarize.'),
});
export type AnalyzeAndSummarizeFeedbackInput = z.infer<
  typeof AnalyzeAndSummarizeFeedbackInputSchema
>;

const AnalyzeAndSummarizeFeedbackOutputSchema = z.object({
  sentiment: z
    .string()
    .describe(
      "The overall sentiment of the feedback, which can be 'Positif', 'Neutre', or 'Négatif'."
    ),
  summary: z
    .string()
    .describe('A concise summary of the student feedback.'),
  keyImprovementAreas: z
    .string()
    .describe('Key areas for improvement identified from the feedback.'),
});
export type AnalyzeAndSummarizeFeedbackOutput = z.infer<
  typeof AnalyzeAndSummarizeFeedbackOutputSchema
>;

export async function analyzeAndSummarizeFeedback(
  input: AnalyzeAndSummarizeFeedbackInput
): Promise<AnalyzeAndSummarizeFeedbackOutput> {
  return analyzeAndSummarizeFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeAndSummarizeFeedbackPrompt',
  input: {schema: AnalyzeAndSummarizeFeedbackInputSchema},
  output: {schema: AnalyzeAndSummarizeFeedbackOutputSchema},
  prompt: `You are an AI assistant helping school directors understand student feedback.
Analyze the following student feedback text. You must perform three tasks:
1. Determine the overall sentiment. It must be one of: 'Positif', 'Neutre', or 'Négatif'.
2. Provide a concise summary of the feedback.
3. Identify key areas for improvement based on the feedback.

Feedback: {{{feedbackText}}}
`,
});

const analyzeAndSummarizeFeedbackFlow = ai.defineFlow(
  {
    name: 'analyzeAndSummarizeFeedbackFlow',
    inputSchema: AnalyzeAndSummarizeFeedbackInputSchema,
    outputSchema: AnalyzeAndSummarizeFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
