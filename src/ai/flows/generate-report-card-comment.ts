'use server';
/**
 * @fileOverview An AI agent to generate report card comments.
 *
 * - generateReportCardComment - A function that handles the comment generation.
 * - GenerateReportCardCommentInput - The input type for the function.
 * - GenerateReportCardCommentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Input Schema
export const GenerateReportCardCommentInputSchema = z.object({
  studentName: z.string().describe("Le nom de l'élève."),
  grades: z.string().describe("Un résumé des notes de l'élève par matière."),
  teacherName: z.string().describe("Le nom de l'enseignant ou 'Le Conseil de Classe'."),
});
export type GenerateReportCardCommentInput = z.infer<
  typeof GenerateReportCardCommentInputSchema
>;

// Output Schema
export const GenerateReportCardCommentOutputSchema = z.object({
  comment: z
    .string()
    .describe("L'appréciation générée pour le bulletin de l'élève."),
});
export type GenerateReportCardCommentOutput = z.infer<
  typeof GenerateReportCardCommentOutputSchema
>;

// Genkit Prompt
const commentPrompt = ai.definePrompt({
  name: 'generateReportCardCommentPrompt',
  input: {schema: GenerateReportCardCommentInputSchema},
  output: {schema: GenerateReportCardCommentOutputSchema},
  prompt: `Vous êtes un conseiller pédagogique expérimenté. Rédigez une appréciation concise et constructive pour le bulletin de l'élève {{studentName}}.

Informations clés :
- Nom de l'élève : {{studentName}}
- Rédigé par : {{teacherName}}
- Résumé des notes : {{grades}}

L'appréciation doit être encourageante tout en étant réaliste. Mettez en avant les points forts et suggérez des axes d'amélioration si nécessaire. Le ton doit être formel et bienveillant.`,
});

// Genkit Flow (main exported function)
export const generateReportCardComment = ai.defineFlow(
  {
    name: 'generateReportCardCommentFlow',
    inputSchema: GenerateReportCardCommentInputSchema,
    outputSchema: GenerateReportCardCommentOutputSchema,
  },
  async (input) => {
    const {output} = await commentPrompt(input);
    return output!;
  }
);
