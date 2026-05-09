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
    // 1. Generate the text greeting
    const { output } = await birthdayPrompt(input);
    const greeting = output?.greeting || `Happy Birthday, ${input.residentName}! Wishing you a wonderful day at Villa 5604.`;

    // 2. Generate a festive image
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `A beautiful, festive birthday card background for a resident named ${input.residentName}. Include elegant decorations, a cake, and a warm Omani villa aesthetic. High quality, celebratory, and welcoming.`,
    });

    if (!media) {
      throw new Error('Failed to generate birthday image');
    }

    return {
      greeting,
      imageUrl: media.url,
    };
  }
);
