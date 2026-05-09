'use server';
/**
 * @fileOverview AI Flow for suggesting pro-rata utility allocations.
 * 
 * - suggestProRataAllocation - Suggests a fair split of household bills.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProRataInputSchema = z.object({
  totalAmount: z.number().describe('The total utility bill amount in OMR'),
  monthYear: z.string().describe('The billing period (YYYY-MM)'),
  residents: z.array(z.object({
    name: z.string(),
    roomUnit: z.string().optional(),
    monthlyRent: z.number().optional(),
  })).describe('List of current residents'),
});

const ProRataOutputSchema = z.object({
  methodology: z.string().describe('Description of the suggested split logic'),
  allocations: z.array(z.object({
    residentName: z.string(),
    amount: z.number().describe('The suggested OMR share for this resident'),
    explanation: z.string().describe('Reasoning for this specific amount'),
  })),
  totalAllocated: z.number(),
});

export type ProRataInput = z.infer<typeof ProRataInputSchema>;
export type ProRataOutput = z.infer<typeof ProRataOutputSchema>;

const proRataPrompt = ai.definePrompt({
  name: 'proRataPrompt',
  input: { schema: ProRataInputSchema },
  output: { schema: ProRataOutputSchema },
  prompt: `You are an expert property manager assistant for Villa 5604. 
Your task is to suggest a fair pro-rata allocation for a utility bill of {{{totalAmount}}} OMR for the period {{{monthYear}}}.

Current Residents:
{{#each residents}}
- {{name}} (Room: {{roomUnit}}, Rent: {{monthlyRent}} OMR)
{{/each}}

Suggest a fair split methodology (usually equal split among all residents unless there's a compelling reason otherwise based on the data). 
Ensure the total of all allocations equals exactly {{{totalAmount}}}.

Provide a friendly explanation for each resident's share.`,
});

export async function suggestPro_rata_methodology(input: ProRataInput): Promise<ProRataOutput> {
  const { output } = await proRataPrompt(input);
  if (!output) throw new Error('Failed to generate allocation suggestions');
  return output;
}
