import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Volume2,
  ChevronLeft,
  X,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { WorkflowScreenLayout } from '../../components/WorkflowScreenLayout';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { getMemberAvatar } from '../../lib/memberAvatars';
import type { SupportedLanguage } from '../../types';

interface AudioPreviewResponse {
  payout: {
    member_name: string;
    order_id: string;
    product_name: string;
    completed_pieces?: number;
    accepted_pieces: number;
    rate_per_piece: number;
    gross_earnings: number;
    approval_status: string;
  };
  scriptText: string;
  language: SupportedLanguage;
}

interface AudioSynthesisResponse {
  payout: AudioPreviewResponse['payout'];
  audio: {
    audioBase64: string | null;
    mimeType: string | null;
    scriptText: string;
    language: SupportedLanguage;
    provider: string;
    isDemoMode: boolean;
    notice?: string;
  };
}

const SPEECH_LOCALES: Record<SupportedLanguage, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
};

export function MemberAudioSummaryPage({
  shell = 'workflow',
}: {
  shell?: 'workflow' | 'portal';
}) {
  const { user, language, setLanguage } = useAuth();
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(language || 'en');
  const [preview, setPreview] = useState<AudioPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [synthesizing, setSynthesizing] = useState(false);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState('');

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  const clearProgressTimer = () => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  useEffect(() => {
    setLoading(true);
    apiFetch<AudioPreviewResponse>(
      `/api/member/audio-preview?orderId=ORD-2026-0012&language=${selectedLang}`
    )
      .then((res) => {
        setPreview(res);
        setScriptText(res.scriptText);
      })
      .finally(() => setLoading(false));

    return () => {
      stopPlayback();
    };
  }, [selectedLang]);

  const stopPlayback = () => {
    clearProgressTimer();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
    setPaused(false);
    setProgressPct(0);
  };

  const startSimulatedProgressTimer = () => {
    clearProgressTimer();
    progressTimerRef.current = window.setInterval(() => {
      setProgressPct((prev) => (prev >= 96 ? 96 : prev + 4));
    }, 350);
  };

  const speakBrowserFallback = (text: string, lang: SupportedLanguage) => {
    if (!('speechSynthesis' in window)) {
      setPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = SPEECH_LOCALES[lang];
    utter.rate = 0.92;
    utter.onend = () => {
      clearProgressTimer();
      setPlaying(false);
      setPaused(false);
      setProgressPct(100);
    };
    utter.onerror = () => {
      clearProgressTimer();
      setPlaying(false);
      setPaused(false);
    };
    setProgressPct(8);
    setPlaying(true);
    setPaused(false);
    startSimulatedProgressTimer();
    window.speechSynthesis.speak(utter);
  };

  const handlePlayOrResume = async () => {
    if (paused) {
      if (audioElRef.current && audioElRef.current.paused && audioElRef.current.currentTime > 0) {
        await audioElRef.current.play();
        setPlaying(true);
        setPaused(false);
        return;
      }
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setPlaying(true);
        setPaused(false);
        startSimulatedProgressTimer();
        return;
      }
    }

    stopPlayback();
    setSynthesizing(true);
    setProviderNotice(null);

    try {
      const res = await apiFetch<AudioSynthesisResponse>('/api/member/audio-summary', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'ORD-2026-0012',
          language: selectedLang,
        }),
      });
      setScriptText(res.audio.scriptText);

      if (res.audio.audioBase64 && res.audio.mimeType) {
        const audio = new Audio(`data:${res.audio.mimeType};base64,${res.audio.audioBase64}`);
        audioElRef.current = audio;
        audio.ontimeupdate = () => {
          if (audio.duration > 0) {
            setProgressPct(Math.round((audio.currentTime / audio.duration) * 100));
          }
        };
        audio.onended = () => {
          setPlaying(false);
          setPaused(false);
          setProgressPct(100);
        };
        audio.onerror = () => speakBrowserFallback(res.audio.scriptText, selectedLang);
        setPlaying(true);
        setPaused(false);
        setProviderNotice(`Playing regional audio via ${res.audio.provider}`);
        await audio.play();
      } else {
        setProviderNotice(
          res.audio.notice ||
            'Demo Mode: Reading your private earnings aloud with readable text below.'
        );
        speakBrowserFallback(res.audio.scriptText, selectedLang);
      }
    } catch {
      if (scriptText) {
        setProviderNotice('Demo Mode: Playing readable script via browser speech synthesis.');
        speakBrowserFallback(scriptText, selectedLang);
      }
    } finally {
      setSynthesizing(false);
    }
  };

  const handlePause = () => {
    clearProgressTimer();
    if (audioElRef.current && !audioElRef.current.paused) {
      audioElRef.current.pause();
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
    setPlaying(false);
    setPaused(true);
  };

  const handleReplay = () => {
    stopPlayback();
    void handlePlayOrResume();
  };

  const payout = preview?.payout;

  const screenBody =
    loading || !payout ? (
      <div className="h-96 rounded-3xl bg-[#FFFCF7] animate-pulse" />
    ) : (
      <div className="bg-[#FFFCF7] rounded-3xl border border-[#075B62]/15 shadow-sm p-5 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
        {/* Member Profile Card */}
        <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <ImageWithFallback
              src={getMemberAvatar(payout.member_name)}
              alt={payout.member_name}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#075B62]/25 shrink-0"
            />
            <div>
              <h2 className="font-display text-xl font-bold text-[#124D52]">
                {payout.member_name}
              </h2>
              <div className="text-xs font-semibold text-[#8274A8]">
                SHG Member · {payout.order_id} ({payout.product_name})
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-[#075B62]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Private Audio</span>
          </div>
        </div>

        {/* Earnings Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          <div className="p-2.5 sm:p-4 rounded-2xl bg-[#E9E3F5]/55">
            <div className="text-[10px] sm:text-[11px] text-[#777777]">Accepted</div>
            <div className="font-mono-num text-lg sm:text-2xl font-bold text-[#124D52] mt-0.5">
              {payout.accepted_pieces}
            </div>
          </div>
          <div className="p-2.5 sm:p-4 rounded-2xl bg-[#E9E3F5]/55">
            <div className="text-[10px] sm:text-[11px] text-[#777777]">Rate / Pc</div>
            <div className="font-mono-num text-lg sm:text-2xl font-bold text-[#124D52] mt-0.5">
              ₹{payout.rate_per_piece}
            </div>
          </div>
          <div className="p-2.5 sm:p-4 rounded-2xl bg-[#DCEFE3]">
            <div className="text-[10px] sm:text-[11px] text-[#14532D] font-semibold">Earnings</div>
            <div className="font-mono-num text-lg sm:text-2xl font-bold text-[#14532D] mt-0.5">
              ₹{payout.gross_earnings.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Large Circular Play Button + Pause + Replay + Audio Progress Indicator */}
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative flex items-center justify-center">
            {playing && (
              <span className="absolute w-36 h-36 rounded-full bg-[#075B62]/15 animate-ping" />
            )}
            <button
              type="button"
              onClick={playing ? handlePause : handlePlayOrResume}
              disabled={synthesizing}
              aria-label={playing ? 'Pause audio' : 'Play audio summary'}
              className="relative z-10 w-28 h-28 rounded-full bg-[#075B62] text-white hover:bg-[#124D52] flex items-center justify-center shadow-lg transition-transform active:scale-95"
            >
              {playing ? <Pause className="w-10 h-10" /> : <Play className="w-11 h-11 ml-1" />}
            </button>
          </div>

          {/* Audio Progress Indicator */}
          <div className="w-full max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono-num text-[#777777]">
              <span>
                {playing
                  ? 'Playing audio summary...'
                  : paused
                    ? 'Paused'
                    : progressPct === 100
                      ? 'Playback complete'
                      : 'Ready to play'}
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2.5 w-full bg-[#E9E3F5] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#075B62] rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handlePause}
              disabled={!playing}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#075B62]/25 bg-white text-[#124D52] text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-45"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>

            <button
              type="button"
              onClick={handleReplay}
              disabled={synthesizing}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#E9E3F5] text-[#124D52] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#8274A8] hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{synthesizing ? 'Preparing Audio...' : 'Replay'}</span>
            </button>
          </div>
        </div>

        {/* Regional Language Selection Buttons */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#777777] text-center">
            Select Preferred Language
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { code: 'te' as const, label: 'తెలుగు (Telugu)' },
              { code: 'hi' as const, label: 'हिन्दी (Hindi)' },
              { code: 'kn' as const, label: 'ಕನ್ನಡ (Kannada)' },
              { code: 'en' as const, label: 'English' },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  stopPlayback();
                  setSelectedLang(lang.code);
                  setLanguage(lang.code);
                }}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${
                  selectedLang === lang.code
                    ? 'bg-[#075B62] text-white border-[#075B62]'
                    : 'bg-[#FFF8EF] text-[#124D52] border-[#075B62]/20'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {providerNotice && (
          <div className="p-3 rounded-xl bg-[#E9E3F5]/55 text-xs text-[#124D52] text-center">
            {providerNotice}
          </div>
        )}

        {/* Readable Text Alternative */}
        <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/15 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#075B62]">
            <Volume2 className="w-4 h-4" />
            <span>
              Earnings Summary ({user?.name} · {selectedLang.toUpperCase()})
            </span>
          </div>
          <p className="text-base font-medium text-[#252525] leading-relaxed">{scriptText}</p>
        </div>
      </div>
    );

  if (shell === 'workflow') {
    return (
      <WorkflowScreenLayout currentStep={5}>
        {screenBody}
      </WorkflowScreenLayout>
    );
  }

  return (
    <AppShell title="Member Audio Playback">
      <div className="max-w-xl mx-auto">
        {loading || !payout ? (
          <div className="h-96 rounded-3xl bg-white animate-pulse" />
        ) : (
          <div className="space-y-4">
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
                <h2 className="font-display text-lg font-bold text-[#124D52]">
                  Member Audio Playback
                </h2>
                <p className="text-xs font-mono-num text-[#777777]">
                  {payout.order_id} · {payout.product_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/member/dashboard')}
                aria-label="Close to member home"
                className="w-11 h-11 rounded-xl bg-white text-[#124D52] flex items-center justify-center hover:bg-[#E9E3F5]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {screenBody}
          </div>
        )}
      </div>
    </AppShell>
  );
}
