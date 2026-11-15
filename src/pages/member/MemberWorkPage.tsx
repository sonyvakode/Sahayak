import { useEffect, useState } from 'react';
import { Volume2, Square, CheckCircle2, Clock } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { SupportedLanguage } from '../../types';

interface WorkItem {
  allocation_id: string;
  order_id: string;
  product_name: string;
  buyer_name: string;
  due_date: string;
  remaining_days: number;
  allocated_qty: number;
  completed_qty: number;
  accepted_qty: number;
  rework_qty: number;
  worker_rate_per_piece: number | null;
  ai_reason: string;
  task_title: string | null;
  instructions_en: string | null;
  instructions_te: string | null;
  instructions_hi: string | null;
  instructions_kn: string | null;
}

const SPEECH_LOCALES: Record<SupportedLanguage, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
};

export function MemberWorkPage() {
  const { language } = useAuth();
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ workItems: WorkItem[] }>('/api/member/dashboard')
      .then((res) => setWorkItems(res.workItems))
      .finally(() => setLoading(false));

    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const getInstructionText = (item: WorkItem) => {
    if (language === 'te' && item.instructions_te) return item.instructions_te;
    if (language === 'hi' && item.instructions_hi) return item.instructions_hi;
    if (language === 'kn' && item.instructions_kn) return item.instructions_kn;
    return (
      item.instructions_en ||
      `Produce ${item.allocated_qty} units of ${item.product_name} by ${item.due_date}.`
    );
  };

  const toggleSpeak = (item: WorkItem) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingId === item.allocation_id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const text = getInstructionText(item);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LOCALES[language];
    utterance.rate = 0.92;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(item.allocation_id);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <AppShell title="My Assigned Work">
      <div className="max-w-4xl mx-auto space-y-5">
        {loading ? (
          <div className="h-44 rounded-2xl bg-white animate-pulse" />
        ) : workItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#075B62]/12 p-8 text-center text-sm text-[#252525]/70">
            No work batches assigned to you yet.
          </div>
        ) : (
          workItems.map((item) => {
            const pct =
              item.allocated_qty > 0
                ? Math.min(100, Math.round((item.completed_qty / item.allocated_qty) * 100))
                : 0;
            const instructionText = getInstructionText(item);
            const isSpeaking = speakingId === item.allocation_id;

            return (
              <article
                key={item.allocation_id}
                className="bg-white rounded-2xl border border-[#075B62]/15 p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono-num text-[#252525]/65">
                      {item.order_id} · Due {item.due_date} ({item.remaining_days} days left)
                    </div>
                    <h2 className="font-display text-lg font-bold text-[#124D52] mt-1">
                      {item.task_title || `${item.allocated_qty} ${item.product_name}`}
                    </h2>
                  </div>

                  <div className="text-right font-mono-num">
                    <div className="text-sm font-bold text-[#075B62]">
                      ₹{item.worker_rate_per_piece ?? 25} / piece
                    </div>
                    <div className="text-xs text-[#252525]/65">
                      Assigned: {item.allocated_qty} pcs
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono-num">
                    <span>
                      Completed: <strong>{item.completed_qty}</strong> / {item.allocated_qty} ({pct}%)
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="text-[#14532D] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {item.accepted_qty} Accepted
                      </span>
                      <span className="text-[#B45309] inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.rework_qty} Rework
                      </span>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-[#E9E3F5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#075B62] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Audio Instructions */}
                <div className="p-4 rounded-xl bg-[#FFF8EF] border border-[#075B62]/12 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#124D52]">
                      Work Instructions ({language.toUpperCase()})
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSpeak(item)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                        isSpeaking
                          ? 'bg-[#D9534F] text-white'
                          : 'bg-[#075B62] text-white hover:bg-[#124D52]'
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <Square className="w-4 h-4" />
                          <span>Stop Audio</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Listen to Instructions</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-[#252525]/85 leading-relaxed">{instructionText}</p>
                </div>

                <div className="text-xs text-[#8274A8]">
                  <strong>Fairness Note:</strong> {item.ai_reason}
                </div>
              </article>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
