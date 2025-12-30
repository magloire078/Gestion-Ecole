'use server';
/**
 * @fileoverview A Genkit flow for generating student report card comments.
 *
 * This file defines a Genkit flow that takes a student's name, grades,
 * teacher's name, and subject as input, and generates a constructive
 * and personalized comment for their report card.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Define the input schema for the flow
export const GenerateCommentInputSchema = z.object({
  studentName: z.string().describe('The first name of the student.'),
  teacherName: z.string().describe("The teacher's name."),
  subject: z.string().describe('The subject for which the comment is being generated.'),
  average: z.number().describe("The student's average grade in the subject."),
});
export type GenerateCommentInput = z.infer<typeof GenerateCommentInputSchema>;

// Define the output schema for the flow
export const GenerateCommentOutputSchema = z.object({
  comment: z
    .string()
    .describe('The generated, constructive, and personalized comment.'),
});
export type GenerateCommentOutput = z.infer<typeof GenerateCommentOutputSchema>;


const commentPrompt = ai.definePrompt(
  {
    name: 'reportCardCommentPrompt',
    input: {
      schema: GenerateCommentInputSchema,
    },
    output: {
      schema: GenerateCommentOutputSchema,
    },
    prompt: `You are an experienced teaching assistant tasked with writing a report card comment for a student.

You will be provided with:
- The student's name: {{{studentName}}}
- The teacher's name: {{{teacherName}}}
- The subject: {{{subject}}}
- The student's average grade: {{{average}}} / 20

Your task is to generate a short, constructive, and personalized comment (1-2 sentences).

- If the average is below 10, the tone should be encouraging, highlighting areas for improvement and suggesting effort.
- If the average is between 10 and 14, the tone should be positive but mention that there is still room for progress.
- If the average is above 14, the tone should be very positive, congratulatory, and encouraging them to continue their excellent work.

Address the student by their first name. The comment should be written in French.
Do not sign the comment.
`,
  },
);


const generateCommentFlow = ai.defineFlow(
  {
    name: 'generateCommentFlow',
    inputSchema: GenerateCommentInputSchema,
    outputSchema: GenerateCommentOutputSchema,
  },
  async (input) => {
    const { output } = await commentPrompt(input);
    return output!;
  }
);


export async function generateReportCardComment(
  input: GenerateCommentInput
): Promise<GenerateCommentOutput> {
  return generateCommentFlow(input);
}
