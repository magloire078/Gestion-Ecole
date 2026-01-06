'use server';
/**
 * @fileoverview This file initializes and configures the Genkit AI instance.
 * It sets up the necessary plugins, in this case, the Google AI plugin for
 * accessing Google's generative models. This centralized setup ensures that
 * the AI instance is consistently configured throughout the application.
 *
 * The `ai` object exported from this file is a singleton that should be
 * imported and used for all AI-related tasks, such as defining flows,
 * prompts, and generating content.
 */
import {genkit, configureGenkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {firebase} from '@genkit-ai/firebase';
import { googleCloud } from '@genkit-ai/google-cloud';

const genkitConfig = {
  plugins: [
    firebase(),
    googleAI({
      apiVersion: 'v1beta',
    }),
    googleCloud(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
};

configureGenkit(genkitConfig);

export {genkit as ai};
