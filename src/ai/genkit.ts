
'use server';
/**
 * @fileOverview Centralized Genkit AI configuration.
 *
 * This file initializes and a new Genkit instance that is used throughout the application.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * The global Genkit AI instance.
 *
 */
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
