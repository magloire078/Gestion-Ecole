'use server';
/**
 * @fileOverview Generates a general comment for a student's report card.
 *
 * - generateReportCardComment - A function that generates a report card comment.
 * - GenerateReportCardCommentInput - The input type for the function.
 * - GenerateReportCardCommentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReportCardCommentInputSchema = z.object({
  studentName: z.string().describe("The student's name."),
  grades: z.string().describe("A summary of the student's grades by subject (e.g., 'Math: 15/20, French: 12/20')."),
  teacherName: z.string().describe("The name of the teacher or council writing the comment."),
});
export type GenerateReportCardCommentInput = z.infer<typeof GenerateReportCardCommentInputSchema>;

const GenerateReportCardCommentOutputSchema = z.object({
  comment: z.string().describe('The generated general comment for the report card.'),
});
export type GenerateReportCardCommentOutput = z.infer<typeof GenerateReportCardCommentOutputSchema>;

export async function generateReportCardComment(
  input: GenerateReportCardCommentInput
): Promise<GenerateReportCardCommentOutput> {
  return generateReportCardCommentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReportCardCommentPrompt',
  input: {schema: GenerateReportCardCommentInputSchema},
  output: {schema: GenerateReportCardCommentOutputSchema},
  prompt: `Vous êtes un conseiller pédagogique expérimenté. Rédigez une appréciation générale pour le bulletin de l'élève en vous basant sur les informations suivantes.
Le ton doit être encourageant mais réaliste. Mettez en avant les points forts et suggérez des pistes d'amélioration si nécessaire.

Nom de l'élève: {{{studentName}}}
Notes: {{{grades}}}
Rédigé par: {{{teacherName}}}

Appréciation générale:
`,
});

const generateReportCardCommentFlow = ai.defineFlow(
  {
    name: 'generateReportCardCommentFlow',
    inputSchema: GenerateReportCardCommentInputSchema,
    outputSchema: GenerateReportCardCommentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
