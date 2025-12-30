'use server';
/**
 * @fileoverview A Genkit flow for generating student payment reminders.
 *
 * This flow takes student and parent information to generate a polite
 * SMS reminder for outstanding school fees.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the input schema for the flow
export const GenerateReminderInputSchema = z.object({
  studentName: z.string().describe('The first name and last name of the student.'),
  parentName: z.string().describe("The parent's full name."),
  amountDue: z.number().describe('The outstanding amount due.'),
  schoolName: z.string().describe("The name of the school."),
});
export type GenerateReminderInput = z.infer<typeof GenerateReminderInputSchema>;

// Define the output schema for the flow
export const GenerateReminderOutputSchema = z.object({
  reminder: z
    .string()
    .describe('The generated, polite SMS reminder message in French.'),
});
export type GenerateReminderOutput = z.infer<typeof GenerateReminderOutputSchema>;


const reminderPrompt = ai.definePrompt(
  {
    name: 'paymentReminderPrompt',
    input: {
      schema: GenerateReminderInputSchema,
    },
    output: {
      schema: GenerateReminderOutputSchema,
    },
    prompt: `
      You are an administrative assistant at a school. Your task is to generate a short, polite, and clear SMS message in French to remind a parent about an outstanding school fee payment.

      You will be provided with:
      - School's Name: {{{schoolName}}}
      - Student's Name: {{{studentName}}}
      - Parent's Name: {{{parentName}}}
      - Amount Due: {{{amountDue}}} CFA

      The message should:
      1. Greet the parent by name (Bonjour Mme/M. {{{parentName}}}).
      2. State the purpose of the message (a friendly reminder from {{{schoolName}}} regarding the school fees for {{{studentName}}}).
      3. Mention the outstanding balance (le solde restant est de {{{amountDue}}} CFA).
      4. Invite them to contact the accounting department (Veuillez contacter la comptabilité pour régulariser. Merci.).
      5. Be concise and professional. Do not add any extra information.
    `,
  },
);


const generateReminderFlow = ai.defineFlow(
  {
    name: 'generateReminderFlow',
    inputSchema: GenerateReminderInputSchema,
    outputSchema: GenerateReminderOutputSchema,
  },
  async (input) => {
    const { output } = await reminderPrompt(input);
    return output!;
  }
);


export async function generatePaymentReminder(
  input: GenerateReminderInput
): Promise<GenerateReminderOutput> {
  return generateReminderFlow(input);
}
