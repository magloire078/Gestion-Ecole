import { config } from 'dotenv';
config();

import '@/ai/flows/generate-teacher-recommendations.ts';
import '@/ai/flows/dynamically-generate-school-announcements.ts';
import '@/ai/flows/generate-report-card-comment.ts';
import '@/ai/flows/analyze-and-summarize-feedback.ts';
