import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  Square,
  Sparkles,
  CheckCircle2,
  Edit3,
  ChevronLeft,
  X,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { WorkflowScreenLayout } from '../../components/WorkflowScreenLayout';
import { apiFetch } from '../../lib/api';
import type { SupportedLanguage } from '../../types';

const DEMO_SAMPLES: Array<{
  lang: SupportedLanguage;
  label: string;
  transcript: string;
}> = [
  {
    lang: 'te',
    label: 'తెలుగు (Telugu)',
    transcript: 'మాకు 500 కాటన్ బ్యాగులు కావాలి. 20 రోజుల్లో డెలివరీ కావాలి.',
  },
  {
    lang: 'hi',
    label: 'हिन्दी (Hindi)',
    transcript: 'हमें 500 सूती बैग चाहिए। 20 दिनों में डिलीवरी जरूरी है।',
  },
  {
    lang: 'kn',
    label: 'ಕನ್ನಡ (Kannada)',
    transcript: 'ನಮಗೆ 500 ಹತ್ತಿ ಬ್ಯಾಗ್‌ಗಳು ಬೇಕು. 20 ದಿನಗಳಲ್ಲಿ ಡೆಲಿವರಿ ಬೇಕಾಗಿದೆ.',
  },
  {
    lang: 'en',
    label: 'English',
    transcript: 'We need 500 cotton bags. Delivery required in 20 days.',
  },
];

interface ExtractedDraft {
  productName: string;
  quantity: number | null;
  deadlineDays: number | null;
  buyerName: string;
  notes: string;
  englishSummary: string;
  confidence: number;
  extractionMode: string;
}

