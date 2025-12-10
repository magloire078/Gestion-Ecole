
'use server';
/**
 * @fileOverview An AI agent to generate payment reminder messages.
 *
 * - generatePaymentReminder - A function that handles reminder generation.
 * - GeneratePaymentReminderInput - The input type for the function.
 * - GeneratePaymentReminderOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GeneratePaymentReminderInputSchema = z.object({
  studentName: z.string().describe("Le nom complet de l'élève."),
  parentName: z.string().describe("Le nom complet du parent."),
  amountDue: z.number().describe("Le montant restant à payer."),
});
export type GeneratePaymentReminderInput = z.infer<
  typeof GeneratePaymentReminderInputSchema
>;

export const GeneratePaymentReminderOutputSchema = z.object({
  reminderMessage: z
    .string()
    .describe("Le message de rappel de paiement généré."),
});
export type GeneratePaymentReminderOutput = z.infer<
  typeof GeneratePaymentReminderOutputSchema
>;

const reminderPrompt = ai.definePrompt({
  name: 'generatePaymentReminderPrompt',
  input: {schema: GeneratePaymentReminderInputSchema},
  output: {schema: GeneratePaymentReminderOutputSchema},
  prompt: `Vous êtes un assistant administratif pour une école. Rédigez un message de rappel de paiement court, poli et professionnel pour un parent d'élève. Le message doit être adapté pour un envoi par SMS ou messagerie instantanée.

Informations :
- Nom de l'élève : {{studentName}}
- Nom du parent : {{parentName}}
- Montant dû : {{amountDue}} CFA

Le message doit :
1. Saluer poliment le parent.
2. Mentionner l'objet du message (solde de scolarité) et le nom de l'élève.
3. Indiquer clairement le montant restant à payer.
4. Remercier le parent pour son attention.
5. Se terminer par une formule de politesse simple et le nom de l'école.`,
});

export async function generatePaymentReminder(
  input: GeneratePaymentReminderInput
): Promise<GeneratePaymentReminderOutput> {
  return generatePaymentReminderFlow(input);
}


const generatePaymentReminderFlow = ai.defineFlow(
  {
    name: 'generatePaymentReminderFlow',
    inputSchema: GeneratePaymentReminderInputSchema,
    outputSchema: GeneratePaymentReminderOutputSchema,
  },
  async (input) => {
    const {output} = await reminderPrompt(input);
    return output!;
  }
);
