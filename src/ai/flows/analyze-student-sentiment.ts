'use server';
/**
 * @fileOverview Analyzes the sentiment of student feedback.
 *
 * - analyzeStudentSentiment - A function that analyzes student feedback sentiment.
 * - AnalyzeStudentSentimentInput - The input type for the analyzeStudentSentiment function.
 * - AnalyzeStudentSentimentOutput - The return type for the analyzeStudentSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeStudentSentimentInputSchema = z.object({
  feedbackText: z
    .string()
    .describe('The text of the student feedback to analyze.'),
});
export type AnalyzeStudentSentimentInput = z.infer<
  typeof AnalyzeStudentSentimentInputSchema
>;

const AnalyzeStudentSentimentOutputSchema = z.object({
  sentiment: z
    .string()
    .describe(
      "The sentiment of the feedback, which can be 'Positif', 'Neutre', or 'Négatif'."
    ),
});
export type AnalyzeStudentSentimentOutput = z.infer<
  typeof AnalyzeStudentSentimentOutputSchema
>;

export async function analyzeStudentSentiment(
  input: AnalyzeStudentSentimentInput
): Promise<AnalyzeStudentSentimentOutput> {
  return analyzeStudentSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeStudentSentimentPrompt',
  input: {schema: AnalyzeStudentSentimentInputSchema},
  output: {schema: AnalyzeStudentSentimentOutputSchema},
  prompt: `Analysez le sentiment du feedback étudiant suivant.
  Répondez uniquement par 'Positif', 'Neutre' ou 'Négatif'.

  Feedback: {{{feedbackText}}}
  Sentiment:`,
});

const analyzeStudentSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeStudentSentimentFlow',
    inputSchema: AnalyzeStudentSentimentInputSchema,
    outputSchema: AnalyzeStudentSentimentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