export function VoiceOrderIntakePage({
  shell = 'workflow',
}: {
  shell?: 'workflow' | 'portal';
}) {
  const navigate = useNavigate();
  const [intakeLanguage, setIntakeLanguage] = useState<SupportedLanguage>('te');
  const [recording, setRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('Listening ready · Demo fallback active');
  const [transcript, setTranscript] = useState(
    'We need 500 cotton bags. Delivery required in 20 days.'
  );
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedDraft | null>({
    productName: 'Cotton Bags',
    quantity: 500,
    deadlineDays: 20,
    buyerName: 'GreenHaat Retail Co-op',
    notes: 'We need 500 cotton bags. Delivery required in 20 days.',
    englishSummary: '500 Cotton Bags required with a 20-day delivery deadline.',
    confidence: 0.98,
    extractionMode: 'preview-ready',
  });

  const [productName, setProductName] = useState('Cotton Bags');
  const [quantity, setQuantity] = useState('500');
  const [deadlineDays, setDeadlineDays] = useState('20');
  const [buyerName, setBuyerName] = useState('GreenHaat Retail Co-op');

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecording(true);
      setRecordingStatus('Demo listening active... Tap Stop to transcribe');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecordingStatus('Transcribing voice note...');

        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1] || '';
          try {
            const stt = await apiFetch<{
              transcript: string;
              provider: string;
            }>('/api/speech/transcribe', {
              method: 'POST',
              body: JSON.stringify({
                audioBase64: base64,
                mimeType: blob.type || 'audio/webm',
                language: intakeLanguage,
              }),
            });

            if (stt.transcript) {
              setTranscript(stt.transcript);
              setRecordingStatus(`Transcribed via ${stt.provider}`);
            } else {
              setRecordingStatus(
                'Demo Mode: Speech key not configured. Edit or tap a regional transcript below.'
              );
            }
          } catch {
            setRecordingStatus(
              'Demo Mode: Edit or tap a regional transcript below to test extraction.'
            );
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingStatus('Listening... Speak your order clearly');
    } catch {
      setRecording(true);
      setRecordingStatus('Demo listening mode active (mic permission unavailable). Tap Stop.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      const preset = DEMO_SAMPLES.find((s) => s.lang === intakeLanguage) || DEMO_SAMPLES[3];
      setTranscript(preset.transcript);
      setRecordingStatus(`Demo speech captured (${preset.label})`);
    }
    setRecording(false);
  };

  const handleExtract = async () => {
    setError(null);
    setExtracting(true);
    try {
      const res = await apiFetch<ExtractedDraft>('/api/agents/intake/extract', {
        method: 'POST',
        body: JSON.stringify({ transcript, language: intakeLanguage }),
      });
      setExtracted(res);
      setProductName(res.productName || '');
      setQuantity(res.quantity ? String(res.quantity) : '');
      setDeadlineDays(res.deadlineDays ? String(res.deadlineDays) : '');
      setBuyerName(res.buyerName || 'Customer Order');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qtyNum = parseInt(quantity, 10);
    const daysNum = parseInt(deadlineDays, 10);
    if (!productName.trim() || !qtyNum || qtyNum <= 0 || !daysNum || daysNum <= 0) {
      setError('Please provide valid product name, quantity, and delivery deadline in days.');
      return;
    }

    setCreating(true);
    try {
      const created = await apiFetch<{ orderId: string }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          productName: productName.trim(),
          quantity: qtyNum,
          deadlineDays: daysNum,
          buyerName: buyerName.trim(),
          rawVoiceTranscript: transcript,
          intakeLanguage,
        }),
      });
      navigate(
        shell === 'workflow'
          ? `/work-allocation?orderId=${created.orderId}`
          : `/leader/allocation?orderId=${created.orderId}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create order');
    } finally {
      setCreating(false);
    }
  };

  const screenBody = (
    <div className="bg-[#FFFCF7] rounded-3xl border border-[#075B62]/15 shadow-sm p-5 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
      {/* Group Banner & Greeting */}
      <div className="text-center space-y-2 pt-1">
        <div className="inline-flex items-center px-3 py-1 rounded-xl bg-[#E9E3F5] text-xs font-bold text-[#124D52]">
          Saraswati Mahila SHG
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#124D52]">
          Welcome! Tell me what you need.
        </h2>
        <p className="text-sm text-[#777777]">Speak now or tap the microphone to place an order.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-2 space-y-4">
        <div className="relative flex items-center justify-center">
          {recording && (
            <>
              <span className="absolute w-36 h-36 rounded-full bg-[#075B62]/15 animate-ping" />
              <span className="absolute w-32 h-32 rounded-full bg-[#E9E3F5] opacity-80" />
            </>
          )}
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            aria-label={recording ? 'Stop recording' : 'Tap mic to order'}
            className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
              recording
                ? 'bg-[#D9534F] text-white'
                : 'bg-[#075B62] text-white hover:bg-[#124D52]'
            }`}
          >
            {recording ? <Square className="w-9 h-9" /> : <Mic className="w-10 h-10" />}
          </button>
        </div>

        {recording && (
          <div className="flex items-center justify-center gap-1.5 h-6" aria-hidden="true">
            {[14, 24, 18, 28, 16, 22, 12].map((h, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-[#075B62] animate-pulse"
                style={{ height: `${h}px`, animationDelay: `${i * 90}ms` }}
              />
            ))}
          </div>
        )}

        <p className="text-xs font-semibold text-[#075B62] text-center">{recordingStatus}</p>
      </div>

      {/* Regional Language Selection */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-[#777777] text-center">
          Select Spoken Language
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {DEMO_SAMPLES.map((sample) => (
            <button
              key={sample.lang}
              type="button"
              onClick={() => {
                setIntakeLanguage(sample.lang);
                setTranscript(sample.transcript);
                setRecordingStatus(`Loaded ${sample.label} voice transcript`);
              }}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${
                intakeLanguage === sample.lang
                  ? 'bg-[#075B62] text-white border-[#075B62]'
                  : 'bg-[#FFF8EF] text-[#124D52] border-[#075B62]/20 hover:bg-[#E9E3F5]/60'
              }`}
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Transcription Card */}
      <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/15 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="live-transcript" className="text-xs font-bold text-[#124D52]">
            Live Transcription (Demo / Editable Fallback)
          </label>
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting || !transcript.trim()}
            className="px-3.5 py-1.5 rounded-xl bg-[#E9E3F5] text-[#124D52] text-xs font-semibold hover:bg-[#8274A8] hover:text-white inline-flex items-center gap-1.5 transition-colors min-h-[36px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{extracting ? 'Extracting...' : 'Extract Order Info'}</span>
          </button>
        </div>
        <textarea
          id="live-transcript"
          rows={2}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="w-full p-3 rounded-xl border border-[#075B62]/15 bg-white text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#075B62]"
        />
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-[#D9534F]/10 border border-[#D9534F]/30 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Extracted Order Information Card */}
      {extracted && (
        <form
          onSubmit={handleConfirmOrder}
          className="p-5 rounded-2xl bg-[#E9E3F5]/45 border border-[#8274A8]/25 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-[#124D52]">
              <CheckCircle2 className="w-4 h-4 text-[#075B62]" />
              Extracted Order Information
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-[#777777]">
              <Edit3 className="w-3.5 h-3.5" />
              Tap any field to edit
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-white text-sm font-bold text-[#124D52]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">
                Buyer / Customer
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-white text-sm text-[#252525]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">
                Quantity (Pieces)
              </label>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-white text-sm font-mono-num font-bold text-[#124D52]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">
                Delivery Deadline (Days)
              </label>
              <input
                type="number"
                min={1}
                required
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-white text-sm font-mono-num font-bold text-[#124D52]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-[#075B62] text-white text-base font-bold hover:bg-[#124D52] transition-colors shadow-sm"
          >
            {creating ? 'Creating Order...' : 'Confirm Order'}
          </button>
        </form>
      )}
    </div>
  );

  if (shell === 'workflow') {
    return <WorkflowScreenLayout currentStep={1}>{screenBody}</WorkflowScreenLayout>;
  }

  return (
    <AppShell title="Voice Order Intake">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl border border-[#075B62]/15 shadow-sm p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#075B62]/10">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="w-11 h-11 rounded-xl bg-[#FFF8EF] text-[#124D52] flex items-center justify-center hover:bg-[#E9E3F5]/60 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="font-display text-lg font-bold text-[#124D52]">Voice Order Intake</h2>
              <p className="text-xs font-medium text-[#8274A8]">Saraswati Mahila SHG</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/leader/dashboard')}
              aria-label="Close to dashboard"
              className="w-11 h-11 rounded-xl bg-[#FFF8EF] text-[#124D52] flex items-center justify-center hover:bg-[#E9E3F5]/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {screenBody}
        </div>
      </div>
    </AppShell>
  );
}
