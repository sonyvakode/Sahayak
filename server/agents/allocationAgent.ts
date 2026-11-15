import { ThinkingLevel, Type } from '@google/genai';
import {
  computeFairAllocation,
  type AllocationRecommendation,
  type MemberAllocationCandidate,
} from '../services/deterministicMath.ts';
import { getGeminiClient } from '../services/geminiClient.ts';

export interface ExplainedAllocation extends AllocationRecommendation {
  aiReason: string;
}

export interface AllocationProposal {
  allocations: ExplainedAllocation[];
  summaryNote: string;
  mode: 'gemini-4-hydrogen' | 'deterministic-rules';
}

export async function runAllocationAgent(
  orderId: string,
  productName: string,
  totalQuantity: number,
  candidates: MemberAllocationCandidate[]
): Promise<AllocationProposal> {
  const recommendations = computeFairAllocation(totalQuantity, productName, candidates);

  const fallbackAllocations: ExplainedAllocation[] = recommendations.map((r) => {
    const member = candidates.find((c) => c.id === r.memberId);
    return {
      ...r,
      aiReason: `Assigned ${r.suggestedQty} pieces based on ${member?.dailyCapacity ?? 14}/day capacity, skills (${member?.skills ?? 'stitching'}), and balanced past workload (${member?.pastWorkload ?? 0} pcs).`,
    };
  });

  const ai = getGeminiClient();
  if (!ai) {
    return {
      allocations: fallbackAllocations,
      summaryNote: `Balanced allocation of ${totalQuantity} ${productName} across ${recommendations.length} available members. Leader approval required before assigning tasks.`,
      mode: 'deterministic-rules',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are the Allocation Agent for SahayakSHG. Explain clearly and concisely (1 sentence per member) why each SHG member received their exact pre-calculated quantity for Order ${orderId} (${totalQuantity} ${productName}). Do NOT change any quantities.

Members and assigned quantities:
${recommendations
  .map((r) => {
    const c = candidates.find((x) => x.id === r.memberId);
    return `- ${r.memberName} (memberId: ${r.memberId}): ${r.suggestedQty} pieces | Capacity: ${c?.dailyCapacity}/day | Skills: ${c?.skills} | Past workload: ${c?.pastWorkload} | Availability: ${c?.availability}`;
  })
  .join('\n')}`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryNote: { type: Type.STRING },
            reasons: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  memberId: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['memberId', 'reason'],
              },
            },
          },
          required: ['summaryNote', 'reasons'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      summaryNote?: string;
      reasons?: Array<{ memberId: string; reason: string }>;
    };

    const reasonMap = new Map(parsed.reasons?.map((item) => [item.memberId, item.reason]) ?? []);
    return {
      allocations: fallbackAllocations.map((a) => ({
        ...a,
        aiReason: reasonMap.get(a.memberId) || a.aiReason,
      })),
      summaryNote:
        parsed.summaryNote ||
        `Fair allocation recommendation prepared for ${totalQuantity} ${productName}. Awaiting leader approval.`,
      mode: 'gemini-4-hydrogen',
    };
  } catch (err) {
    console.error('AllocationAgent Gemini error:', err);
    return {
      allocations: fallbackAllocations,
      summaryNote: `Balanced allocation of ${totalQuantity} ${productName} across ${recommendations.length} members. Leader approval required.`,
      mode: 'deterministic-rules',
    };
  }
}
