import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, Upload, CheckCircle2, RotateCcw } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { apiFetch } from '../../lib/api';
import type { OrderRecord } from '../../types';

interface MemberSnapshot {
  allocation_id: string;
  member_id: string;
  member_name: string;
  allocated_qty: number;
  completed_qty: number;
  accepted_qty: number;
  rework_qty: number;
}

interface InspectionRecord {
  id: string;
  member_name: string;
  inspected_qty: number;
  accepted_qty: number;
  rework_qty: number;
  notes: string;
  sample_photo_url: string | null;
  decided_at: string;
}

export function QualityInspectionPage() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState(
    searchParams.get('orderId') || 'ORD-2026-0012'
  );
  const [snapshots, setSnapshots] = useState<MemberSnapshot[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [acceptedQty, setAcceptedQty] = useState('10');
  const [reworkQty, setReworkQty] = useState('0');
  const [notes, setNotes] = useState('');
  const [samplePhotoUrl, setSamplePhotoUrl] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (orderId: string) => {
    const res = await apiFetch<{
      memberSnapshots: MemberSnapshot[];
      inspections: InspectionRecord[];
    }>(`/api/orders/${orderId}/tracking`);
    setSnapshots(res.memberSnapshots);
    setInspections(res.inspections);
    if (res.memberSnapshots.length > 0 && !selectedMemberId) {
      setSelectedMemberId(res.memberSnapshots[0].member_id);
    }
  };

  useEffect(() => {
    apiFetch<{ orders: OrderRecord[] }>('/api/orders').then((res) => setOrders(res.orders));
  }, []);

  useEffect(() => {
    loadData(selectedOrderId);
  }, [selectedOrderId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSamplePhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRecordDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const memberSnap = snapshots.find((s) => s.member_id === selectedMemberId);
    if (!memberSnap) {
      setError('Select a member batch to inspect.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/quality/inspect', {
        method: 'POST',
        body: JSON.stringify({
          orderId: selectedOrderId,
          allocationId: memberSnap.allocation_id,
          memberId: memberSnap.member_id,
          acceptedQty: Number(acceptedQty) || 0,
          reworkQty: Number(reworkQty) || 0,
          notes,
          samplePhotoUrl: samplePhotoUrl || undefined,
        }),
      });
      setMessage(
        `Quality decision saved for ${memberSnap.member_name} (${acceptedQty} accepted, ${reworkQty} rework). Payout updated automatically.`
      );
      setNotes('');
      setSamplePhotoUrl('');
      await loadData(selectedOrderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record quality inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAccepted = snapshots.reduce((s, m) => s + m.accepted_qty, 0);
  const totalRework = snapshots.reduce((s, m) => s + m.rework_qty, 0);

  return (
    <AppShell title="Step 4: Quality Inspection">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="bg-white rounded-2xl border border-[#075B62]/12 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#124D52]">
              Leader Quality Inspection & Rework Control
            </h2>
            <p className="text-xs text-[#252525]/70">
              Leader retains final human judgment on handmade stitching quality. Accepted counts drive member payouts.
            </p>
          </div>
          <select
            value={selectedOrderId}
            onChange={(e) => {
              setSelectedOrderId(e.target.value);
              setSelectedMemberId('');
            }}
            aria-label="Select order for quality inspection"
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF] text-sm font-semibold text-[#124D52]"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} · {o.product_name}
              </option>
            ))}
          </select>
        </section>

        {/* Quality Totals */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#075B62]/12 p-4">
            <div className="text-xs text-[#252525]/65">Accepted Pieces</div>
            <div className="font-mono-num text-2xl font-bold text-[#14532D] mt-1">
              {totalAccepted}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#075B62]/12 p-4">
            <div className="text-xs text-[#252525]/65">Needs Rework</div>
            <div className="font-mono-num text-2xl font-bold text-[#B45309] mt-1">
              {totalRework}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#075B62]/12 p-4 col-span-2">
            <div className="text-xs text-[#252525]/65">Member Breakdown</div>
            <div className="text-xs text-[#124D52] font-mono-num mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {snapshots.map((m) => (
                <span key={m.member_id}>
                  {m.member_name}: {m.accepted_qty} OK / {m.rework_qty} RW
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Record New Inspection */}
          <form
            onSubmit={handleRecordDecision}
            className="lg:col-span-5 bg-white rounded-2xl border border-[#075B62]/15 p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-[#075B62]/10">
              <ShieldCheck className="w-5 h-5 text-[#075B62]" />
              <h3 className="font-display text-base font-bold text-[#124D52]">
                Record Inspection Decision
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#252525]/75 mb-1">
                Member Batch
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/50 text-sm font-semibold"
              >
                {snapshots.map((m) => (
                  <option key={m.member_id} value={m.member_id}>
                    {m.member_name} ({m.completed_qty} completed · {m.accepted_qty} accepted)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#14532D] mb-1">
                  Accepted Pieces
                </label>
                <input
                  type="number"
                  min={0}
                  value={acceptedQty}
                  onChange={(e) => setAcceptedQty(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#DCEFE3]/40 text-sm font-mono-num font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B45309] mb-1">
                  Needs Rework
                </label>
                <input
                  type="number"
                  min={0}
                  value={reworkQty}
                  onChange={(e) => setReworkQty(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#F2A15A]/40 bg-[#F2A15A]/15 text-sm font-mono-num font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#252525]/75 mb-1">
                Inspection Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Handle cross-stitch verified; 2 bags need seam trimming"
                className="w-full p-3 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#252525]/75 mb-1.5">
                Optional Sample Photo Upload
              </label>
              <label className="min-h-[44px] px-4 py-2 rounded-xl border border-dashed border-[#075B62]/35 bg-[#FFF8EF]/60 flex items-center justify-center gap-2 text-xs font-semibold text-[#075B62] cursor-pointer hover:bg-[#E9E3F5]/40">
                <Upload className="w-4 h-4" />
                <span>{samplePhotoUrl ? 'Photo Attached (Change)' : 'Attach Sample Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {samplePhotoUrl && (
                <img
                  src={samplePhotoUrl}
                  alt="Uploaded sample preview"
                  className="mt-2 h-28 w-full object-cover rounded-xl border border-[#075B62]/15"
                />
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[#D9534F]/10 text-xs text-[#991B1B]">{error}</div>
            )}
            {message && (
              <div className="p-3 rounded-xl bg-[#DCEFE3] text-xs font-medium text-[#14532D]">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#075B62] text-white text-sm font-semibold hover:bg-[#124D52] transition-colors"
            >
              {submitting ? 'Saving Decision...' : 'Save Leader Quality Decision'}
            </button>
          </form>

          {/* Inspection History */}
          <section className="lg:col-span-7 bg-white rounded-2xl border border-[#075B62]/12 p-5 sm:p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-[#124D52] pb-3 border-b border-[#075B62]/10">
              Recorded Quality Inspections
            </h3>
            <div className="space-y-3">
              {inspections.map((ins) => (
                <div
                  key={ins.id}
                  className="p-4 rounded-xl bg-[#FFF8EF] border border-[#075B62]/12 flex flex-col sm:flex-row gap-4"
                >
                  <div className="w-full sm:w-28 h-20 rounded-lg overflow-hidden shrink-0 border border-[#075B62]/10">
                    <ImageWithFallback
                      src={ins.sample_photo_url}
                      alt={`${ins.member_name} batch sample`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold text-[#124D52]">
                        {ins.member_name}
                      </span>
                      <span className="font-mono-num text-xs text-[#252525]/60">
                        {new Date(ins.decided_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 text-[#14532D]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="font-mono-num">{ins.accepted_qty} Accepted</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#B45309]">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="font-mono-num">{ins.rework_qty} Rework</span>
                      </span>
                    </div>
                    {ins.notes && <p className="text-xs text-[#252525]/75">{ins.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
