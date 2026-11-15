import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, ArrowRight } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { OrderStatusText } from '../../components/StatusText';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { apiFetch } from '../../lib/api';
import type { OrderRecord } from '../../types';

export function LeaderOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'approval' | 'completed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ orders: OrderRecord[] }>('/api/orders')
      .then((res) => setOrders(res.orders))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === 'active') return o.status !== 'completed';
    if (filter === 'approval')
      return ['intake_review', 'pricing_pending', 'allocation_pending', 'payout_pending'].includes(
        o.status
      );
    if (filter === 'completed') return o.status === 'completed';
    return true;
  });

  return (
    <AppShell title="Orders">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-white border border-[#075B62]/12 rounded-xl w-fit">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'active', label: 'Active' },
              { id: 'approval', label: 'Needs Approval' },
              { id: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as typeof filter)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors min-h-[38px] whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-[#075B62] text-white'
                    : 'text-[#252525]/70 hover:text-[#124D52]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link
            to="/leader/orders/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#075B62] text-white text-sm font-semibold hover:bg-[#124D52] transition-colors min-h-[44px] whitespace-nowrap"
          >
            <Mic className="w-4 h-4" />
            <span>New Voice Order</span>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-white border border-[#075B62]/10 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#075B62]/12 p-10 text-center space-y-3">
            <p className="text-base font-semibold text-[#124D52]">No orders match this filter.</p>
            <Link
              to="/leader/orders/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#075B62] text-white text-sm font-semibold"
            >
              <Mic className="w-4 h-4" />
              <span>Record New Voice Order</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const completed = order.completed_qty ?? 0;
              const pct = order.quantity > 0 ? Math.min(100, Math.round((completed / order.quantity) * 100)) : 0;
              return (
                <article
                  key={order.id}
                  className="bg-white rounded-2xl border border-[#075B62]/12 p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-stretch"
                >
                  <div className="w-full md:w-44 h-32 rounded-xl overflow-hidden shrink-0 border border-[#075B62]/10">
                    <ImageWithFallback
                      src={order.sample_image_url}
                      alt={order.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-[#252525]/65 font-mono-num">
                          <span>{order.id}</span>
                          <span aria-hidden="true">·</span>
                          <span>{order.buyer_name}</span>
                          <span aria-hidden="true">·</span>
                          <span>Due {order.due_date}</span>
                        </div>
                        <h2 className="font-display text-lg font-bold text-[#124D52] mt-1">
                          {order.product_name} — <span className="font-mono-num">{order.quantity}</span> units
                        </h2>
                        <div className="mt-1">
                          <OrderStatusText status={order.status} />
                        </div>
                      </div>

                      <div className="text-right">
                        {order.suggested_selling_price ? (
                          <div>
                            <div className="font-mono-num text-lg font-bold text-[#124D52]">
                              ₹{Number(order.suggested_selling_price).toLocaleString('en-IN')}
                            </div>
                            <div className="text-xs text-[#252525]/65 font-mono-num">
                              ₹{Number(order.price_per_unit).toFixed(2)}/unit · ₹{Number(order.worker_rate_per_piece).toFixed(0)}/pc pay
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-[#B45309]">Pricing not yet set</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-[#252525]/75">
                        <span>
                          Production: <strong className="font-mono-num">{completed}</strong> /{' '}
                          <strong className="font-mono-num">{order.quantity}</strong> ({pct}%)
                        </span>
                        <span>
                          Accepted: <strong className="font-mono-num">{order.accepted_qty ?? 0}</strong> · Rework:{' '}
                          <strong className="font-mono-num">{order.rework_qty ?? 0}</strong>
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-[#E9E3F5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#075B62] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Link
                        to={`/leader/pricing?orderId=${order.id}`}
                        className="px-3 py-1.5 rounded-xl border border-[#075B62]/20 text-xs font-semibold text-[#124D52] hover:bg-[#E9E3F5]/40 min-h-[36px] inline-flex items-center"
                      >
                        Pricing
                      </Link>
                      <Link
                        to={`/leader/allocation?orderId=${order.id}`}
                        className="px-3 py-1.5 rounded-xl border border-[#075B62]/20 text-xs font-semibold text-[#124D52] hover:bg-[#E9E3F5]/40 min-h-[36px] inline-flex items-center"
                      >
                        Work Allocation
                      </Link>
                      <Link
                        to={`/leader/quality?orderId=${order.id}`}
                        className="px-3 py-1.5 rounded-xl border border-[#075B62]/20 text-xs font-semibold text-[#124D52] hover:bg-[#E9E3F5]/40 min-h-[36px] inline-flex items-center"
                      >
                        Quality Check
                      </Link>
                      <Link
                        to={`/leader/consolidation?orderId=${order.id}`}
                        className="px-3 py-1.5 rounded-xl border border-[#075B62]/20 text-xs font-semibold text-[#124D52] hover:bg-[#E9E3F5]/40 min-h-[36px] inline-flex items-center"
                      >
                        Consolidation
                      </Link>
                      <Link
                        to={`/leader/payouts?orderId=${order.id}`}
                        className="px-3 py-1.5 rounded-xl bg-[#075B62] text-white text-xs font-semibold hover:bg-[#124D52] min-h-[36px] inline-flex items-center gap-1 ml-auto"
                      >
                        <span>Payouts</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
