import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { apiFetch } from '../../lib/api';
import type { OrderRecord } from '../../types';

interface ConsolidationData {
  order: OrderRecord;
  consolidation: {
    totalOrderQty: number;
    totalCompletedQty: number;
    pendingQty: number;
    acceptedPieces: number;
    reworkPieces: number;
    remainingDays: number;
    completionPct: number;
    aiAdvisory: string;
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
  };
  memberSnapshots: Array<{
    member_id: string;
    member_name: string;
    allocated_qty: number;
    completed_qty: number;
    accepted_qty: number;
    rework_qty: number;
  }>;
}

export function OrderConsolidationPage() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState(
    searchParams.get('orderId') || 'ORD-2026-0012'
  );
  const [data, setData] = useState<ConsolidationData | null>(null);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadConsolidation = (orderId: string) => {
    apiFetch<ConsolidationData>(`/api/orders/${orderId}/tracking`).then(setData);
  };

  useEffect(() => {
    apiFetch<{ orders: OrderRecord[] }>('/api/orders').then((res) => setOrders(res.orders));
  }, []);

  useEffect(() => {
    setMessage(null);
    loadConsolidation(selectedOrderId);
  }, [selectedOrderId]);

  const handleApplyRedistribution = async (rec: {
    fromMemberId: string;
    toMemberId: string;
    transferQty: number;
    fromMemberName: string;
    toMemberName: string;
  }) => {
    setApplying(true);
    try {
      await apiFetch('/api/consolidation/redistribute', {
        method: 'POST',
        body: JSON.stringify({
          orderId: selectedOrderId,
          fromMemberId: rec.fromMemberId,
          toMemberId: rec.toMemberId,
          transferQty: rec.transferQty,
        }),
      });
      setMessage(
        `Approved redistribution: ${rec.transferQty} pieces moved from ${rec.fromMemberName} to ${rec.toMemberName}.`
      );
      loadConsolidation(selectedOrderId);
    } finally {
      setApplying(false);
    }
  };

  const c = data?.consolidation;

  return (
    <AppShell title="Step 5: Order Consolidation">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="bg-white rounded-2xl border border-[#075B62]/12 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#124D52]">
              Batch Consolidation & Delivery Risk Review
            </h2>
            <p className="text-xs text-[#252525]/70">
              Review total completion, quality readiness, and optional leader-approved redistribution.
            </p>
          </div>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            aria-label="Select order to consolidate"
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF] text-sm font-semibold text-[#124D52]"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} · {o.product_name} ({o.quantity})
              </option>
            ))}
          </select>
        </section>

        {c && (
          <>
            {/* 6 Key Consolidation Metrics */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="bg-white rounded-2xl border border-[#075B62]/12 p-4">
                <div className="text-xs text-[#252525]/65">Order Qty</div>
                <div className="font-mono-num text-2xl font-bold text-[#124D52] mt-1">
                  {c.totalOrderQty}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#075B62]/12 p-4">
                <div className="text-xs text-[#252525]/65">Completed</div>
                <div className="font-mono-num text-2xl font-bold text-[#075B62] mt-1">
                  {c.totalCompletedQty}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#075B62]/12 p-4">
                <div className="text-xs text-[#252525]/65">Pending</div>
                <div className="font-mono-num text-2xl font-bold text-[#B45309] mt-1">
                  {c.pendingQty}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#075B62]/12 p-4">
                <div className="text-xs text-[#252525]/65">Accepted</div>
                <div className="font-mono-num text-2xl font-bold text-[#14532D] mt-1">
                  {c.acceptedPieces}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#075B62]/12 p-4">
                <div className="text-xs text-[#252525]/65">Needs Rework</div>
                <div className="font-mono-num text-2xl font-bold text-[#D9534F] mt-1">
                  {c.reworkPieces}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#075B62]/12 p-4">
                <div className="text-xs text-[#252525]/65">Deadline Left</div>
                <div className="font-mono-num text-2xl font-bold text-[#124D52] mt-1">
                  {c.remainingDays}d
                </div>
              </div>
            </section>

            {/* Completion Bar */}
            <section className="bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-[#124D52]">
                <span>Overall Order Completion</span>
                <span className="font-mono-num text-lg">{c.completionPct}%</span>
              </div>
              <div className="h-3.5 w-full bg-[#E9E3F5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#075B62] rounded-full transition-all"
                  style={{ width: `${c.completionPct}%` }}
                />
              </div>
              <p className="text-xs text-[#252525]/70 pt-1">{c.aiAdvisory}</p>
            </section>

            {message && (
              <div className="p-4 rounded-2xl bg-[#DCEFE3] text-sm font-medium text-[#14532D] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {/* Risk Flags & Suggested Redistribution */}
            <section className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-3">
                <h3 className="font-display text-base font-bold text-[#124D52]">
                  Delivery Risk Flags
                </h3>
                {c.riskFlags.length === 0 ? (
                  <p className="text-sm text-[#14532D] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    No schedule risks flagged for this order.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {c.riskFlags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#F2A15A]/15 border border-[#F2A15A]/45 flex items-start gap-2.5 text-sm text-[#7C2D12]"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{flag.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-3">
                <h3 className="font-display text-base font-bold text-[#124D52]">
                  Suggested Redistribution (Leader Approval Required)
                </h3>
                {c.suggestedRedistribution.length === 0 ? (
                  <p className="text-sm text-[#252525]/70">
                    Current work distribution is balanced across members.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {c.suggestedRedistribution.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[#FFF8EF] border border-[#075B62]/15 space-y-3"
                      >
                        <div className="text-sm font-semibold text-[#124D52]">
                          Move <span className="font-mono-num">{rec.transferQty}</span> pieces:{' '}
                          {rec.fromMemberName} → {rec.toMemberName}
                        </div>
                        <p className="text-xs text-[#252525]/75">{rec.reason}</p>
                        <button
                          type="button"
                          onClick={() => handleApplyRedistribution(rec)}
                          disabled={applying}
                          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#075B62] text-white text-xs font-semibold hover:bg-[#124D52] inline-flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>
                            {applying ? 'Applying...' : 'Approve & Apply Redistribution'}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className="flex justify-end">
              <Link
                to={`/leader/payouts?orderId=${selectedOrderId}`}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-[#075B62] text-white text-sm font-semibold hover:bg-[#124D52] inline-flex items-center gap-2"
              >
                <span>Proceed to Step 6: Group Payout Summary</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
