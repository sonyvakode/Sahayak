import { useEffect, useState } from 'react';
import { Mic, Plus, CheckCircle2, WifiOff } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { SyncStateIndicator } from '../../components/StatusText';
import { useOffline } from '../../context/OfflineContext';
import { apiFetch } from '../../lib/api';

interface WorkItem {
  allocation_id: string;
  order_id: string;
  product_name: string;
  allocated_qty: number;
  completed_qty: number;
}

interface UpdateHistoryItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity_reported: number;
  update_mode: string;
  notes: string;
  sync_status: 'synced' | 'saved_locally' | 'pending_sync';
  created_at: string;
}

export function MemberProgressPage() {
  const { isOffline, queuedItems, submitOrQueueProgress } = useOffline();
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [history, setHistory] = useState<UpdateHistoryItem[]>([]);
  const [selectedAllocId, setSelectedAllocId] = useState('');
  const [qtyToAdd, setQtyToAdd] = useState(5);
  const [voiceNote, setVoiceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadMemberData = () => {
    apiFetch<{ workItems: WorkItem[]; updates: UpdateHistoryItem[] }>('/api/member/dashboard')
      .then((res) => {
        setWorkItems(res.workItems);
        setHistory(res.updates);
        if (res.workItems.length > 0 && !selectedAllocId) {
          setSelectedAllocId(res.workItems[0].allocation_id);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadMemberData();
  }, []);

  const currentWork = workItems.find((w) => w.allocation_id === selectedAllocId);

  const handleSubmit = async (mode: 'tap' | 'voice') => {
    if (!currentWork || qtyToAdd <= 0) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await submitOrQueueProgress({
        orderId: currentWork.order_id,
        allocationId: currentWork.allocation_id,
        productName: currentWork.product_name,
        quantityReported: qtyToAdd,
        updateMode: mode,
        notes: voiceNote || (mode === 'voice' ? 'Submitted via member voice log' : 'Tap quick update'),
      });

      if (res.status === 'synced') {
        setFeedback(`Synchronized +${qtyToAdd} pieces for ${currentWork.order_id}.`);
        loadMemberData();
      } else {
        setFeedback(
          `Saved locally (+${qtyToAdd} pieces). Will automatically synchronize when connectivity returns.`
        );
      }
      setVoiceNote('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoVoiceLog = () => {
    setQtyToAdd(5);
    setVoiceNote('Voice note: Completed 5 cotton bags with double handle stitch.');
  };

  return (
    <AppShell title="Report Production">
      <div className="max-w-4xl mx-auto space-y-6">
        {isOffline && (
          <div className="p-4 rounded-2xl bg-[#F2A15A]/20 border border-[#F2A15A]/50 flex items-center gap-3 text-sm text-[#7C2D12]">
            <WifiOff className="w-5 h-5 shrink-0" />
            <span>
              <strong>Offline Mode Active:</strong> Your updates are saved safely on this device and queued for sync.
            </span>
          </div>
        )}

        <section className="bg-white rounded-2xl border border-[#075B62]/15 p-5 sm:p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#252525]/75 mb-1.5">
              Select Active Work Batch
            </label>
            <select
              value={selectedAllocId}
              onChange={(e) => setSelectedAllocId(e.target.value)}
              className="w-full min-h-[48px] px-4 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF] text-sm font-bold text-[#124D52]"
            >
              {workItems.map((w) => (
                <option key={w.allocation_id} value={w.allocation_id}>
                  {w.order_id} · {w.product_name} ({w.completed_qty}/{w.allocated_qty} done)
                </option>
              ))}
            </select>
          </div>

          {/* Large Low-Literacy Tap Quantity Controls */}
          <div className="bg-[#FFF8EF] rounded-2xl border border-[#075B62]/12 p-5 space-y-4">
            <div className="text-sm font-semibold text-[#124D52] text-center">
              How many pieces did you finish?
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setQtyToAdd((q) => Math.max(1, q - 1))}
                className="w-14 h-14 rounded-2xl bg-white border border-[#075B62]/25 text-2xl font-bold text-[#124D52] active:scale-95"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <div className="w-28 h-14 rounded-2xl bg-white border-2 border-[#075B62] flex items-center justify-center font-mono-num text-3xl font-bold text-[#075B62]">
                {qtyToAdd}
              </div>
              <button
                type="button"
                onClick={() => setQtyToAdd((q) => q + 1)}
                className="w-14 h-14 rounded-2xl bg-white border border-[#075B62]/25 text-2xl font-bold text-[#124D52] active:scale-95"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <div className="flex justify-center gap-2.5">
              {[1, 5, 10, 25].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQtyToAdd(preset)}
                  className={`min-h-[42px] px-4 py-1.5 rounded-xl text-sm font-mono-num font-semibold border ${
                    qtyToAdd === preset
                      ? 'bg-[#075B62] text-white border-[#075B62]'
                      : 'bg-white text-[#124D52] border-[#075B62]/20'
                  }`}
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Note Option */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-[#252525]/75">
                Optional Note / Voice Demo Log
              </label>
              <button
                type="button"
                onClick={handleDemoVoiceLog}
                className="px-3 py-1.5 rounded-xl bg-[#E9E3F5] text-[#124D52] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Demo Voice Update (+5 Bags)</span>
              </button>
            </div>
            <input
              type="text"
              value={voiceNote}
              onChange={(e) => setVoiceNote(e.target.value)}
              placeholder="Optional batch note..."
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm"
            />
          </div>

          {feedback && (
            <div className="p-3.5 rounded-xl bg-[#DCEFE3] text-sm font-medium text-[#14532D] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSubmit('tap')}
              disabled={submitting || !currentWork}
              className="min-h-[52px] px-5 py-3 rounded-xl bg-[#075B62] text-white text-sm font-bold hover:bg-[#124D52] inline-flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Submit +{qtyToAdd} Completed</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('voice')}
              disabled={submitting || !currentWork}
              className="min-h-[52px] px-5 py-3 rounded-xl bg-[#E9E3F5] text-[#124D52] text-sm font-bold hover:bg-[#8274A8] hover:text-white inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Mic className="w-5 h-5" />
              <span>Submit as Voice Update</span>
            </button>
          </div>
        </section>

        {/* Local Queue & Synced History */}
        <section className="bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-[#124D52]">
            My Update Sync Status
          </h3>

          {queuedItems.filter((q) => q.syncStatus !== 'synced').length > 0 && (
            <div className="space-y-2 pb-3 border-b border-[#075B62]/10">
              {queuedItems
                .filter((q) => q.syncStatus !== 'synced')
                .map((q) => (
                  <div
                    key={q.clientOfflineId}
                    className="p-3 rounded-xl bg-[#FFF8EF] flex items-center justify-between gap-2 text-sm"
                  >
                    <div>
                      <span className="font-semibold">+{q.quantityReported} pcs</span> · {q.orderId}
                    </div>
                    <SyncStateIndicator syncStatus={q.syncStatus} />
                  </div>
                ))}
            </div>
          )}

          <div className="divide-y divide-[#075B62]/10 text-sm">
            {history.map((u) => (
              <div key={u.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-[#124D52]">+{u.quantity_reported} pieces</span>
                  <span className="text-[#252525]/70"> · {u.order_id}</span>
                  {u.notes && <div className="text-xs text-[#252525]/60">{u.notes}</div>}
                </div>
                <SyncStateIndicator syncStatus={u.sync_status} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
