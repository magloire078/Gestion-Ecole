
'use server';
/**
 * @fileOverview Un agent IA pour générer des lettres de recommandation pour les enseignants.
 *
 * - generateTeacherRecommendations - Une fonction qui gère le processus de génération.
 * - GenerateTeacherRecommendationsInput - Le type d'entrée pour la fonction.
 * - GenerateTeacherRecommendationsOutput - Le type de retour pour la fonction.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Input Schema
export const GenerateTeacherRecommendationsInputSchema = z.object({
  teacherName: z.string().describe("Le nom de l'enseignant."),
  className: z.string().describe('La classe principale de l\'enseignant.'),
  studentPerformanceData: z
    .string()
    .describe(
      'Un résumé des performances des élèves dans la matière de l\'enseignant.'
    ),
  teacherSkills: z
    .array(z.string())
    .describe('Une liste des compétences clés de l\'enseignant.'),
  directorName: z.string().describe('Le nom du directeur/de la directrice.'),
  schoolName: z.string().describe("Le nom de l'école."),
});
export type GenerateTeacherRecommendationsInput = z.infer<
  typeof GenerateTeacherRecommendationsInputSchema
>;

// Output Schema
export const GenerateTeacherRecommendationsOutputSchema = z.object({
  recommendationLetterDraft: z
    .string()
    .describe("Le brouillon de la lettre de recommandation générée par l'IA."),
});
export type GenerateTeacherRecommendationsOutput = z.infer<
  typeof GenerateTeacherRecommendationsOutputSchema
>;

// Main exported function
export async function generateTeacherRecommendations(
  input: GenerateTeacherRecommendationsInput
): Promise<GenerateTeacherRecommendationsOutput> {
  const {output} = await recommendationFlow(input);
  return output!;
}

// Genkit Prompt
const recommendationPrompt = ai.definePrompt({
  name: 'recommendationPrompt',
  input: {schema: GenerateTeacherRecommendationsInputSchema},
  output: {schema: GenerateTeacherRecommendationsOutputSchema},
  prompt: `Vous êtes un assistant de direction d'école chargé de rédiger des brouillons de lettres de recommandation.

Rédigez une lettre de recommandation professionnelle et élogieuse pour {{teacherName}}.

Informations clés à inclure :
- Nom de l'enseignant : {{teacherName}}
- Classe principale : {{className}}
- Performance des élèves : {{studentPerformanceData}}
- Compétences clés de l'enseignant : {{#each teacherSkills}}- {{this}} {{/each}}
- Nom du directeur/de la directrice : {{directorName}}
- Nom de l'école : {{schoolName}}
- Date : Nous sommes en {{year}}.

Structure de la lettre :
1. Introduction : Présentez {{teacherName}} et votre relation avec lui/elle.
2. Corps du texte : Mettez en avant ses compétences ({{teacherSkills}}) et illustrez-les avec les performances de ses élèves ({{studentPerformanceData}}).
3. Conclusion : Réitérez votre recommandation forte.
4. Signature : Terminez par la formule de politesse et le nom du directeur/de la directrice.

Le ton doit être formel, sincère et convaincant. Mettez en évidence l'impact positif de l'enseignant sur l'école et les élèves.`,
});


// Genkit Flow
const recommendationFlow = ai.defineFlow(
  {
    name: 'recommendationFlow',
    inputSchema: GenerateTeacherRecommendationsInputSchema,
    outputSchema: GenerateTeacherRecommendationsOutputSchema,
  },
  async (input) => {
    const context = {
        ...input,
        year: new Date().getFullYear(),
    };
    const {output} = await recommendationPrompt(context);
    return output!;
  }
);
