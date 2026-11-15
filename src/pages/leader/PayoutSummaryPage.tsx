import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ShieldAlert,
  Clock,
  ChevronLeft,
  X,
  FileSearch,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { WorkflowScreenLayout } from '../../components/WorkflowScreenLayout';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { apiFetch } from '../../lib/api';
import { getMemberAvatar } from '../../lib/memberAvatars';
import type { OrderRecord } from '../../types';

interface PayoutRow {
  id: string;
  order_id: string;
  member_id: string;
  member_name: string;
  product_name: string;
  accepted_pieces: number;
  rate_per_piece: number;
  gross_earnings: number;
  approval_status: 'pending_group_approval' | 'approved_by_group';
  transfer_status: 'awaiting_payment_rail' | 'bank_confirmed';
}

interface PayoutResponse {
  orderId: string;
  payouts: PayoutRow[];
  summary: {
    totalAcceptedPieces: number;
    totalGroupPayout: number;
  };
  history: Array<{
    order_id: string;
    product_name: string;
    total_accepted: number;
    total_payout: number;
    approval_status: string;
  }>;
}

export function PayoutSummaryPage({
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
  const [data, setData] = useState<PayoutResponse | null>(null);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadPayouts = (orderId: string) => {
    apiFetch<PayoutResponse>(`/api/leader/payouts?orderId=${orderId}`).then(setData);
  };

  useEffect(() => {
    apiFetch<{ orders: OrderRecord[] }>('/api/orders').then((res) => setOrders(res.orders));
  }, []);

  useEffect(() => {
    setMsg(null);
    setConfirmOpen(false);
    loadPayouts(selectedOrderId);
  }, [selectedOrderId]);

  const handleGroupApprove = async () => {
    setApproving(true);
    setMsg(null);
    try {
      await apiFetch('/api/leader/payouts/approve', {
        method: 'POST',
        body: JSON.stringify({ orderId: selectedOrderId }),
      });
      setConfirmOpen(false);
      setMsg(
        `Group payout approved for ${selectedOrderId}. Status: Approved by Group (transfer awaits external payment rail confirmation).`
      );
      loadPayouts(selectedOrderId);
    } finally {
      setApproving(false);
    }
  };

  const allApproved =
    data &&
    data.payouts.length > 0 &&
    data.payouts.every((p) => p.approval_status === 'approved_by_group');
  const currentOrder = orders.find((o) => o.id === selectedOrderId);
  const unitRate = data?.payouts[0]?.rate_per_piece ?? 25;

  const screenBody = (
    <div className="bg-[#FFFCF7] rounded-3xl border border-[#075B62]/15 shadow-sm p-5 sm:p-8 space-y-5 flex-1 flex flex-col justify-between">
      <div className="space-y-5">
        {/* Order & Rate Bar */}
        <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-mono-num text-xs font-semibold text-[#8274A8]">
              Order #{selectedOrderId} · {currentOrder?.product_name || 'Cotton Bags'}
            </div>
            <div className="font-mono-num text-xl font-bold text-[#075B62] mt-0.5">
              Rate per accepted piece: ₹{unitRate}
            </div>
          </div>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            aria-label="Select order for payout"
            className="min-h-[42px] px-3 py-1.5 rounded-xl border border-[#075B62]/20 bg-white text-xs font-semibold text-[#124D52]"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} · {o.product_name}
              </option>
            ))}
          </select>
        </div>

        {msg && (
          <div className="p-3.5 rounded-2xl bg-[#DCEFE3] text-sm font-medium text-[#14532D] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {data && (
          <>
            {/* Individual Member Payout Cards */}
            {data.payouts.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#777777]">
                No accepted pieces recorded for {data.orderId} yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.payouts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-[#FFF8EF]/75 border border-[#075B62]/15 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ImageWithFallback
                        src={getMemberAvatar(p.member_name)}
                        alt={p.member_name}
                        className="w-11 h-11 rounded-full object-cover border border-[#075B62]/20 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-display text-base font-bold text-[#124D52] truncate">
                          {p.member_name}
                        </div>
                        <div className="text-xs font-mono-num text-[#777777]">
                          {p.accepted_pieces} accepted pieces × ₹{p.rate_per_piece}
                        </div>
                        <div className="text-[11px] mt-0.5">
                          {p.approval_status === 'approved_by_group' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#14532D]">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved by Group · Awaiting Payment Rail
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#B45309]">
                              <Clock className="w-3 h-3" />
                              Pending Group Approval
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono-num text-xl font-bold text-[#14532D] shrink-0">
                      ₹{p.gross_earnings.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Deterministic Review Panel (toggled by Review Payout) */}
            {showReviewPanel && data.payouts.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#E9E3F5]/55 border border-[#8274A8]/30 space-y-2 text-xs text-[#124D52]">
                <div className="font-display text-sm font-bold">
                  Deterministic Payout Verification
                </div>
                <p>
                  Formula: <strong>Member Earnings = Accepted Pieces × Rate Per Piece</strong>. Group Payout = Sum of All Member Earnings.
                </p>
                <div className="space-y-1 font-mono-num pt-1">
                  {data.payouts.map((p) => (
                    <div key={p.id} className="flex justify-between">
                      <span>
                        {p.member_name} ({p.accepted_pieces} × ₹{p.rate_per_piece})
                      </span>
                      <span className="font-bold">₹{p.gross_earnings.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#8274A8]/30 pt-1 flex justify-between font-bold text-sm">
                    <span>Total Group Payout ({data.summary.totalAcceptedPieces} accepted)</span>
                    <span>₹{data.summary.totalGroupPayout.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Total Group Payout Card */}
            <div className="p-5 rounded-2xl bg-[#075B62] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
              <div>
                <div className="text-xs text-white/80">Total Group Payout</div>
                <div className="text-xs font-mono-num text-white/90 mt-0.5">
                  Total accepted pieces: {data.summary.totalAcceptedPieces}
                </div>
              </div>
              <div className="font-mono-num text-2xl sm:text-3xl font-bold">
                ₹{data.summary.totalGroupPayout.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#E9E3F5]/55 flex items-center gap-2 text-xs text-[#124D52]">
              <ShieldAlert className="w-4 h-4 text-[#8274A8] shrink-0" />
              <span>
                Explicit group approval is required before payout approval. Transfers are never marked paid without real payment integration.
              </span>
            </div>

            {/* Action Buttons: Review Payout + Approve Group Payout */}
            {data.payouts.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowReviewPanel((v) => !v)}
                  className="min-h-[50px] px-5 py-3 rounded-2xl border-2 border-[#075B62] text-[#075B62] text-sm font-bold hover:bg-[#E9E3F5]/45 inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <FileSearch className="w-4 h-4" />
                  <span>{showReviewPanel ? 'Hide Payout Review' : 'Review Payout'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={approving || Boolean(allApproved)}
                  className="min-h-[50px] px-5 py-3 rounded-2xl bg-[#075B62] text-white text-sm font-bold hover:bg-[#124D52] disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {allApproved ? 'Group Payout Approved' : 'Approve Group Payout'}
                  </span>
                </button>
              </div>
            )}

            {/* Confirmation Dialog */}
            {confirmOpen && !allApproved && (
              <div
                role="dialog"
                aria-label="Confirm Group Payout Approval"
                className="p-4 rounded-2xl bg-[#FFF8EF] border-2 border-[#075B62] space-y-3"
              >
                <div className="font-display text-sm font-bold text-[#124D52]">
                  Confirm Group Payout Approval
                </div>
                <p className="text-xs text-[#252525]/80">
                  Approve ₹{data.summary.totalGroupPayout.toLocaleString('en-IN')} across{' '}
                  {data.summary.totalAcceptedPieces} accepted pieces for Order {selectedOrderId}?
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleGroupApprove}
                    disabled={approving}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#075B62] text-white text-xs font-bold"
                  >
                    {approving ? 'Approving...' : 'Confirm Approval'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    className="min-h-[42px] px-4 py-2 rounded-xl border border-[#075B62]/25 bg-white text-[#124D52] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payout History */}
      {data && data.history.length > 0 && (
        <section className="bg-[#FFF8EF]/65 rounded-2xl border border-[#075B62]/12 p-4 space-y-2.5">
          <h2 className="font-display text-sm font-bold text-[#124D52]">Payout History</h2>
          <div className="divide-y divide-[#075B62]/10 text-sm">
            {data.history.map((h) => (
              <div key={h.order_id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono-num font-semibold text-[#124D52]">{h.order_id}</span>
                  <span className="text-[#777777]"> · {h.product_name}</span>
                  <div className="text-xs font-mono-num text-[#777777]">
                    {h.total_accepted} accepted pieces
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono-num font-bold text-[#124D52]">
                    ₹{Number(h.total_payout).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-[#777777]">
                    {h.approval_status === 'approved_by_group'
                      ? 'Group Approved'
                      : 'Pending Approval'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  if (shell === 'workflow') {
    return (
      <WorkflowScreenLayout currentStep={4}>
        {screenBody}
      </WorkflowScreenLayout>
    );
  }

  return (
    <AppShell title="Payout Summary">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#075B62]/10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-11 h-11 rounded-xl bg-white text-[#124D52] flex items-center justify-center hover:bg-[#E9E3F5]/60"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="font-display text-lg font-bold text-[#124D52]">Payout Summary</h2>
            <p className="text-xs font-mono-num text-[#777777]">
              {selectedOrderId} · {currentOrder?.product_name || 'Cotton Bags'}
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
