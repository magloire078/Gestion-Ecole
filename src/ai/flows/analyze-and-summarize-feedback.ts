'use server';
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

export async function analyzeAndSummarizeFeedback(
  input: AnalyzeAndSummarizeFeedbackInput
): Promise<AnalyzeAndSummarizeFeedbackOutput> {
  // Mock implementation since Genkit is removed
  return {
    sentiment: 'Neutre',
    summary: 'Analyse IA non disponible.',
    keyImprovementAreas: 'Indisponible',
  };
}
