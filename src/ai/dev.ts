import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-student-feedback.ts';
import '@/ai/flows/generate-teacher-recommendations.ts';
import '@/ai/flows/dynamically-generate-school-announcements.ts';
import '@/ai/flows/analyze-student-sentiment.ts';
