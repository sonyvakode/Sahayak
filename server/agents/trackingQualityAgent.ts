import { ThinkingLevel } from '@google/genai';
import {
  computeOrderConsolidation,
  type ConsolidationMetrics,
  type MemberProgressSnapshot,
} from '../services/deterministicMath.ts';
import { getGeminiClient } from '../services/geminiClient.ts';

export interface TrackingAnalysis extends ConsolidationMetrics {
  aiAdvisory: string;
  mode: 'gemini-4-hydrogen' | 'deterministic-rules';
}

export async function runTrackingQualityAgent(
  orderId: string,
  productName: string,
  totalOrderQty: number,
  remainingDays: number,
  members: MemberProgressSnapshot[]
): Promise<TrackingAnalysis> {
  const metrics = computeOrderConsolidation(totalOrderQty, remainingDays, members);

  const defaultAdvisory =
    metrics.riskFlags.length > 0
      ? metrics.riskFlags[0].message
      : `Order ${orderId} is on track at ${metrics.completionPct}% completion with ${metrics.remainingDays} days left.`;

  const ai = getGeminiClient();
  if (!ai) {
    return {
      ...metrics,
      aiAdvisory: defaultAdvisory,
      mode: 'deterministic-rules',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are the Tracking and Quality Agent for SahayakSHG. Summarize the delivery & quality status of Order ${orderId} (${productName}) in 2 supportive, actionable sentences for the SHG leader. Do not alter any numbers.
Facts:
- Total Order: ${metrics.totalOrderQty} | Completed: ${metrics.totalCompletedQty} (${metrics.completionPct}%) | Pending: ${metrics.pendingQty}
- Accepted: ${metrics.acceptedPieces} | Needs Rework: ${metrics.reworkPieces}
- Remaining Days: ${metrics.remainingDays}
- Risk Flags: ${metrics.riskFlags.map((f) => f.message).join(' | ') || 'None'}
- Suggested Redistribution: ${metrics.suggestedRedistribution.map((r) => r.reason).join(' | ') || 'None'}`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    return {
      ...metrics,
      aiAdvisory: (response.text ?? '').trim() || defaultAdvisory,
      mode: 'gemini-4-hydrogen',
    };
  } catch (err) {
    console.error('TrackingQualityAgent error:', err);
    return {
      ...metrics,
      aiAdvisory: defaultAdvisory,
      mode: 'deterministic-rules',
    };
  }
}
