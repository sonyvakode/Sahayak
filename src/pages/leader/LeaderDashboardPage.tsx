import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ClipboardList,
  Users,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { OrderStatusText } from '../../components/StatusText';
import { apiFetch } from '../../lib/api';
import type { OrderRecord } from '../../types';

interface DashboardResponse {
  metrics: {
    totalActiveOrders: number;
    ordersAwaitingApproval: number;
    workInProgress: number;
    completedOrders: number;
    pendingQualityInspections: number;
    totalGroupEarnings: number;
    approvedGroupPayouts: number;
  };
  upcomingDeadlines: OrderRecord[];
  memberActivity: Array<{
    id: string;
    name: string;
    daily_capacity: number;
    availability: string;
    preferred_language: string;
    active_assigned: number;
    active_completed: number;
    active_accepted: number;
  }>;
  orders: OrderRecord[];
}

export function LeaderDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardResponse>('/api/leader/dashboard')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Leader Dashboard">
      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-[#075B62]/10 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#D9534F]/10 border border-[#D9534F]/30 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Primary Action Banner */}
          <section className="bg-[#075B62] text-white rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-white/80">
                Saraswati Mahila SHG · 6-Step Order Assistant
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-bold">
                Record a new regional-language voice order
              </h2>
              <p className="text-sm text-white/85">
                Speak in Telugu, Hindi, Kannada, or English to extract product, quantity, and deadline.
              </p>
            </div>
            <Link
              to="/leader/orders/new"
              className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#FFF8EF] text-[#075B62] font-semibold text-sm hover:bg-white transition-colors min-h-[48px] shrink-0 whitespace-nowrap"
            >
              <Mic className="w-4 h-4" />
              <span>Start Voice Order Intake</span>
            </Link>
          </section>

          {/* 4-Column KPI Summary */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/leader/orders"
              className="bg-white rounded-2xl border border-[#075B62]/12 p-4 sm:p-5 hover:border-[#075B62] transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-medium text-[#252525]/70">
                <span>Total Active Orders</span>
                <ClipboardList className="w-4 h-4 text-[#075B62]" />
              </div>
              <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-[#124D52]">
                {data.metrics.totalActiveOrders}
              </div>
              <div className="mt-1 text-xs text-[#252525]/65">
                {data.metrics.workInProgress} in production · {data.metrics.completedOrders} completed
              </div>
            </Link>

            <Link
              to="/leader/pricing"
              className="bg-white rounded-2xl border border-[#075B62]/12 p-4 sm:p-5 hover:border-[#075B62] transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-medium text-[#252525]/70">
                <span>Awaiting Approval</span>
                <Clock className="w-4 h-4 text-[#B45309]" />
              </div>
              <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-[#B45309]">
                {data.metrics.ordersAwaitingApproval}
              </div>
              <div className="mt-1 text-xs text-[#252525]/65">
                Pricing or allocation sign-off
              </div>
            </Link>

            <Link
              to="/leader/quality"
              className="bg-white rounded-2xl border border-[#075B62]/12 p-4 sm:p-5 hover:border-[#075B62] transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-medium text-[#252525]/70">
                <span>Pending Quality Check</span>
                <AlertTriangle className="w-4 h-4 text-[#8274A8]" />
              </div>
              <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-[#124D52]">
                {data.metrics.pendingQualityInspections}
              </div>
              <div className="mt-1 text-xs text-[#252525]/65">
                Pieces awaiting inspection
              </div>
            </Link>

            <Link
              to="/leader/payouts"
              className="bg-white rounded-2xl border border-[#075B62]/12 p-4 sm:p-5 hover:border-[#075B62] transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-medium text-[#252525]/70">
                <span>Total Group Earnings</span>
                <Wallet className="w-4 h-4 text-[#14532D]" />
              </div>
              <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-[#14532D]">
                ₹{data.metrics.totalGroupEarnings.toLocaleString('en-IN')}
              </div>
              <div className="mt-1 text-xs text-[#252525]/65">
                ₹{data.metrics.approvedGroupPayouts.toLocaleString('en-IN')} group-approved
              </div>
            </Link>
          </section>

          {/* 6-Step Workflow Quick Navigation */}
          <section className="bg-white rounded-2xl border border-[#075B62]/12 p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-display text-base font-bold text-[#124D52]">
                Six-Step Order Workflow
              </h2>
              <span className="text-xs text-[#252525]/65">
                Human approval at every stage
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { step: '01', label: 'Voice Intake', to: '/leader/orders/new' },
                { step: '02', label: 'Pricing', to: '/leader/pricing' },
                { step: '03', label: 'Allocation', to: '/leader/allocation' },
                { step: '04', label: 'Progress & QC', to: '/leader/quality' },
                { step: '05', label: 'Consolidation', to: '/leader/consolidation' },
                { step: '06', label: 'Payouts', to: '/leader/payouts' },
              ].map((s) => (
                <Link
                  key={s.step}
                  to={s.to}
                  className="p-3.5 rounded-xl bg-[#FFF8EF] border border-[#075B62]/12 hover:border-[#075B62] hover:bg-[#E9E3F5]/35 transition-colors flex flex-col justify-between min-h-[76px]"
                >
                  <span className="font-mono-num text-xs font-semibold text-[#8274A8]">
                    Step {s.step}
                  </span>
                  <span className="font-display text-sm font-bold text-[#124D52] flex items-center justify-between gap-1 mt-1">
                    <span>{s.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Two-Column Deadlines & Member Activity */}
          <section className="grid lg:grid-cols-12 gap-6">
            {/* Upcoming Delivery Deadlines */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#124D52]">
                  Upcoming Delivery Deadlines
                </h2>
                <Link
                  to="/leader/consolidation"
                  className="text-xs font-semibold text-[#075B62] hover:underline"
                >
                  View Consolidation
                </Link>
              </div>

              <div className="divide-y divide-[#075B62]/10">
                {data.upcomingDeadlines.map((ord) => (
                  <div key={ord.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[#252525]/65 font-mono-num">
                        <span>{ord.id}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ord.quantity} units</span>
                      </div>
                      <div className="font-display text-sm font-bold text-[#252525] truncate mt-0.5">
                        {ord.product_name}
                      </div>
                      <div className="mt-1">
                        <OrderStatusText status={ord.status} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono-num text-sm font-bold ${
                          ord.remaining_days <= 7 ? 'text-[#B45309]' : 'text-[#075B62]'
                        }`}
                      >
                        {ord.remaining_days} days left
                      </div>
                      <div className="text-xs text-[#252525]/60 font-mono-num">
                        Due {ord.due_date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Member Activity */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#124D52] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#075B62]" />
                  <span>Member Production Activity</span>
                </h2>
                <Link
                  to="/leader/members"
                  className="text-xs font-semibold text-[#075B62] hover:underline"
                >
                  Manage Members
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#075B62]/12 text-left text-xs text-[#252525]/65">
                      <th className="pb-2.5 font-medium">Member</th>
                      <th className="pb-2.5 font-medium text-right">Assigned</th>
                      <th className="pb-2.5 font-medium text-right">Completed</th>
                      <th className="pb-2.5 font-medium text-right">Accepted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#075B62]/8">
                    {data.memberActivity.map((m) => (
                      <tr key={m.id}>
                        <td className="py-3 pr-2">
                          <div className="font-medium text-[#252525]">{m.name}</div>
                          <div className="text-xs text-[#252525]/60">
                            {m.daily_capacity}/day · {m.availability}
                          </div>
                        </td>
                        <td className="py-3 text-right font-mono-num">{m.active_assigned}</td>
                        <td className="py-3 text-right font-mono-num font-semibold text-[#075B62]">
                          {m.active_completed}
                        </td>
                        <td className="py-3 text-right font-mono-num text-[#14532D]">
                          <span className="inline-flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {m.active_accepted}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
