'use server';
/**
 * @fileOverview An AI tool to suggest optimal pro-rata sharing methodologies for utility bills.
 *
 * - suggestProRataMethodology - A function that handles the suggestion process.
 * - SuggestProRataMethodologyInput - The input type for the suggestProRataMethodology function.
 * - SuggestProRataMethodologyOutput - The return type for the suggestProRataMethodology function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestProRataMethodologyInputSchema = z.object({
  tenantCount: z.number().int().positive().describe('The total number of tenants involved in the bill splitting.'),
  utilityType: z.enum(['Wifi', 'Water', 'Electricity']).describe('The type of utility bill to allocate.'),
  totalBillAmount: z.number().positive().describe('The total amount of the utility bill to be allocated.'),
  tenantDetails: z.array(
    z.object({
      id: z.string().describe('Unique identifier for the tenant.'),
      name: z.string().describe('Name of the tenant.'),
      roomSizeSqFt: z.number().optional().describe('Optional: Room size in square feet for this tenant.'),
      estimatedUsageUnits: z.number().optional().describe('Optional: Estimated individual usage units for this tenant.'),
    })
  ).describe('Detailed information for each tenant, including optional room size and estimated individual usage.'),
  additionalContext: z.string().optional().describe('Any additional context or preferences for the allocation method.'),
});
export type SuggestProRataMethodologyInput = z.infer<typeof SuggestProRataMethodologyInputSchema>;

const SuggestProRataMethodologyOutputSchema = z.object({
  methodologyName: z.string().describe('A concise name for the suggested pro-rata sharing methodology.'),
  description: z.string().describe('A detailed explanation of the suggested methodology and why it is fair and suitable for the given context.'),
  exampleAllocation: z.array(
    z.object({
      tenantName: z.string().describe('The name of the tenant.'),
      allocatedAmount: z.number().describe('The allocated amount for this tenant based on the suggested methodology.'),
    })
  ).describe('An example calculation showing how the total bill is allocated among tenants using the suggested methodology.'),
  pros: z.array(z.string()).describe('List of advantages of this methodology.'),
  cons: z.array(z.string()).describe('List of disadvantages or considerations for this methodology.'),
});
export type SuggestProRataMethodologyOutput = z.infer<typeof SuggestProRataMethodologyOutputSchema>;

export async function suggestProRataMethodology(input: SuggestProRataMethodologyInput): Promise<SuggestProRataMethodologyOutput> {
  return suggestProRataMethodologyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestProRataMethodologyPrompt',
  input: { schema: SuggestProRataMethodologyInputSchema },
  output: { schema: SuggestProRataMethodologyOutputSchema },
  prompt: `You are an expert in fair cost allocation for shared living arrangements. Your task is to analyze the provided details about tenants and utility usage, and suggest the most optimal pro-rata sharing methodology for the given utility type. The goal is to ensure fairness and efficiency in cost distribution.

Here are the details:
Utility Type: {{{utilityType}}}
Total Bill Amount: ${{{totalBillAmount}}}
Number of Tenants: {{{tenantCount}}}

Tenant Details:
{{#each tenantDetails}}
  - Tenant ID: {{{id}}}, Name: {{{name}}}
    {{#if roomSizeSqFt}}Room Size: {{{roomSizeSqFt}}} sq. ft.{{/if}}
    {{#if estimatedUsageUnits}}Estimated Usage: {{{estimatedUsageUnits}}} units{{/if}}
{{/each}}

{{#if additionalContext}}
Additional Context/Preferences: {{{additionalContext}}}
{{/if}}

Based on this information, recommend the most suitable pro-rata sharing methodology. Provide a name for the methodology, a detailed explanation of why it is fair and efficient, an example allocation for each tenant given the total bill amount, and list its pros and cons.`,
});

const suggestProRataMethodologyFlow = ai.defineFlow(
  {
    name: 'suggestProRataMethodologyFlow',
    inputSchema: SuggestProRataMethodologyInputSchema,
    outputSchema: SuggestProRataMethodologyOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate pro-rata methodology suggestion.');
    }
    return output;
  }
);
