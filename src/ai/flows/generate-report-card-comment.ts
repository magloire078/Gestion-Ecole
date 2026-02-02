'use server';
/**
 * @fileOverview AI flow for generating report card comments.
 *
 * - generateReportCardComment - A function that generates an appreciation for a student.
 * - ReportCardCommentInput - The input type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const ReportCardCommentInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  subject: z.string().describe('The subject for which the comment is being generated.'),
  average: z.number().describe('The student\'s average grade in the subject (out of 20).'),
  teacherName: z.string().describe('The name of the teacher for the subject.'),
});
export type ReportCardCommentInput = z.infer<typeof ReportCardCommentInputSchema>;

const AppreciationOutputSchema = z.object({
  appreciation: z.string().describe("A constructive and personalized comment for the report card, written in French. It should be encouraging and around 1-3 sentences long."),
});

const commentPrompt = ai.definePrompt({
    name: 'reportCardCommentPrompt',
    input: { schema: ReportCardCommentInputSchema },
    output: { schema: AppreciationOutputSchema },
    prompt: `
        You are an experienced educator in the Ivorian school system.
        Your task is to write a brief, constructive, and encouraging report card comment ('appréciation') in French.
        
        Student: {{{studentName}}}
        Subject: {{{subject}}}
        Teacher: {{{teacherName}}}
        Student's Average (out of 20): {{{average}}}

        Based on the average, write a personalized comment.
        - If the average is high (e.g., > 14), be very encouraging and praise the student's work.
        - If the average is medium (e.g., 10-14), be encouraging but also suggest areas for improvement or continued effort.
        - If the average is low (e.g., < 10), be constructive and encouraging. Focus on the effort needed to improve rather than just the low grade. Mention specific actions if possible (e.g., "participer davantage", "revoir régulièrement les leçons").
        - The tone should be professional and supportive.
        
        Generate only the 'appréciation' field in the output.
    `,
});

const generateCommentFlow = ai.defineFlow(
  {
    name: 'generateCommentFlow',
    inputSchema: ReportCardCommentInputSchema,
    outputSchema: AppreciationOutputSchema,
  },
  async (input) => {
    const { output } = await commentPrompt(input);
    return output!;
  }
);


export async function generateReportCardComment(input: ReportCardCommentInput): Promise<string> {
    const result = await generateCommentFlow(input);
    return result.appreciation;
}
