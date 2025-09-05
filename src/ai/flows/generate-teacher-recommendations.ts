// src/ai/flows/generate-teacher-recommendations.ts
'use server';
/**
 * @fileOverview Generates personalized recommendation letter drafts for teachers.
 *
 * - generateTeacherRecommendations - A function that generates recommendation letter drafts.
 * - GenerateTeacherRecommendationsInput - The input type for the generateTeacherRecommendations function.
 * - GenerateTeacherRecommendationsOutput - The return type for the generateTeacherRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTeacherRecommendationsInputSchema = z.object({
  teacherName: z.string().describe('The name of the teacher.'),
  className: z.string().describe('The name of the class the teacher taught.'),
  studentPerformanceData: z.string().describe('Student performance data for the class. Provide a detailed summary.'),
  directorName: z.string().describe('The name of the school director.'),
  schoolName: z.string().describe('The name of the school.'),
  teacherSkills: z.array(z.string()).describe('List of teacher skills.'),
});

export type GenerateTeacherRecommendationsInput = z.infer<typeof GenerateTeacherRecommendationsInputSchema>;

const GenerateTeacherRecommendationsOutputSchema = z.object({
  recommendationLetterDraft: z.string().describe('A draft of the recommendation letter for the teacher.'),
});

export type GenerateTeacherRecommendationsOutput = z.infer<typeof GenerateTeacherRecommendationsOutputSchema>;

export async function generateTeacherRecommendations(input: GenerateTeacherRecommendationsInput): Promise<GenerateTeacherRecommendationsOutput> {
  return generateTeacherRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTeacherRecommendationsPrompt',
  input: {
    schema: GenerateTeacherRecommendationsInputSchema,
  },
  output: {
    schema: GenerateTeacherRecommendationsOutputSchema,
  },
  prompt: `You are an AI assistant tasked with drafting recommendation letters for teachers. You will use the provided information about the teacher, their class, and student performance to create a supportive and relevant recommendation.

Teacher Name: {{{teacherName}}}
Class Name: {{{className}}}
Student Performance Data: {{{studentPerformanceData}}}
Director Name: {{{directorName}}}
School Name: {{{schoolName}}}
Teacher Skills: {{#each teacherSkills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Draft a recommendation letter that highlights the teacher's strengths, addresses any challenges, and emphasizes their positive impact on student learning.
`,
});

const generateTeacherRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateTeacherRecommendationsFlow',
    inputSchema: GenerateTeacherRecommendationsInputSchema,
    outputSchema: GenerateTeacherRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
