const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '../cornerstone-ci/.env.local' }); // Try to load from sibling if possible, else standard

const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error("API Key not found in env");
    // process.exit(1);
} else {
    console.log("API Key found (" + apiKey.substring(0, 5) + "...)");
}


const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init to get client? No, need client.
        // actually the SDK might not expose listModels directly easily in all versions?
        // Let's use REST if SDK fails or simple fetch.

        // Using fetch for simplicity as listModels might vary by SDK version
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.name.includes("gemini")) {
                    console.log(`- ${m.name.replace('models/', '')} (${m.displayName})`);
                }
            });
        } else {
            console.log("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
