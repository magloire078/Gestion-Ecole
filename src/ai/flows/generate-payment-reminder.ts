'use server';
/**
 * @fileOverview An AI agent to generate payment reminders.
 *
 * - generatePaymentReminder - A function that handles the reminder generation.
 * - GeneratePaymentReminderInput - The input type for the function.
 * - GeneratePaymentReminderOutput - The return type for the function.
 */

import {z} from 'zod';

// Input Schema
export const GeneratePaymentReminderInputSchema = z.object({
  studentName: z.string().describe("Le nom de l'élève."),
  parentName: z.string().describe("Le nom du parent."),
  amountDue: z.number().describe("Le montant dû."),
  schoolName: z.string().describe("Le nom de l'école."),
});
export type GeneratePaymentReminderInput = z.infer<
  typeof GeneratePaymentReminderInputSchema
>;

// Output Schema
export const GeneratePaymentReminderOutputSchema = z.object({
  reminderMessage: z
    .string()
    .describe("Le message de rappel de paiement généré."),
});
export type GeneratePaymentReminderOutput = z.infer<
  typeof GeneratePaymentReminderOutputSchema
>;

// Main exported function (mocked)
export async function generatePaymentReminder(
  input: GeneratePaymentReminderInput
): Promise<GeneratePaymentReminderOutput> {
    const message = `Bonjour ${input.parentName}, ceci est un rappel concernant le solde de la scolarité de ${input.studentName} qui s'élève à ${input.amountDue.toLocaleString('fr-FR')} CFA. Merci de procéder au règlement. Cordialement, La direction de ${input.schoolName}.`;
    return {
        reminderMessage: message
    }
}
