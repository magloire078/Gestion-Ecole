'use server';
/**
 * @fileOverview An AI agent to generate report card comments.
 *
 * - generateReportCardComment - A function that handles the comment generation.
 * - GenerateReportCardCommentInput - The input type for the function.
 * - GenerateReportCardCommentOutput - The return type for the function.
 */

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

// Main exported function (mocked)
export async function generateReportCardComment(
  input: GenerateReportCardCommentInput
): Promise<GenerateReportCardCommentOutput> {
  return {
      comment: "Génération de commentaire IA non disponible. Élève sérieux et travailleur."
  }
}
