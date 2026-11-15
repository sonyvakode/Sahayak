import { ThinkingLevel } from '@google/genai';
import {
  calculateOrderPricing,
  type DeterministicPricingResult,
  type PricingInputs,
} from '../services/deterministicMath.ts';
import { getGeminiClient } from '../services/geminiClient.ts';

export interface PricingProposal {
  calculations: DeterministicPricingResult;
  aiExplanation: string;
  fairnessAssessment: string;
  explanationMode: 'gemini-4-hydrogen' | 'deterministic-summary';
}

export async function runPricingAgent(
  productName: string,
  inputs: PricingInputs
): Promise<PricingProposal> {
  // Always perform financial arithmetic deterministically in TypeScript
  const calculations = calculateOrderPricing(inputs);

  const deterministicExplanation =
    `Total cost is ₹${calculations.totalProductionCost.toLocaleString('en-IN')} ` +
    `(Materials ₹${calculations.materialCost.toLocaleString('en-IN')} + ` +
    `Labor ₹${calculations.laborCost.toLocaleString('en-IN')} + ` +
    `Overheads ₹${calculations.overheadCost.toLocaleString('en-IN')}). ` +
    `Adding a ${calculations.profitMarginPct}% SHG margin (₹${calculations.expectedProfit.toLocaleString('en-IN')}) ` +
    `yields a suggested selling price of ₹${calculations.suggestedSellingPrice.toLocaleString('en-IN')} ` +
    `(₹${calculations.pricePerUnit.toFixed(2)} per unit) and ₹${calculations.workerRatePerPiece.toFixed(2)} labor pay per piece.`;

  const fairnessAssessment =
    calculations.profitMarginPct < 10
      ? 'Margin is below 10% — verify whether raw material fluctuations could reduce SHG group reserves.'
      : 'Margin and per-piece labor compensation are balanced for sustainable SHG operations.';

  const ai = getGeminiClient();
  if (!ai) {
    return {
      calculations,
      aiExplanation: deterministicExplanation,
      fairnessAssessment,
      explanationMode: 'deterministic-summary',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are the Pricing Agent for SahayakSHG helping an Indian women's Self-Help Group leader review a calculated price quote.
Do NOT recalculate or alter any numbers. Use these exact pre-computed figures:
- Product: ${productName}
- Order Quantity: ${calculations.quantity}
- Material Cost: ₹${calculations.materialCost}
- Labor Cost (${calculations.laborHours} hrs × ₹${calculations.laborRatePerHour}/hr): ₹${calculations.laborCost}
- Overheads: ₹${calculations.overheadCost}
- Total Production Cost: ₹${calculations.totalProductionCost}
- Profit Margin: ${calculations.profitMarginPct}% (₹${calculations.expectedProfit})
- Suggested Selling Price: ₹${calculations.suggestedSellingPrice} (₹${calculations.pricePerUnit}/unit)
- Member Labor Rate per Piece: ₹${calculations.workerRatePerPiece}

Write 2 short, clear sentences explaining this pricing breakdown simply for the SHG leader and noting if the margin protects member wages.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    return {
      calculations,
      aiExplanation: (response.text ?? '').trim() || deterministicExplanation,
      fairnessAssessment,
      explanationMode: 'gemini-4-hydrogen',
    };
  } catch (err) {
    console.error('PricingAgent Gemini error:', err);
    return {
      calculations,
      aiExplanation: deterministicExplanation,
      fairnessAssessment,
      explanationMode: 'deterministic-summary',
    };
  }
}
