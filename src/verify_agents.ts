import { directorFlow } from './ai/agents/director';
import { runFlow } from 'genkit';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const testPrompt = "Peux-tu améliorer le code de src/app/page.tsx ?";
    console.log(`Test Prompt: "${testPrompt}"`);

    try {
        const result = await runFlow(directorFlow, testPrompt);
        console.log("\n--- RESULTAT ---");
        console.log(result);
    } catch (error) {
        console.error("Erreur lors de l'exécution :", error);
    }
}

main();
