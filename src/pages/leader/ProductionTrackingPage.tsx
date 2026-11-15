import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  X,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { WorkflowScreenLayout } from '../../components/WorkflowScreenLayout';
import { CircularProgress } from '../../components/CircularProgress';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { apiFetch } from '../../lib/api';
import { getMemberAvatar } from '../../lib/memberAvatars';
import type { OrderRecord } from '../../types';

interface TrackingResponse {
  order: OrderRecord & { price_per_unit?: number; deadline_days?: number };
  memberSnapshots: Array<{
    allocation_id: string;
    member_id: string;
    member_name: string;
    daily_capacity: number;
    allocated_qty: number;
    completed_qty: number;
    accepted_qty: number;
    rework_qty: number;
  }>;
  consolidation: {
    totalOrderQty: number;
    totalCompletedQty: number;
    pendingQty: number;
    acceptedPieces: number;
    reworkPieces: number;
    completionPct: number;
    remainingDays: number;
    aiAdvisory: string;
  };
}

export function ProductionTrackingPage({
  shell = 'workflow',
}: {
  shell?: 'workflow' | 'portal';
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState(
    searchParams.get('orderId') || 'ORD-2026-0012'
  );
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Leader Update Controls (Production Completed + Quality Status)
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [completedInput, setCompletedInput] = useState('100');
  const [acceptedInput, setAcceptedInput] = useState('95');
  const [reworkInput, setReworkInput] = useState('5');
  const [qcNotes, setQcNotes] = useState('');
  const [savingProd, setSavingProd] = useState(false);
  const [savingQc, setSavingQc] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const syncSelectedMemberFields = (
    snapshots: TrackingResponse['memberSnapshots'],
    memberId: string
  ) => {
    const snap = snapshots.find((m) => m.member_id === memberId) || snapshots[0];
    if (snap) {
      setSelectedMemberId(snap.member_id);
      setCompletedInput(String(snap.completed_qty));
      setAcceptedInput(String(snap.accepted_qty));
      setReworkInput(String(snap.rework_qty));
    }
  };

  const loadTracking = (orderId: string, preserveMemberId?: string) => {
    setLoading(true);
    apiFetch<TrackingResponse>(`/api/orders/${orderId}/tracking`)
      .then((res) => {
        setTracking(res);
        if (res.memberSnapshots.length > 0) {
          syncSelectedMemberFields(
            res.memberSnapshots,
            preserveMemberId || selectedMemberId || res.memberSnapshots[0].member_id
          );
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiFetch<{ orders: OrderRecord[] }>('/api/orders').then((res) => setOrders(res.orders));
  }, []);

  useEffect(() => {
    loadTracking(selectedOrderId);
  }, [selectedOrderId]);

  const currentOrderMeta = orders.find((o) => o.id === selectedOrderId);
  const activeMemberSnap = tracking?.memberSnapshots.find(
    (m) => m.member_id === selectedMemberId
  );

  const handleSelectMember = (memberId: string) => {
    if (!tracking) return;
    setFeedbackMsg(null);
    setErrorMsg(null);
    syncSelectedMemberFields(tracking.memberSnapshots, memberId);
  };

  const handleUpdateCompleted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMemberSnap) return;
    setSavingProd(true);
    setFeedbackMsg(null);
    setErrorMsg(null);
    try {
      await apiFetch(`/api/orders/${selectedOrderId}/production/update`, {
        method: 'POST',
        body: JSON.stringify({
          memberId: activeMemberSnap.member_id,
          allocationId: activeMemberSnap.allocation_id,
          completedQty: Number(completedInput) || 0,
        }),
      });
      setFeedbackMsg(
        `Updated completed production for ${activeMemberSnap.member_name} to ${completedInput} pieces.`
      );
      loadTracking(selectedOrderId, activeMemberSnap.member_id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update completed quantity');
    } finally {
      setSavingProd(false);
    }
  };

  const handleUpdateQuality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMemberSnap) return;
    setSavingQc(true);
    setFeedbackMsg(null);
    setErrorMsg(null);
    try {
      await apiFetch(`/api/orders/${selectedOrderId}/quality/set-member`, {
        method: 'POST',
        body: JSON.stringify({
          memberId: activeMemberSnap.member_id,
          allocationId: activeMemberSnap.allocation_id,
          acceptedQty: Number(acceptedInput) || 0,
          reworkQty: Number(reworkInput) || 0,
          notes: qcNotes,
        }),
      });
      setFeedbackMsg(
        `Updated quality inspection for ${activeMemberSnap.member_name}: ${acceptedInput} accepted, ${reworkInput} needs rework. Payouts recalculated.`
      );
      setQcNotes('');
      loadTracking(selectedOrderId, activeMemberSnap.member_id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save quality inspection');
    } finally {
      setSavingQc(false);
    }
  };

  const c = tracking?.consolidation;
  const payoutRoute =
    shell === 'workflow'
      ? `/payout-summary?orderId=${selectedOrderId}`
      : `/leader/payouts?orderId=${selectedOrderId}`;

  const deadlineDays = tracking?.order?.deadline_days ?? currentOrderMeta?.deadline_days ?? 20;
  const supportNeededMembers =
    tracking?.memberSnapshots.filter(
      (m) => m.rework_qty > 0 || (m.allocated_qty > 0 && m.completed_qty / m.allocated_qty < 0.76)
    ) ?? [];

  const screenBody = (
    <div className="bg-[#FFFCF7] rounded-3xl border border-[#075B62]/15 shadow-sm p-5 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
      {/* Order Details Header */}
      <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/12 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono-num text-xs font-semibold text-[#8274A8]">
            Order #{selectedOrderId} · Delivery deadline: {deadlineDays} days
          </div>
          <div className="font-display text-base font-bold text-[#124D52]">
            {currentOrderMeta?.product_name || 'Cotton Bags'} ·{' '}
            <span className="font-mono-num">{c?.totalOrderQty ?? 500} total</span>
          </div>
        </div>
        <select
          value={selectedOrderId}
          onChange={(e) => setSelectedOrderId(e.target.value)}
          aria-label="Select order"
          className="min-h-[42px] px-3.5 py-1.5 rounded-xl border border-[#075B62]/20 bg-white text-xs font-semibold text-[#124D52]"
        >
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id} · {o.product_name} ({o.quantity})
            </option>
          ))}
        </select>
      </div>

      {loading || !c || !tracking ? (
        <div className="h-64 rounded-2xl bg-[#FFF8EF] animate-pulse" />
      ) : (
        <>
          {/* Large Circular Progress Ring + Quality Inspection Cards */}
          <div className="grid md:grid-cols-12 gap-6 items-center bg-[#FFF8EF] rounded-2xl border border-[#075B62]/12 p-5">
            <div className="md:col-span-5 flex flex-col items-center">
              <CircularProgress
                completed={c.totalCompletedQty}
                pending={c.pendingQty}
                total={c.totalOrderQty}
                size={200}
              />
              <div className="mt-2 text-xs font-mono-num font-semibold text-[#777777]">
                {c.totalCompletedQty} completed · {c.pendingQty} pending · {c.totalOrderQty} total
              </div>
            </div>

            <div className="md:col-span-7 space-y-3">
              <div className="text-sm font-display font-bold text-[#124D52]">
                Quality Inspection Status
              </div>
              <p className="text-xs text-[#777777]">
                Production completion ({c.totalCompletedQty} pcs) is tracked separately from quality-accepted pieces ({c.acceptedPieces} pcs). Payouts apply only to accepted pieces.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[#DCEFE3] text-[#14532D] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accepted</span>
                  </div>
                  <div className="font-mono-num text-3xl font-bold">{c.acceptedPieces}</div>
                  <div className="text-[11px] font-medium">Approved for payout</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F2A15A]/25 text-[#7C2D12] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <RotateCcw className="w-4 h-4" />
                    <span>Needs Rework</span>
                  </div>
                  <div className="font-mono-num text-3xl font-bold">{c.reworkPieces}</div>
                  <div className="text-[11px] font-medium">Excluded until fixed</div>
                </div>
              </div>

              {/* Delivery Deadline Alert + Support Notice */}
              <div className="p-3.5 rounded-2xl bg-[#F2A15A]/20 border border-[#F2A15A]/50 flex items-start gap-2.5 text-xs text-[#7C2D12]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div>
                    <span className="font-bold">
                      Delivery Deadline Alert ({c.remainingDays} days remaining):
                    </span>{' '}
                    {c.aiAdvisory}
                  </div>
                  {supportNeededMembers.length > 0 && (
                    <div className="font-medium">
                      Support focus: {supportNeededMembers.map((m) => m.member_name).join(', ')}.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Member-Level Production & Quality Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#124D52]">
                Individual Production &amp; Quality Breakdown
              </h2>
              <Link
                to={`/leader/quality?orderId=${selectedOrderId}`}
                className="text-xs font-semibold text-[#075B62] hover:underline"
              >
                Attach Sample Photo
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-3.5">
              {tracking.memberSnapshots.map((m) => {
                const pct =
                  m.allocated_qty > 0
                    ? Math.min(100, Math.round((m.completed_qty / m.allocated_qty) * 100))
                    : 0;
                const isSelected = m.member_id === selectedMemberId;
                return (
                  <button
                    key={m.member_id}
                    type="button"
                    onClick={() => handleSelectMember(m.member_id)}
                    className={`text-left p-4 rounded-2xl border transition-all space-y-2.5 ${
                      isSelected
                        ? 'bg-[#E9E3F5]/45 border-[#075B62] shadow-sm'
                        : 'bg-[#FFF8EF]/70 border-[#075B62]/15 hover:border-[#075B62]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ImageWithFallback
                          src={getMemberAvatar(m.member_name)}
                          alt={m.member_name}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#075B62]/15"
                        />
                        <div className="min-w-0">
                          <div className="font-display text-sm font-bold text-[#124D52] truncate">
                            {m.member_name}
                          </div>
                          <div className="text-[11px] font-mono-num text-[#777777]">
                            Completed: <strong className="text-[#124D52]">{m.completed_qty}</strong> /{' '}
                            {m.allocated_qty} ({pct}%)
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-2.5 w-full bg-[#E9E3F5] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct < 75 ? 'bg-[#F2A15A]' : 'bg-[#075B62]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Member-Level Quality Reconciliation */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] font-mono-num">
                      <span className="px-2.5 py-1 rounded-lg bg-[#DCEFE3] text-[#14532D] font-bold">
                        Accepted: {m.accepted_qty}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#F2A15A]/25 text-[#7C2D12] font-bold">
                        Needs Rework: {m.rework_qty}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {feedbackMsg && (
            <div className="p-3.5 rounded-xl bg-[#DCEFE3] text-xs font-semibold text-[#14532D]">
              {feedbackMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#D9534F]/10 border border-[#D9534F]/30 text-xs font-semibold text-[#991B1B]">
              {errorMsg}
            </div>
          )}

          {/* Leader Interactive Controls: Update Completed Qty + Update Quality Inspection */}
          <div className="grid md:grid-cols-2 gap-4">
            <form
              onSubmit={handleUpdateCompleted}
              className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/15 space-y-3"
            >
              <div className="flex items-center gap-2 font-display text-sm font-bold text-[#124D52]">
                <ClipboardCheck className="w-4 h-4 text-[#075B62]" />
                <span>Update Completed Quantity</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#777777] mb-1">
                    Member
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => handleSelectMember(e.target.value)}
                    aria-label="Member for production update"
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl border border-[#075B62]/20 bg-white text-xs font-semibold"
                  >
                    {tracking.memberSnapshots.map((m) => (
                      <option key={m.member_id} value={m.member_id}>
                        {m.member_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#777777] mb-1">
                    Completed (Max {activeMemberSnap?.allocated_qty ?? 125})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={activeMemberSnap?.allocated_qty ?? 500}
                    value={completedInput}
                    onChange={(e) => setCompletedInput(e.target.value)}
                    aria-label="Member completed quantity"
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl border border-[#075B62]/20 bg-white text-xs font-mono-num font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProd}
                className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#124D52] text-white text-xs font-bold hover:bg-[#075B62]"
              >
                {savingProd ? 'Updating...' : 'Save Production Progress'}
              </button>
            </form>

            <form
              onSubmit={handleUpdateQuality}
              className="p-4 rounded-2xl bg-[#E9E3F5]/45 border border-[#8274A8]/25 space-y-3"
            >
              <div className="flex items-center gap-2 font-display text-sm font-bold text-[#124D52]">
                <ShieldCheck className="w-4 h-4 text-[#075B62]" />
                <span>Update Quality Inspection</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#777777] mb-1">
                    Accepted Pieces
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={acceptedInput}
                    onChange={(e) => setAcceptedInput(e.target.value)}
                    aria-label="Member accepted pieces"
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl border border-[#075B62]/20 bg-white text-xs font-mono-num font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#777777] mb-1">
                    Needs Rework
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={reworkInput}
                    onChange={(e) => setReworkInput(e.target.value)}
                    aria-label="Member rework pieces"
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl border border-[#F2A15A]/45 bg-white text-xs font-mono-num font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Inspection note..."
                  className="flex-1 min-w-0 min-h-[42px] px-3 py-1.5 rounded-xl border border-[#075B62]/15 bg-white text-xs"
                />
                <button
                  type="submit"
                  disabled={savingQc}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#075B62] text-white text-xs font-bold hover:bg-[#124D52] whitespace-nowrap"
                >
                  {savingQc ? 'Saving...' : 'Save QC'}
                </button>
              </div>
            </form>
          </div>

          {shell === 'portal' && (
            <div className="flex justify-end">
              <Link
                to={payoutRoute}
                className="min-h-[48px] px-6 py-3 rounded-2xl bg-[#075B62] text-white text-sm font-bold hover:bg-[#124D52] inline-flex items-center gap-2"
              >
                <span>Open Payout Summary</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (shell === 'workflow') {
    return (
      <WorkflowScreenLayout currentStep={3}>
        {screenBody}
      </WorkflowScreenLayout>
    );
  }

  return (
    <AppShell title="Order Progress & Quality">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#075B62]/10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-11 h-11 rounded-xl bg-white text-[#124D52] flex items-center justify-center hover:bg-[#E9E3F5]/60"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="font-display text-lg font-bold text-[#124D52]">
              Order Progress &amp; Quality
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/leader/dashboard')}
            aria-label="Close to dashboard"
            className="w-11 h-11 rounded-xl bg-white text-[#124D52] flex items-center justify-center hover:bg-[#E9E3F5]/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {screenBody}
      </div>
    </AppShell>
  );
}
