'use server';
/**
 * @fileOverview AI flow for generating tuition payment reminders.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const PaymentReminderInputSchema = z.object({
  studentName: z.string().describe("The full name of the student."),
  schoolName: z.string().describe("The name of the school."),
  amountDue: z.number().describe("The outstanding tuition amount in CFA."),
  dueDate: z.string().describe("The due date for the payment (e.g., '31 Juillet 2024')."),
});
export type PaymentReminderInput = z.infer<typeof PaymentReminderInputSchema>;

const ReminderOutputSchema = z.object({
  reminderMessage: z.string().describe("A polite but clear payment reminder message written in French, addressed to the parents of the student."),
});

const reminderPrompt = ai.definePrompt({
    name: 'paymentReminderPrompt',
    input: { schema: PaymentReminderInputSchema },
    output: { schema: ReminderOutputSchema },
    prompt: `
        You are an administrative assistant for a school in Côte d'Ivoire.
        Your task is to write a polite and professional payment reminder for tuition fees.
        The message should be addressed to the parents.

        School: {{{schoolName}}}
        Student: {{{studentName}}}
        Amount Due: {{{amountDue}}} CFA
        Due Date: {{{dueDate}}}

        The message should:
        1. Start with a polite greeting (e.g., "Chers parents de...").
        2. State the purpose of the message clearly but gently (reminder of an outstanding balance).
        3. Mention the student's name and the amount due.
        4. Encourage them to regularize the payment as soon as possible.
        5. Provide a friendly closing.
        
        Generate only the 'reminderMessage' field in the output.
    `,
});

const generateReminderFlow = ai.defineFlow(
  {
    name: 'generateReminderFlow',
    inputSchema: PaymentReminderInputSchema,
    outputSchema: ReminderOutputSchema,
  },
  async (input) => {
    const { output } = await reminderPrompt(input);
    return output!;
  }
);


export async function generatePaymentReminder(input: PaymentReminderInput): Promise<string> {
    const result = await generateReminderFlow(input);
    return result.reminderMessage;
}
