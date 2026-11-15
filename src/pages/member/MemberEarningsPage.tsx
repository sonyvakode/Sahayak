import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Volume2, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

interface MemberEarningsData {
  workItems: Array<{
    order_id: string;
    product_name: string;
    allocated_qty: number;
    completed_qty: number;
    accepted_qty: number;
    rework_qty: number;
  }>;
  payouts: Array<{
    id: string;
    order_id: string;
    product_name: string;
    accepted_pieces: number;
    rate_per_piece: number;
    gross_earnings: number;
    approval_status: string;
    transfer_status: string;
  }>;
}

export function MemberEarningsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<MemberEarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MemberEarningsData>('/api/member/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const totalEarnings = data?.payouts.reduce((s, p) => s + p.gross_earnings, 0) ?? 0;

  return (
    <AppShell title="My Personal Earnings">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="p-4 rounded-2xl bg-[#E9E3F5]/65 border border-[#8274A8]/25 flex items-center gap-3 text-xs font-medium text-[#124D52]">
          <ShieldCheck className="w-5 h-5 text-[#075B62] shrink-0" />
          <span>
            Privacy Protected: Only <strong>{user?.name}</strong> can view and listen to these personal earnings records.
          </span>
        </div>

        {loading || !data ? (
          <div className="h-44 rounded-2xl bg-white animate-pulse" />
        ) : (
          <>
            <section className="bg-[#075B62] text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-white/80">Total Recorded Earnings</div>
                <div className="font-mono-num text-4xl font-bold mt-1">
                  ₹{totalEarnings.toLocaleString('en-IN')}
                </div>
              </div>
              <Link
                to="/member/audio-summary"
                className="min-h-[48px] px-5 py-3 rounded-xl bg-[#FFF8EF] text-[#075B62] text-sm font-bold inline-flex items-center justify-center gap-2 shrink-0"
              >
                <Volume2 className="w-5 h-5" />
                <span>Hear Audio Summary</span>
              </Link>
            </section>

            {/* Payout Breakdown */}
            <section className="bg-white rounded-2xl border border-[#075B62]/15 p-5 sm:p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-[#124D52]">
                Order-Wise Earnings Breakdown
              </h2>
              <div className="space-y-3">
                {data.payouts.map((p) => {
                  const work = data.workItems.find((w) => w.order_id === p.order_id);
                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl bg-[#FFF8EF] border border-[#075B62]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="font-mono-num text-xs text-[#252525]/65">
                          {p.order_id} · {p.product_name}
                        </div>
                        <div className="text-sm font-semibold text-[#124D52]">
                          <span className="font-mono-num">{p.accepted_pieces}</span> accepted pieces ×{' '}
                          <span className="font-mono-num">₹{p.rate_per_piece}</span>
                          {work && work.rework_qty > 0 && (
                            <span className="text-xs font-normal text-[#B45309]">
                              {' '}
                              ({work.rework_qty} rework)
                            </span>
                          )}
                        </div>
                        <div className="text-xs">
                          {p.approval_status === 'approved_by_group' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#14532D]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Group Approved ·{' '}
                              {p.transfer_status === 'bank_confirmed'
                                ? 'Bank Confirmed'
                                : 'Awaiting Payment Rail'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#B45309]">
                              <Clock className="w-3.5 h-3.5" />
                              Pending Group Approval
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="font-mono-num text-2xl font-bold text-[#14532D]">
                        ₹{p.gross_earnings.toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
