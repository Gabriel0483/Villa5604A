'use server';
/**
 * @fileOverview AI Flow for generating personalized birthday cards.
 * 
 * - generateBirthdayCard - Generates a message and a festive image.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BirthdayCardInputSchema = z.object({
  residentName: z.string().describe('The name of the resident'),
  age: z.number().optional().describe('The age they are turning'),
});

const BirthdayCardOutputSchema = z.object({
  greeting: z.string().describe('A personalized, warm birthday greeting'),
  imageUrl: z.string().describe('Data URI of a generated festive birthday image'),
});

export type BirthdayCardInput = z.infer<typeof BirthdayCardInputSchema>;
export type BirthdayCardOutput = z.infer<typeof BirthdayCardOutputSchema>;

const birthdayPrompt = ai.definePrompt({
  name: 'birthdayPrompt',
  input: { schema: BirthdayCardInputSchema },
  output: { schema: z.object({ greeting: z.string() }) },
  prompt: `You are a friendly community manager at Villa 5604. 
Write a warm, personalized, and celebratory birthday message for {{{residentName}}}.
{{#if age}}They are turning {{{age}}} years old.{{/if}}
Keep the tone joyful, inclusive, and professional.`,
});

export async function generateBirthdayCard(input: BirthdayCardInput): Promise<BirthdayCardOutput> {
  return generateBirthdayCardFlow(input);
}

const generateBirthdayCardFlow = ai.defineFlow(
  {
    name: 'generateBirthdayCardFlow',
    inputSchema: BirthdayCardInputSchema,
    outputSchema: BirthdayCardOutputSchema,
  },
  async (input) => {
    try {
      // 1. Generate the text greeting
      const { output } = await birthdayPrompt(input);
      const greeting = output?.greeting || `Happy Birthday, ${input.residentName}! Wishing you a wonderful day at Villa 5604.`;

      // 2. Generate a festive image with adjusted safety settings
      const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `A beautiful, festive birthday card background for a resident named ${input.residentName}. Include elegant decorations, a cake, and a warm Omani villa aesthetic. High quality, celebratory, and welcoming.`,
        config: {
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE',
            },
          ],
        },
      });

      if (!media) {
        throw new Error('Image generation returned no media. The request may have been blocked or the model is currently unavailable.');
      }

      return {
        greeting,
        imageUrl: media.url,
      };
    } catch (error: any) {
      throw new Error(error.message || 'An unexpected error occurred during card generation.');
    }
  }
);
