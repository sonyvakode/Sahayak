import { Link } from 'react-router-dom';
import {
  Mic,
  ShieldCheck,
  Volume2,
  ArrowRight,
  Cpu,
  AlertCircle,
} from 'lucide-react';
import { WorkflowScreenLayout } from '../components/WorkflowScreenLayout';

export function HelpSupportPage() {
  return (
    <WorkflowScreenLayout
      pageTitle="Help and Support"
      pageSubtitle="Guidance for SHG leaders, members, and hackathon judges"
    >
      <div className="space-y-6">
        <section className="bg-[#FFFCF7] rounded-3xl border border-[#075B62]/15 p-5 sm:p-7 space-y-4">
          <h2 className="font-display text-xl font-bold text-[#124D52]">
            How to Use SahayakSHG
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/12 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#124D52]">
                <Mic className="w-4 h-4 text-[#075B62]" />
                <span>1. Voice Intake &amp; Demo Mode</span>
              </div>
              <p className="text-xs text-[#777777] leading-relaxed">
                Tap the circular microphone on Voice Order Intake to record. When external speech API keys are not set, select Telugu, Hindi, Kannada, or English sample transcripts or type manually to test structured extraction.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/12 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#124D52]">
                <ShieldCheck className="w-4 h-4 text-[#075B62]" />
                <span>2. Completion vs. Quality Acceptance</span>
              </div>
              <p className="text-xs text-[#777777] leading-relaxed">
                Production completion (e.g., 380 completed out of 500) is tracked separately from quality-accepted pieces (360 accepted, 20 needs rework). Member payouts are calculated strictly from accepted pieces.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/12 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#124D52]">
                <Volume2 className="w-4 h-4 text-[#075B62]" />
                <span>3. Private Member Audio</span>
              </div>
              <p className="text-xs text-[#777777] leading-relaxed">
                Member Audio Playback scopes strictly to the logged-in member (e.g., Meena Kumari: 85 accepted pieces × ₹25 = ₹2,125) and never exposes other members&apos; payout figures.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/12 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-[#124D52]">
                <Cpu className="w-4 h-4 text-[#075B62]" />
                <span>4. Deterministic Math &amp; Payment Status</span>
              </div>
              <p className="text-xs text-[#777777] leading-relaxed">
                All financial arithmetic runs deterministically in server code. Approving a group payout records group consent in the ledger without claiming a real bank transfer took place.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#E9E3F5]/45 rounded-2xl border border-[#8274A8]/25 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#8274A8] shrink-0 mt-0.5" />
            <div>
              <div className="font-display text-sm font-bold text-[#124D52]">
                Demo Credentials &amp; Role Switching
              </div>
              <p className="text-xs text-[#777777] mt-0.5">
                Leader: Kavitha Rao (9876500001) · Members: Anjali Devi, Lakshmi N., Meena Kumari, Rani Bai · Prototype PIN: 1234.
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#075B62] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
          >
            <span>Open Role Switcher</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      </div>
    </WorkflowScreenLayout>
  );
}
