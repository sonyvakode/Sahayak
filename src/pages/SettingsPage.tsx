import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, Shield, Cpu, CheckCircle2 } from 'lucide-react';
import { WorkflowScreenLayout } from '../components/WorkflowScreenLayout';
import { SyncStateIndicator } from '../components/StatusText';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { LANGUAGE_OPTIONS } from '../i18n/translations';
import { apiFetch } from '../lib/api';
import type { LedgerEntry, SupportedLanguage } from '../types';

interface SystemStatus {
  orchestrationMode: string;
  lyzrReady: boolean;
  geminiConfigured: boolean;
  speech: {
    stt: { activeProvider: string; bhashiniConfigured: boolean; whisperConfigured: boolean };
    tts: { activeProvider: string; bhashiniConfigured: boolean };
  };
  agents: Array<{
    id: string;
    name: string;
    responsibility: string;
    humanAuthorityBoundary: string;
  }>;
}

export function SettingsPage() {
  const { user, language, setLanguage } = useAuth();
  const {
    isOffline,
    simulatedOffline,
    setSimulatedOffline,
    queuedItems,
    syncNow,
    syncing,
    lastSyncMessage,
    clearSyncedHistory,
  } = useOffline();

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [consentGiven, setConsentGiven] = useState(true);
  const [consentSaved, setConsentSaved] = useState(false);

  useEffect(() => {
    apiFetch<SystemStatus>('/api/system/status').then(setStatus).catch(() => {});
    apiFetch<{ entries: LedgerEntry[] }>('/api/ledger').then((r) => setLedger(r.entries)).catch(() => {});
  }, []);

  const handleConsentToggle = async (next: boolean) => {
    setConsentGiven(next);
    setConsentSaved(false);
    await apiFetch('/api/settings/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ consentGiven: next }),
    });
    setConsentSaved(true);
  };

  return (
    <WorkflowScreenLayout
      pageTitle="Profile and Settings"
      pageSubtitle="Language preferences, offline sync queue, and system audit ledger"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Language & Connectivity */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-4">
            <h2 className="font-display text-base font-bold text-[#124D52]">
              Language Preference
            </h2>
            <p className="text-xs text-[#252525]/70">
              Used for navigation, voice intake, work instructions, and audio earnings summaries.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setLanguage(opt.code as SupportedLanguage)}
                  className={`min-h-[46px] px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    language === opt.code
                      ? 'bg-[#075B62] text-white border-[#075B62]'
                      : 'bg-[#FFF8EF] text-[#124D52] border-[#075B62]/20'
                  }`}
                >
                  {opt.nativeLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#124D52]">
                Low-Connectivity & Offline Queue
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  isOffline ? 'text-[#B45309]' : 'text-[#14532D]'
                }`}
              >
                {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                {isOffline ? 'Offline' : 'Connected'}
              </span>
            </div>

            <p className="text-xs text-[#252525]/70">
              Simulate rural low-network conditions to test local queuing of member production updates and automatic sync upon reconnection.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSimulatedOffline(!simulatedOffline)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  simulatedOffline
                    ? 'bg-[#F2A15A]/25 border-[#F2A15A] text-[#7C2D12]'
                    : 'bg-[#FFF8EF] border-[#075B62]/20 text-[#124D52]'
                }`}
              >
                {simulatedOffline ? 'Restore Connectivity (Go Online)' : 'Simulate Offline Mode'}
              </button>

              <button
                type="button"
                onClick={() => syncNow()}
                disabled={isOffline || syncing}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#075B62] text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>Sync Queued Updates</span>
              </button>
            </div>

            {lastSyncMessage && (
              <div className="text-xs font-medium text-[#075B62]">{lastSyncMessage}</div>
            )}
          </div>
        </section>

        {/* Queued Offline Items */}
        {queuedItems.length > 0 && (
          <section className="bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#124D52]">
                Local Sync Queue ({queuedItems.length})
              </h3>
              <button
                type="button"
                onClick={clearSyncedHistory}
                className="text-xs font-semibold text-[#075B62] hover:underline"
              >
                Clear Synced
              </button>
            </div>
            <div className="divide-y divide-[#075B62]/10 text-sm">
              {queuedItems.map((q) => (
                <div key={q.clientOfflineId} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold">{q.productName}</span> · +{q.quantityReported}{' '}
                    pcs ({q.orderId})
                  </div>
                  <SyncStateIndicator syncStatus={q.syncStatus} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Member Consent & Privacy */}
        {user?.role === 'member' && (
          <section className="bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#124D52]">
              <Shield className="w-4 h-4" />
              <h3 className="font-display text-base font-bold">Data Privacy & Consent</h3>
            </div>
            <p className="text-xs text-[#252525]/75">
              Your work capacity and quality records are used only with your consent to recommend fair group allocations. Your personal earnings audio and payout amounts remain private to you and group payout approval.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleConsentToggle(!consentGiven)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[#075B62]/25 text-xs font-semibold text-[#124D52]"
              >
                {consentGiven ? 'Consent Active (Click to Withdraw)' : 'Grant Consent'}
              </button>
              {consentSaved && (
                <span className="inline-flex items-center gap-1 text-xs text-[#14532D] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved to ledger
                </span>
              )}
            </div>
          </section>
        )}

        {/* Modular Multi-Agent & Speech Architecture Status */}
        {status && (
          <section className="bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#075B62]/10">
              <h3 className="font-display text-base font-bold text-[#124D52] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#075B62]" />
                <span>Multi-Agent & Speech Adapter Status</span>
              </h3>
              <span className="text-xs text-[#8274A8] font-medium">
                Orchestrator: {status.orchestrationMode}
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#FFF8EF] border border-[#075B62]/10">
                <div className="font-semibold text-[#124D52]">Gemini Reasoning</div>
                <div className="mt-1 text-[#252525]/75">
                  {status.geminiConfigured ? 'Connected (Server-side)' : 'Demo Fallback Active'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF8EF] border border-[#075B62]/10">
                <div className="font-semibold text-[#124D52]">Speech-to-Text (STT)</div>
                <div className="mt-1 text-[#252525]/75">
                  Active: {status.speech.stt.activeProvider} · Bhashini Hook:{' '}
                  {status.speech.stt.bhashiniConfigured ? 'Configured' : 'Adapter Ready'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF8EF] border border-[#075B62]/10">
                <div className="font-semibold text-[#124D52]">Text-to-Speech (TTS)</div>
                <div className="mt-1 text-[#252525]/75">
                  Active: {status.speech.tts.activeProvider}
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#075B62]/10 text-xs">
              {status.agents.map((ag) => (
                <div key={ag.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-bold text-[#124D52]">{ag.name}: </span>
                    <span className="text-[#252525]/80">{ag.responsibility}</span>
                  </div>
                  <span className="text-[#8274A8] shrink-0">{ag.humanAuthorityBoundary}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Append-only Activity Ledger */}
        <section className="bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-[#124D52]">
            Append-Only Audit Ledger
          </h3>
          <div className="divide-y divide-[#075B62]/10 text-xs">
            {ledger.slice(0, 15).map((entry) => (
              <div key={entry.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-[#124D52]">{entry.actor_name}</span>
                  <span className="text-[#252525]/75"> · {entry.summary}</span>
                </div>
                <span className="font-mono-num text-[#252525]/55">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </WorkflowScreenLayout>
  );
}
