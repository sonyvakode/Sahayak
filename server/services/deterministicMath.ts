// Pure deterministic financial and allocation calculations.
// All arithmetic for pricing, quantities, completion %, and payouts happens here—never via LLM.

export interface PricingInputs {
  quantity: number;
  materialCost: number;
  laborHours: number;
  laborRatePerHour: number;
  overheadCost: number;
  profitMarginPct: number;
}

export interface DeterministicPricingResult {
  quantity: number;
  materialCost: number;
  laborHours: number;
  laborRatePerHour: number;
  laborCost: number;
  overheadCost: number;
  profitMarginPct: number;
  totalProductionCost: number;
  expectedProfit: number;
  suggestedSellingPrice: number;
  pricePerUnit: number;
  workerRatePerPiece: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calculateOrderPricing(inputs: PricingInputs): DeterministicPricingResult {
  const quantity = Math.max(1, Math.floor(inputs.quantity));
  if (
    inputs.materialCost < 0 ||
    inputs.laborHours < 0 ||
    inputs.laborRatePerHour < 0 ||
    inputs.overheadCost < 0 ||
    inputs.profitMarginPct < 0
  ) {
    throw new Error('Cost and margin inputs must be non-negative numbers.');
  }

  const laborCost = round2(inputs.laborHours * inputs.laborRatePerHour);
  const totalProductionCost = round2(inputs.materialCost + laborCost + inputs.overheadCost);
  const expectedProfit = round2(totalProductionCost * (inputs.profitMarginPct / 100));
  const suggestedSellingPrice = round2(totalProductionCost + expectedProfit);
  const pricePerUnit = round2(suggestedSellingPrice / quantity);
  const workerRatePerPiece = round2(laborCost / quantity);

  return {
    quantity,
    materialCost: round2(inputs.materialCost),
    laborHours: round2(inputs.laborHours),
    laborRatePerHour: round2(inputs.laborRatePerHour),
    laborCost,
    overheadCost: round2(inputs.overheadCost),
    profitMarginPct: round2(inputs.profitMarginPct),
    totalProductionCost,
    expectedProfit,
    suggestedSellingPrice,
    pricePerUnit,
    workerRatePerPiece,
  };
}

export interface MemberAllocationCandidate {
  id: string;
  name: string;
  skills: string;
  dailyCapacity: number;
  pastWorkload: number;
  currentAssignedQty: number;
  availability: 'available' | 'limited' | 'unavailable';
}

export interface AllocationRecommendation {
  memberId: string;
  memberName: string;
  suggestedQty: number;
  score: number;
  capacityNote: string;
}

export function computeFairAllocation(
  totalQuantity: number,
  productName: string,
  candidates: MemberAllocationCandidate[]
): AllocationRecommendation[] {
  const active = candidates.filter((c) => c.availability !== 'unavailable');
  if (active.length === 0) {
    throw new Error('No available members to allocate work.');
  }

  const productKeywords = productName.toLowerCase().split(/\s+/).filter(Boolean);
  const maxPast = Math.max(...active.map((c) => c.pastWorkload), 1);

  const scored = active.map((c) => {
    const availabilityWeight = c.availability === 'available' ? 1.0 : 0.6;
    const skillMatchCount = productKeywords.filter((kw) =>
      c.skills.toLowerCase().includes(kw)
    ).length;
    const skillScore = 1 + skillMatchCount * 0.15;
    // Slight fairness boost for members with lower past workload & lower active assigned work
    const workloadBalance = 1 + (1 - c.pastWorkload / maxPast) * 0.15;
    const activePenalty = 1 / (1 + c.currentAssignedQty / 250);
    const rawScore = c.dailyCapacity * availabilityWeight * skillScore * workloadBalance * activePenalty;

    return {
      member: c,
      rawScore,
      skillMatchCount,
    };
  });

  const totalScore = scored.reduce((sum, s) => sum + s.rawScore, 0);
  let assignedSum = 0;

  const results: AllocationRecommendation[] = scored.map((s, idx) => {
    const exactShare = (s.rawScore / totalScore) * totalQuantity;
    // Round to nearest 5 for clean bundle sizes unless last item
    let qty =
      idx === scored.length - 1
        ? Math.max(0, totalQuantity - assignedSum)
        : Math.max(0, Math.round(exactShare / 5) * 5);

    if (assignedSum + qty > totalQuantity) {
      qty = Math.max(0, totalQuantity - assignedSum);
    }
    assignedSum += qty;

    return {
      memberId: s.member.id,
      memberName: s.member.name,
      suggestedQty: qty,
      score: round2(s.rawScore),
      capacityNote: `${s.member.dailyCapacity}/day capacity, ${s.member.availability}, past workload ${s.member.pastWorkload} pcs`,
    };
  });

  // Ensure exact total equals totalQuantity
  const diff = totalQuantity - results.reduce((sum, r) => sum + r.suggestedQty, 0);
  if (diff !== 0 && results.length > 0) {
    results[0].suggestedQty += diff;
  }

  return results;
}

export interface MemberProgressSnapshot {
  memberId: string;
  memberName: string;
  allocatedQty: number;
  completedQty: number;
  acceptedQty: number;
  reworkQty: number;
  dailyCapacity: number;
}

export interface ConsolidationMetrics {
  totalOrderQty: number;
  totalCompletedQty: number;
  pendingQty: number;
  acceptedPieces: number;
  reworkPieces: number;
  remainingDays: number;
  completionPct: number;
  riskFlags: Array<{
    severity: 'warning' | 'critical';
    memberId?: string;
    memberName?: string;
    message: string;
  }>;
  suggestedRedistribution: Array<{
    fromMemberId: string;
    fromMemberName: string;
    toMemberId: string;
    toMemberName: string;
    transferQty: number;
    reason: string;
  }>;
}

export function computeOrderConsolidation(
  totalOrderQty: number,
  remainingDays: number,
  members: MemberProgressSnapshot[]
): ConsolidationMetrics {
  const totalCompletedQty = members.reduce((s, m) => s + m.completedQty, 0);
  const pendingQty = Math.max(0, totalOrderQty - totalCompletedQty);
  const acceptedPieces = members.reduce((s, m) => s + m.acceptedQty, 0);
  const reworkPieces = members.reduce((s, m) => s + m.reworkQty, 0);
  const completionPct = totalOrderQty > 0 ? Math.round((totalCompletedQty / totalOrderQty) * 100) : 0;

  const avgCompletionRatio =
    members.length > 0
      ? members.reduce((s, m) => s + (m.allocatedQty > 0 ? m.completedQty / m.allocatedQty : 0), 0) /
        members.length
      : 0;

  const riskFlags: ConsolidationMetrics['riskFlags'] = [];
  const lagging: Array<MemberProgressSnapshot & { remaining: number; ratio: number }> = [];
  const ahead: Array<MemberProgressSnapshot & { remaining: number; ratio: number }> = [];

  for (const m of members) {
    const ratio = m.allocatedQty > 0 ? m.completedQty / m.allocatedQty : 1;
    const remaining = Math.max(0, m.allocatedQty - m.completedQty);
    const maxFinishable = m.dailyCapacity * Math.max(1, remainingDays);

    if (remaining > maxFinishable || ratio < avgCompletionRatio - 0.035) {
      lagging.push({ ...m, remaining, ratio });
      riskFlags.push({
        severity: remaining > maxFinishable ? 'critical' : 'warning',
        memberId: m.memberId,
        memberName: m.memberName,
        message: `${m.memberName} is behind schedule (${m.completedQty}/${m.allocatedQty} completed, ${remaining} remaining with ${remainingDays} days left). Would you like to review the work distribution?`,
      });
    } else if (ratio >= avgCompletionRatio) {
      ahead.push({ ...m, remaining, ratio });
    }
  }

  if (reworkPieces > 0) {
    riskFlags.push({
      severity: 'warning',
      message: `${reworkPieces} pieces require rework across the batch before final dispatch.`,
    });
  }

  const suggestedRedistribution: ConsolidationMetrics['suggestedRedistribution'] = [];
  if (lagging.length > 0 && ahead.length > 0) {
    const lagger = lagging.sort((a, b) => a.ratio - b.ratio)[0];
    const leader = ahead.sort((a, b) => b.ratio - a.ratio)[0];
    const transferQty = Math.min(10, Math.max(5, Math.floor(lagger.remaining * 0.25)));
    if (transferQty > 0 && lagger.memberId !== leader.memberId) {
      suggestedRedistribution.push({
        fromMemberId: lagger.memberId,
        fromMemberName: lagger.memberName,
        toMemberId: leader.memberId,
        toMemberName: leader.memberName,
        transferQty,
        reason: `${leader.memberName} has the highest completion rate (${Math.round(leader.ratio * 100)}%) and spare daily capacity (${leader.dailyCapacity}/day) to absorb ${transferQty} pending pieces from ${lagger.memberName}.`,
      });
    }
  }

  return {
    totalOrderQty,
    totalCompletedQty,
    pendingQty,
    acceptedPieces,
    reworkPieces,
    remainingDays,
    completionPct,
    riskFlags,
    suggestedRedistribution,
  };
}

export interface PayoutLineInput {
  memberId: string;
  memberName: string;
  acceptedPieces: number;
  ratePerPiece: number;
}

export interface PayoutCalculationSummary {
  lines: Array<PayoutLineInput & { grossEarnings: number }>;
  totalAcceptedPieces: number;
  totalGroupPayout: number;
}

export function calculateGroupPayouts(items: PayoutLineInput[]): PayoutCalculationSummary {
  const lines = items.map((item) => ({
    ...item,
    acceptedPieces: Math.max(0, Math.floor(item.acceptedPieces)),
    ratePerPiece: round2(Math.max(0, item.ratePerPiece)),
    grossEarnings: round2(Math.max(0, Math.floor(item.acceptedPieces)) * Math.max(0, item.ratePerPiece)),
  }));

  const totalAcceptedPieces = lines.reduce((sum, l) => sum + l.acceptedPieces, 0);
  const totalGroupPayout = round2(lines.reduce((sum, l) => sum + l.grossEarnings, 0));

  return {
    lines,
    totalAcceptedPieces,
    totalGroupPayout,
  };
}
