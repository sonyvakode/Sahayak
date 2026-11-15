import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Volume2, Briefcase, CheckSquare, Wallet, ArrowRight } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { apiFetch } from '../../lib/api';

interface MemberDashboardData {
  workItems: Array<{
    allocation_id: string;
    order_id: string;
    product_name: string;
    due_date: string;
    remaining_days: number;
    allocated_qty: number;
    completed_qty: number;
    accepted_qty: number;
    rework_qty: number;
    worker_rate_per_piece: number | null;
  }>;
  payouts: Array<{
    id: string;
    order_id: string;
    product_name: string;
    accepted_pieces: number;
    rate_per_piece: number;
    gross_earnings: number;
    approval_status: string;
  }>;
}

export function MemberDashboardPage() {
  const { user } = useAuth();
  const { pendingCount } = useOffline();
  const [data, setData] = useState<MemberDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MemberDashboardData>('/api/member/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const activeWork = data?.workItems.find((w) => w.order_id === 'ORD-2026-0012') || data?.workItems[0];
  const totalEarnings = data?.payouts.reduce((s, p) => s + p.gross_earnings, 0) ?? 0;
  const totalAccepted = data?.payouts.reduce((s, p) => s + p.accepted_pieces, 0) ?? 0;

  return (
    <AppShell title={`Welcome, ${user?.name || 'Member'}`}>
      {loading || !data ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="h-36 rounded-2xl bg-white animate-pulse" />
          <div className="h-36 rounded-2xl bg-white animate-pulse" />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Primary Audio Earnings Shortcut */}
          <section className="bg-[#075B62] text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs text-white/80">Personal Audio Assistant · Private to {user?.name}</p>
              <h2 className="font-display text-xl sm:text-2xl font-bold">
                Listen to Your Earnings Summary
              </h2>
              <p className="text-sm text-white/85">
                Hear your accepted pieces and payout amount in Telugu, Hindi, Kannada, or English.
              </p>
            </div>
            <Link
              to="/member/audio-summary"
              className="min-h-[52px] px-6 py-3 rounded-xl bg-[#FFF8EF] text-[#075B62] font-bold text-sm hover:bg-white inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
            >
              <Volume2 className="w-5 h-5" />
              <span>Listen Now</span>
            </Link>
          </section>

          {/* 4 Large Touch Metric Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/member/work"
              className="bg-white rounded-2xl border border-[#075B62]/15 p-5 hover:border-[#075B62] transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#252525]/70">
                <span>Assigned Work</span>
                <Briefcase className="w-4 h-4 text-[#075B62]" />
              </div>
              <div className="font-mono-num text-3xl font-bold text-[#124D52] mt-2">
                {activeWork?.allocated_qty ?? 0}
              </div>
              <div className="text-xs text-[#252525]/65 mt-1">
                {activeWork?.product_name || 'No active task'}
              </div>
            </Link>

            <Link
              to="/member/progress"
              className="bg-white rounded-2xl border border-[#075B62]/15 p-5 hover:border-[#075B62] transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#252525]/70">
                <span>Completed</span>
                <CheckSquare className="w-4 h-4 text-[#075B62]" />
              </div>
              <div className="font-mono-num text-3xl font-bold text-[#075B62] mt-2">
                {activeWork?.completed_qty ?? 0}
              </div>
              <div className="text-xs text-[#252525]/65 mt-1">
                {pendingCount > 0 ? `${pendingCount} queued offline` : 'Tap to report work'}
              </div>
            </Link>

            <Link
              to="/member/earnings"
              className="bg-white rounded-2xl border border-[#075B62]/15 p-5 hover:border-[#075B62] transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#252525]/70">
                <span>Accepted Pieces</span>
                <CheckSquare className="w-4 h-4 text-[#14532D]" />
              </div>
              <div className="font-mono-num text-3xl font-bold text-[#14532D] mt-2">
                {totalAccepted}
              </div>
              <div className="text-xs text-[#252525]/65 mt-1">
                {activeWork?.rework_qty ?? 0} needing rework
              </div>
            </Link>

            <Link
              to="/member/earnings"
              className="bg-white rounded-2xl border border-[#075B62]/15 p-5 hover:border-[#075B62] transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#252525]/70">
                <span>My Total Earnings</span>
                <Wallet className="w-4 h-4 text-[#14532D]" />
              </div>
              <div className="font-mono-num text-3xl font-bold text-[#14532D] mt-2">
                ₹{totalEarnings.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-[#252525]/65 mt-1">Private to your account</div>
            </Link>
          </section>

          {/* Big Low-Literacy Action Buttons */}
          <section className="grid sm:grid-cols-3 gap-4">
            <Link
              to="/member/work"
              className="p-5 rounded-2xl bg-white border border-[#075B62]/15 hover:border-[#075B62] flex items-center justify-between min-h-[76px]"
            >
              <div>
                <div className="font-display text-base font-bold text-[#124D52]">
                  Listen to Instructions
                </div>
                <div className="text-xs text-[#252525]/70">Audio guide for your task</div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#075B62]" />
            </Link>

            <Link
              to="/member/progress"
              className="p-5 rounded-2xl bg-white border border-[#075B62]/15 hover:border-[#075B62] flex items-center justify-between min-h-[76px]"
            >
              <div>
                <div className="font-display text-base font-bold text-[#124D52]">
                  Report Finished Pieces
                </div>
                <div className="text-xs text-[#252525]/70">Works offline or online</div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#075B62]" />
            </Link>

            <Link
              to="/member/audio-summary"
              className="p-5 rounded-2xl bg-[#E9E3F5] border border-[#8274A8]/25 hover:border-[#075B62] flex items-center justify-between min-h-[76px]"
            >
              <div>
                <div className="font-display text-base font-bold text-[#124D52]">
                  Hear My Payout
                </div>
                <div className="text-xs text-[#252525]/70">Telugu · Hindi · Kannada</div>
              </div>
              <Volume2 className="w-5 h-5 text-[#075B62]" />
            </Link>
          </section>
        </div>
      )}
    </AppShell>
  );
}
