import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calculator, CheckCircle2, ArrowRight } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { apiFetch } from '../../lib/api';
import type { OrderRecord } from '../../types';

interface PricingCalculations {
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

interface PricingProposalResponse {
  calculations: PricingCalculations;
  aiExplanation: string;
  fairnessAssessment: string;
  explanationMode: string;
}

export function PricingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState(
    searchParams.get('orderId') || 'ORD-2026-0013'
  );

  // Cost inputs (never invented automatically; user enters or clicks clearly labeled Demo Data button)
  const [materialCost, setMaterialCost] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [laborRatePerHour, setLaborRatePerHour] = useState('');
  const [overheadCost, setOverheadCost] = useState('');
  const [profitMarginPct, setProfitMarginPct] = useState('');
  const [usedDemoSample, setUsedDemoSample] = useState(false);

  const [proposal, setProposal] = useState<PricingProposalResponse | null>(null);
  const [existingApproved, setExistingApproved] = useState<Record<string, unknown> | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ orders: OrderRecord[] }>('/api/orders').then((res) => {
      setOrders(res.orders);
      if (!searchParams.get('orderId')) {
        const pending = res.orders.find((o) => o.status === 'pricing_pending');
        if (pending) setSelectedOrderId(pending.id);
        else if (res.orders[0]) setSelectedOrderId(res.orders[0].id);
      }
    });
  }, [searchParams]);

  useEffect(() => {
    if (!selectedOrderId) return;
    setProposal(null);
    setSuccessMsg(null);
    setError(null);
    apiFetch<{
      order: OrderRecord;
      pricing: Record<string, unknown> | null;
    }>(`/api/orders/${selectedOrderId}`)
      .then((res) => {
        setExistingApproved(res.pricing);
        if (res.pricing) {
          setMaterialCost(String(res.pricing.material_cost));
          setLaborHours(String(res.pricing.labor_hours));
          setLaborRatePerHour(String(res.pricing.labor_rate_per_hour));
          setOverheadCost(String(res.pricing.overhead_cost));
          setProfitMarginPct(String(res.pricing.profit_margin_pct));
          setUsedDemoSample(Boolean(res.pricing.is_demo_sample));
        } else {
          setMaterialCost('');
          setLaborHours('');
          setLaborRatePerHour('');
          setOverheadCost('');
          setProfitMarginPct('');
          setUsedDemoSample(false);
        }
      })
      .catch(() => {});
  }, [selectedOrderId]);

  const currentOrder = orders.find((o) => o.id === selectedOrderId);

  const fillDemoSampleCosts = () => {
    const qty = currentOrder?.quantity || 200;
    setMaterialCost(String(qty * 23));
    setLaborHours(String(Math.round(qty * 0.5)));
    setLaborRatePerHour('50');
    setOverheadCost(String(qty * 4));
    setProfitMarginPct('20');
    setUsedDemoSample(true);
    setError(null);
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (
      materialCost === '' ||
      laborHours === '' ||
      laborRatePerHour === '' ||
      overheadCost === '' ||
      profitMarginPct === ''
    ) {
      setError('Please enter all cost values or use "Load Sample Demo Costs".');
      return;
    }

    setCalculating(true);
    try {
      const res = await apiFetch<PricingProposalResponse>('/api/agents/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify({
          orderId: selectedOrderId,
          materialCost: Number(materialCost),
          laborHours: Number(laborHours),
          laborRatePerHour: Number(laborRatePerHour),
          overheadCost: Number(overheadCost),
          profitMarginPct: Number(profitMarginPct),
        }),
      });
      setProposal(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pricing calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleApprovePrice = async () => {
    if (!proposal) return;
    setApproving(true);
    setError(null);
    try {
      await apiFetch('/api/pricing/approve', {
        method: 'POST',
        body: JSON.stringify({
          orderId: selectedOrderId,
          materialCost: Number(materialCost),
          laborHours: Number(laborHours),
          laborRatePerHour: Number(laborRatePerHour),
          overheadCost: Number(overheadCost),
          profitMarginPct: Number(profitMarginPct),
          isDemoSample: usedDemoSample,
        }),
      });
      setSuccessMsg(`Pricing approved for ${selectedOrderId}. Ready for Fair Work Allocation.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve pricing');
    } finally {
      setApproving(false);
    }
  };

  return (
    <AppShell title="Step 2: Transparent Pricing">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Order Selector */}
        <section className="bg-white rounded-2xl border border-[#075B62]/12 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#124D52]">
              Select Order to Price
            </h2>
            <p className="text-xs text-[#252525]/70">
              All financial arithmetic is computed deterministically in code, never by an LLM.
            </p>
          </div>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            aria-label="Select order for pricing"
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF] text-sm font-semibold text-[#124D52]"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} · {o.product_name} ({o.quantity} units)
              </option>
            ))}
          </select>
        </section>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Cost Inputs */}
          <form
            onSubmit={handleCalculate}
            className="lg:col-span-6 bg-white rounded-2xl border border-[#075B62]/15 p-5 sm:p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#075B62]/10">
              <h3 className="font-display text-base font-bold text-[#124D52]">
                Production Cost Inputs
              </h3>
              <button
                type="button"
                onClick={fillDemoSampleCosts}
                className="px-3 py-1.5 rounded-xl bg-[#E9E3F5] text-[#124D52] text-xs font-semibold hover:bg-[#8274A8] hover:text-white transition-colors"
              >
                Load Sample Demo Costs
              </button>
            </div>

            {usedDemoSample && (
              <div className="p-3 rounded-xl bg-[#E9E3F5]/60 text-xs font-medium text-[#124D52]">
                Sample Demo Data loaded for quick testing. Edit any cost figure to match actual local bills.
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#252525]/80 mb-1">
                  Total Material Cost (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={materialCost}
                  onChange={(e) => {
                    setMaterialCost(e.target.value);
                    setUsedDemoSample(false);
                  }}
                  placeholder="Enter fabric, thread, dye cost"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252525]/80 mb-1">
                  Overhead Cost (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={overheadCost}
                  onChange={(e) => {
                    setOverheadCost(e.target.value);
                    setUsedDemoSample(false);
                  }}
                  placeholder="Electricity, packaging, transport"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252525]/80 mb-1">
                  Total Labor Time (Hours)
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={laborHours}
                  onChange={(e) => {
                    setLaborHours(e.target.value);
                    setUsedDemoSample(false);
                  }}
                  placeholder="e.g. 250 hours"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252525]/80 mb-1">
                  Labor Rate (₹ / Hour)
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={laborRatePerHour}
                  onChange={(e) => {
                    setLaborRatePerHour(e.target.value);
                    setUsedDemoSample(false);
                  }}
                  placeholder="e.g. ₹50 / hr"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm font-mono-num"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#252525]/80 mb-1">
                  Desired SHG Profit Margin (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  step="any"
                  value={profitMarginPct}
                  onChange={(e) => {
                    setProfitMarginPct(e.target.value);
                    setUsedDemoSample(false);
                  }}
                  placeholder="e.g. 20"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm font-mono-num"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[#D9534F]/10 border border-[#D9534F]/30 text-xs text-[#991B1B]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={calculating}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#075B62] text-white text-sm font-semibold hover:bg-[#124D52] inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              <span>{calculating ? 'Calculating...' : 'Calculate Transparent Price'}</span>
            </button>
          </form>

          {/* Price Breakdown & Approval */}
          <section className="lg:col-span-6 bg-white rounded-2xl border border-[#075B62]/15 p-5 sm:p-6 space-y-5">
            <h3 className="font-display text-base font-bold text-[#124D52] pb-3 border-b border-[#075B62]/10">
              Proposed Price Breakdown
            </h3>

            {!proposal && existingApproved && (
              <div className="p-4 rounded-xl bg-[#DCEFE3]/70 text-sm text-[#14532D] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approved Pricing on Record</span>
                </div>
                <p className="font-mono-num text-xs">
                  Selling Price: ₹{Number(existingApproved.suggested_selling_price).toLocaleString('en-IN')} · Price/Unit: ₹{Number(existingApproved.price_per_unit).toFixed(2)} · Worker Rate: ₹{Number(existingApproved.worker_rate_per_piece).toFixed(2)}/pc
                </p>
              </div>
            )}

            {!proposal ? (
              <div className="py-10 text-center text-sm text-[#252525]/65">
                Enter actual cost values on the left and select <strong>Calculate Transparent Price</strong> to inspect the exact breakdown.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="divide-y divide-[#075B62]/10 text-sm">
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#252525]/75">Material Cost</span>
                    <span className="font-mono-num font-semibold">
                      ₹{proposal.calculations.materialCost.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#252525]/75">
                      Labor Cost ({proposal.calculations.laborHours} hrs × ₹{proposal.calculations.laborRatePerHour}/hr)
                    </span>
                    <span className="font-mono-num font-semibold">
                      ₹{proposal.calculations.laborCost.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-[#252525]/75">Overheads</span>
                    <span className="font-mono-num font-semibold">
                      ₹{proposal.calculations.overheadCost.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between font-bold text-[#124D52]">
                    <span>Total Production Cost</span>
                    <span className="font-mono-num">
                      ₹{proposal.calculations.totalProductionCost.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between text-[#075B62]">
                    <span>Expected SHG Margin ({proposal.calculations.profitMarginPct}%)</span>
                    <span className="font-mono-num font-semibold">
                      + ₹{proposal.calculations.expectedProfit.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#075B62] text-white grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[11px] text-white/80">Suggested Price</div>
                    <div className="font-mono-num text-lg font-bold">
                      ₹{proposal.calculations.suggestedSellingPrice.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-white/80">Price / Unit</div>
                    <div className="font-mono-num text-lg font-bold">
                      ₹{proposal.calculations.pricePerUnit.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-white/80">Member Piece Rate</div>
                    <div className="font-mono-num text-lg font-bold">
                      ₹{proposal.calculations.workerRatePerPiece.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FFF8EF] border border-[#075B62]/15 text-xs text-[#252525]/85 space-y-1.5">
                  <div className="font-semibold text-[#124D52]">
                    Pricing Agent Summary ({proposal.explanationMode})
                  </div>
                  <p>{proposal.aiExplanation}</p>
                  <p className="text-[#8274A8] font-medium">{proposal.fairnessAssessment}</p>
                </div>

                {successMsg && (
                  <div className="p-3.5 rounded-xl bg-[#DCEFE3] text-sm font-medium text-[#14532D] flex items-center justify-between gap-3">
                    <span>{successMsg}</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/leader/allocation?orderId=${selectedOrderId}`)}
                      className="px-3 py-1.5 rounded-lg bg-[#14532D] text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Allocate Work</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleApprovePrice}
                  disabled={approving}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#124D52] text-white text-sm font-semibold hover:bg-[#075B62] inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{approving ? 'Approving...' : 'Approve Proposed Price'}</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
