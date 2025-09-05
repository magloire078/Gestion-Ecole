'use server';
/**
 * @fileOverview Summarizes student feedback on teachers and courses.
 *
 * - summarizeStudentFeedback - A function that summarizes student feedback.
 * - SummarizeStudentFeedbackInput - The input type for the summarizeStudentFeedback function.
 * - SummarizeStudentFeedbackOutput - The return type for the summarizeStudentFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeStudentFeedbackInputSchema = z.object({
  feedbackText: z
    .string()
    .describe('The text of the student feedback to summarize.'),
});
export type SummarizeStudentFeedbackInput = z.infer<
  typeof SummarizeStudentFeedbackInputSchema
>;

const SummarizeStudentFeedbackOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the student feedback.'),
  keyImprovementAreas: z
    .string()
    .describe('Key areas for improvement identified from the feedback.'),
});
export type SummarizeStudentFeedbackOutput = z.infer<
  typeof SummarizeStudentFeedbackOutputSchema
>;

export async function summarizeStudentFeedback(
  input: SummarizeStudentFeedbackInput
): Promise<SummarizeStudentFeedbackOutput> {
  return summarizeStudentFeedbackFlow(input);
}

const summarizeStudentFeedbackPrompt = ai.definePrompt({
  name: 'summarizeStudentFeedbackPrompt',
  input: {schema: SummarizeStudentFeedbackInputSchema},
  output: {schema: SummarizeStudentFeedbackOutputSchema},
  prompt: `You are an AI assistant helping school directors understand student feedback.
  Summarize the following student feedback, and identify key areas for improvement.
  \nFeedback: {{{feedbackText}}}
  \nSummary:
  Key Improvement Areas: `,
});

const summarizeStudentFeedbackFlow = ai.defineFlow(
  {
    name: 'summarizeStudentFeedbackFlow',
    inputSchema: SummarizeStudentFeedbackInputSchema,
    outputSchema: SummarizeStudentFeedbackOutputSchema,
  },
  async input => {
    const {output} = await summarizeStudentFeedbackPrompt(input);
    return output!;
  }
);
