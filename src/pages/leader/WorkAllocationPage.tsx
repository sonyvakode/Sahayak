import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  X,
  Edit3,
  Package,
  RotateCcw,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { WorkflowScreenLayout } from '../../components/WorkflowScreenLayout';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { apiFetch } from '../../lib/api';
import { getMemberAvatar } from '../../lib/memberAvatars';
import type { OrderRecord } from '../../types';

interface AllocationRow {
  memberId: string;
  memberName: string;
  suggestedQty: number;
  allocatedQty: number;
  completedQty: number;
  aiReason: string;
  capacityNote?: string;
}

export function WorkAllocationPage({
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
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ orders: OrderRecord[] }>('/api/orders').then((res) => {
      setOrders(res.orders);
      if (!searchParams.get('orderId') && res.orders.length > 0) {
        const defaultOrd = res.orders.find((o) => o.id === 'ORD-2026-0012') || res.orders[0];
        setSelectedOrderId(defaultOrd.id);
      }
    });
  }, [searchParams]);

  const loadExistingOrSuggest = async (orderId: string) => {
    setError(null);
    setSavedMsg(null);
    setLoading(true);
    try {
      const detail = await apiFetch<{
        order: OrderRecord;
        allocations: Array<{
          member_id: string;
          member_name: string;
          suggested_qty: number;
          allocated_qty: number;
          completed_qty: number;
          ai_reason: string;
          daily_capacity: number;
          availability: string;
        }>;
      }>(`/api/orders/${orderId}`);

      if (detail.allocations.length > 0) {
        setRows(
          detail.allocations.map((a) => ({
            memberId: a.member_id,
            memberName: a.member_name,
            suggestedQty: a.suggested_qty,
            allocatedQty: a.allocated_qty,
            completedQty: a.completed_qty || 0,
            aiReason: a.ai_reason,
            capacityNote: `${a.daily_capacity}/day capacity · ${a.availability}`,
          }))
        );
      } else {
        await generateSuggestion(orderId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load allocations');
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestion = async (orderId: string) => {
    setError(null);
    setSavedMsg(null);
    setLoading(true);
    try {
      const proposal = await apiFetch<{
        allocations: Array<{
          memberId: string;
          memberName: string;
          suggestedQty: number;
          aiReason: string;
          capacityNote: string;
        }>;
      }>('/api/agents/allocation/suggest', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      });

      setRows(
        proposal.allocations.map((a) => ({
          memberId: a.memberId,
          memberName: a.memberName,
          suggestedQty: a.suggestedQty,
          allocatedQty: a.suggestedQty,
          completedQty: 0,
          aiReason: a.aiReason,
          capacityNote: a.capacityNote,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI recommendation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrderId) {
      loadExistingOrSuggest(selectedOrderId);
    }
  }, [selectedOrderId]);

  const currentOrder = orders.find((o) => o.id === selectedOrderId);
  const targetQty = currentOrder?.quantity ?? 500;
  const currentTotal = rows.reduce((sum, r) => sum + (Number(r.allocatedQty) || 0), 0);
  const difference = targetQty - currentTotal;

  const updateMemberQty = (memberId: string, nextVal: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.memberId === memberId ? { ...r, allocatedQty: Math.max(0, Math.floor(nextVal)) } : r
      )
    );
  };

  const handleResetEqual = () => {
    if (rows.length === 0) return;
    setError(null);
    setSavedMsg(null);
    const base = Math.floor(targetQty / rows.length);
    const rem = targetQty % rows.length;
    setRows((prev) =>
      prev.map((r, idx) => ({
        ...r,
        allocatedQty: base + (idx < rem ? 1 : 0),
      }))
    );
  };

  const progressRoute =
    shell === 'workflow'
      ? `/order-progress?orderId=${selectedOrderId}`
      : `/leader/progress?orderId=${selectedOrderId}`;

  const handleApprove = async () => {
    if (difference !== 0) {
      setError(`Total assigned (${currentTotal}) must equal order quantity (${targetQty}).`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/allocation/approve', {
        method: 'POST',
        body: JSON.stringify({
          orderId: selectedOrderId,
          allocations: rows,
        }),
      });
      setEditMode(false);
      setSavedMsg(`Allocation approved for ${selectedOrderId}. Moving to Order Progress...`);
      navigate(progressRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve allocation');
    } finally {
      setSaving(false);
    }
  };

  const screenBody = (
    <div className="bg-[#FFFCF7] rounded-3xl border border-[#075B62]/15 shadow-sm p-5 sm:p-8 space-y-5 flex-1 flex flex-col justify-between">
      <div className="space-y-5">
        {/* Order Information Card */}
        <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#E9E3F5] text-[#075B62] flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="font-mono-num text-xs font-semibold text-[#8274A8]">
                Order #{selectedOrderId}
              </div>
              <div className="font-display text-base font-bold text-[#124D52]">
                {currentOrder?.product_name || 'Cotton Bags'}
              </div>
              <div className="text-xs text-[#777777] font-mono-num">
                Total quantity: <strong className="text-[#124D52]">{targetQty} pieces</strong> · Deadline:{' '}
                <strong className="text-[#124D52]">
                  {currentOrder?.deadline_days ?? 20} days
                </strong>
              </div>
            </div>
          </div>

          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            aria-label="Select order"
            className="min-h-[42px] px-3 py-1.5 rounded-xl border border-[#075B62]/20 bg-white text-xs font-semibold text-[#124D52]"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} · {o.product_name} ({o.quantity})
              </option>
            ))}
          </select>
        </div>

        {/* Allocation Assistance Explanation */}
        <div className="p-3.5 rounded-2xl bg-[#E9E3F5]/45 border border-[#8274A8]/20 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#124D52] leading-relaxed flex-1 min-w-[220px]">
            Work is distributed equally across four available members. The leader can adjust the allocation based on skills, capacity, and availability.
          </p>
          <button
            type="button"
            onClick={() => generateSuggestion(selectedOrderId)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#8274A8]/30 text-[#124D52] text-xs font-semibold hover:bg-[#8274A8] hover:text-white inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Suggest</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-[#D9534F]/10 border border-[#D9534F]/30 text-sm text-[#991B1B]">
            {error}
          </div>
        )}

        {savedMsg && (
          <div className="p-3.5 rounded-xl bg-[#DCEFE3] text-sm font-medium text-[#14532D] flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {savedMsg}
            </span>
          </div>
        )}

        {/* 4 Member Cards */}
        <div className="grid sm:grid-cols-2 gap-3.5">
          {loading ? (
            <div className="sm:col-span-2 h-44 rounded-2xl bg-[#FFF8EF] animate-pulse" />
          ) : (
            rows.map((row) => {
              const pct =
                row.allocatedQty > 0
                  ? Math.min(100, Math.round((row.completedQty / row.allocatedQty) * 100))
                  : 0;
              return (
                <div
                  key={row.memberId}
                  className="p-4 rounded-2xl bg-[#FFF8EF]/75 border border-[#075B62]/15 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ImageWithFallback
                        src={getMemberAvatar(row.memberName)}
                        alt={row.memberName}
                        className="w-12 h-12 rounded-full object-cover border border-[#075B62]/20 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-display text-base font-bold text-[#124D52] truncate">
                          {row.memberName}
                        </div>
                        <div className="text-xs text-[#777777]">
                          <span className="text-[#14532D] font-semibold">Available</span> ·{' '}
                          {row.capacityNote || 'On Track'}
                        </div>
                      </div>
                    </div>

                    {editMode ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateMemberQty(row.memberId, row.allocatedQty - 5)}
                          aria-label={`Decrease quantity for ${row.memberName}`}
                          className="w-9 h-9 rounded-xl bg-white border border-[#075B62]/20 font-bold text-[#124D52]"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={row.allocatedQty}
                          aria-label={`Assigned pieces for ${row.memberName}`}
                          onChange={(e) => updateMemberQty(row.memberId, Number(e.target.value))}
                          className="w-14 min-h-[36px] text-center font-mono-num font-bold rounded-xl border border-[#075B62]/25 bg-white text-[#124D52] text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => updateMemberQty(row.memberId, row.allocatedQty + 5)}
                          aria-label={`Increase quantity for ${row.memberName}`}
                          className="w-9 h-9 rounded-xl bg-white border border-[#075B62]/20 font-bold text-[#124D52]"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <div className="text-right shrink-0">
                        <div className="font-mono-num text-lg font-bold text-[#075B62]">
                          {row.allocatedQty} pcs
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono-num text-[#777777]">
                      <span>Progress: {row.completedQty} / {row.allocatedQty}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#E9E3F5] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#075B62] rounded-full"
                        style={{ width: `${pct || 25}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Total Validation & Bottom Actions */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-semibold text-[#124D52]">
            Total Assigned: <span className="font-mono-num text-sm">{currentTotal}</span> /{' '}
            <span className="font-mono-num">{targetQty}</span>
          </span>
          <span
            className={`font-semibold ${
              difference === 0 ? 'text-[#14532D]' : 'text-[#D9534F]'
            }`}
          >
            {difference === 0
              ? 'Balanced with order total'
              : `${Math.abs(difference)} ${difference > 0 ? 'remaining to assign' : 'over limit'}`}
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className="min-h-[48px] px-4 py-2.5 rounded-2xl border-2 border-[#075B62] text-[#075B62] text-sm font-bold hover:bg-[#E9E3F5]/40 inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            <span>{editMode ? 'Done Editing' : 'Edit Allocation'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetEqual}
            className="min-h-[48px] px-4 py-2.5 rounded-2xl border border-[#075B62]/25 bg-[#FFF8EF] text-[#124D52] text-sm font-bold hover:bg-[#E9E3F5]/50 inline-flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Allocation</span>
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={saving || difference !== 0}
            className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#075B62] text-white text-sm font-bold hover:bg-[#124D52] disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? 'Approving...' : 'Approve Allocation'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (shell === 'workflow') {
    return (
      <WorkflowScreenLayout currentStep={2}>
        {screenBody}
      </WorkflowScreenLayout>
    );
  }

  return (
    <AppShell title="Work Allocation">
      <div className="max-w-3xl mx-auto">
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
            <h2 className="font-display text-lg font-bold text-[#124D52]">Work Allocation</h2>
            <p className="text-xs font-mono-num text-[#777777]">
              {selectedOrderId} · Due {currentOrder?.deadline_days ?? 20} days
            </p>
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
