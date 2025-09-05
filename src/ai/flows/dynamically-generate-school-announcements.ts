'use server';
/**
 * @fileOverview Dynamically generates school announcements for the banner, prioritizing relevant updates based on user roles and school events.
 *
 * - generateSchoolAnnouncement - A function that generates school announcements.
 * - GenerateSchoolAnnouncementInput - The input type for the generateSchoolAnnouncement function.
 * - GenerateSchoolAnnouncementOutput - The return type for the generateSchoolAnnouncement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSchoolAnnouncementInputSchema = z.object({
  userRole: z
    .string()
    .describe("The role of the user (e.g., 'administrator', 'teacher', 'student')."),
  schoolEvents: z
    .string()
    .describe('A description of recent or upcoming school events.'),
  schoolDetails: z.string().describe('Details about the school.'),
});
export type GenerateSchoolAnnouncementInput = z.infer<
  typeof GenerateSchoolAnnouncementInputSchema
>;

const GenerateSchoolAnnouncementOutputSchema = z.object({
  announcement: z
    .string()
    .describe(
      'A dynamically generated announcement for the school banner, prioritized based on user role and school events.'
    ),
});
export type GenerateSchoolAnnouncementOutput = z.infer<
  typeof GenerateSchoolAnnouncementOutputSchema
>;

export async function generateSchoolAnnouncement(
  input: GenerateSchoolAnnouncementInput
): Promise<GenerateSchoolAnnouncementOutput> {
  return generateSchoolAnnouncementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSchoolAnnouncementPrompt',
  input: {schema: GenerateSchoolAnnouncementInputSchema},
  output: {schema: GenerateSchoolAnnouncementOutputSchema},
  prompt: `You are a school communication specialist. Generate a concise and relevant announcement for the school banner based on the user's role, recent school events, and overall school details.

User Role: {{{userRole}}}
School Events: {{{schoolEvents}}}
School Details: {{{schoolDetails}}}

Prioritize announcements that are most relevant to the user's role and current school events. The announcement should be no more than 100 characters.

Announcement:`, // Keep announcement short to fit in a banner.
});

const generateSchoolAnnouncementFlow = ai.defineFlow(
  {
    name: 'generateSchoolAnnouncementFlow',
    inputSchema: GenerateSchoolAnnouncementInputSchema,
    outputSchema: GenerateSchoolAnnouncementOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
