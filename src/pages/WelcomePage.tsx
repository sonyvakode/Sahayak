import { Link, useNavigate } from 'react-router-dom';
import {
  Mic,
  Users,
  Activity,
  Wallet,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { WorkflowScreenLayout } from '../components/WorkflowScreenLayout';
import { useAuth } from '../context/AuthContext';
import { LANGUAGE_OPTIONS } from '../i18n/translations';
import type { SupportedLanguage } from '../types';

const FEATURE_CARDS = [
  {
    title: 'Voice-Based Order Management',
    description:
      'Record customer orders in Telugu, Hindi, Kannada, or English and review structured quantities and deadlines.',
    icon: Mic,
    to: '/voice-intake',
    bg: 'bg-[#E9E3F5]/60',
  },
  {
    title: 'Smart Work Allocation',
    description:
      'Distribute bulk orders fairly across available SHG members based on skill, daily capacity, and workload balance.',
    icon: Users,
    to: '/work-allocation',
    bg: 'bg-[#DCEFE3]/70',
  },
  {
    title: 'Production and Quality Tracking',
    description:
      'Separate completed pieces from quality-accepted pieces, identify rework early, and stay ahead of delivery deadlines.',
    icon: Activity,
    to: '/order-progress',
    bg: 'bg-[#E9E3F5]/60',
  },
  {
    title: 'Transparent Member Payments',
    description:
      'Calculate member payouts deterministically from accepted pieces, approve transparently, and share audio summaries.',
    icon: Wallet,
    to: '/payout-summary',
    bg: 'bg-[#DCEFE3]/70',
  },
];

const WORKFLOW_CHAIN = [
  { label: 'Voice Order', to: '/voice-intake' },
  { label: 'Work Allocation', to: '/work-allocation' },
  { label: 'Production Tracking', to: '/order-progress' },
  { label: 'Quality Inspection', to: '/order-progress' },
  { label: 'Payout Approval', to: '/payout-summary' },
  { label: 'Member Earnings', to: '/member-audio' },
];

export function WelcomePage() {
  const { language, setLanguage, loginDemo } = useAuth();
  const navigate = useNavigate();

  const handleExploreDemo = async () => {
    try {
      await loginDemo('USR-LEADER-01');
    } catch {
      // handled gracefully by WorkflowScreenRoute
    }
    navigate('/voice-intake');
  };

  return (
    <WorkflowScreenLayout
      pageTitle="SahayakSHG"
      pageSubtitle="Voice-First AI Assistant for Indian Women's Self-Help Groups"
    >
      <div className="space-y-8">
        {/* Welcome Top Banner Card */}
        <section className="bg-[#FFFCF7] rounded-3xl border border-[#075B62]/15 shadow-sm p-5 sm:p-8 space-y-6">
          {/* Header Row inside Welcome Page */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#075B62]/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#075B62] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="font-display text-lg font-bold text-[#075B62]">SahayakSHG</div>
                <div className="text-xs text-[#777777]">
                  Voice-First AI Assistant for Indian Women&apos;s Self-Help Groups
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label htmlFor="welcome-lang" className="sr-only">
                Language selector
              </label>
              <select
                id="welcome-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="min-h-[42px] px-3 py-1.5 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF] text-xs sm:text-sm font-semibold text-[#124D52]"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.nativeLabel}
                  </option>
                ))}
              </select>
              <Link
                to="/login"
                className="min-h-[42px] px-4 py-2 rounded-xl border border-[#075B62]/25 bg-white text-xs sm:text-sm font-semibold text-[#124D52] hover:bg-[#E9E3F5]/50 inline-flex items-center transition-colors"
              >
                Sign In / Enter Demo
              </Link>
            </div>
          </div>

          {/* Main Hero Section */}
          <div className="max-w-3xl space-y-4 py-2">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#124D52] leading-tight text-balance">
              Empowering Women&apos;s Self-Help Groups Through Voice-First AI
            </h2>

            <p className="text-base sm:text-lg text-[#252525]/80 leading-relaxed">
              Manage orders, distribute work, track production, and calculate earnings through a simple, accessible digital assistant.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-2">
              <Link
                to="/voice-intake"
                className="min-h-[50px] px-6 py-3 rounded-2xl bg-[#075B62] text-white text-sm sm:text-base font-bold hover:bg-[#124D52] inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={handleExploreDemo}
                className="min-h-[50px] px-6 py-3 rounded-2xl border-2 border-[#075B62] bg-white text-[#075B62] text-sm sm:text-base font-bold hover:bg-[#E9E3F5]/45 inline-flex items-center justify-center gap-2 transition-colors"
              >
                <span>Explore Demo</span>
              </button>
            </div>
          </div>
        </section>

        {/* Feature Introduction (4 Clean Cards) */}
        <section className="space-y-3">
          <h3 className="font-display text-lg font-bold text-[#124D52]">Core Capabilities</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURE_CARDS.map((card, idx) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={card.to}
                  className="bg-[#FFFCF7] rounded-2xl border border-[#075B62]/15 p-5 hover:border-[#075B62] hover:shadow-sm transition-all flex items-start gap-4 group"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl ${card.bg} text-[#075B62] flex items-center justify-center shrink-0`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="font-display text-base font-bold text-[#124D52] group-hover:text-[#075B62] flex items-center justify-between gap-2">
                      <span>
                        {idx + 1}. {card.title}
                      </span>
                      <ArrowRight className="w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100" />
                    </div>
                    <p className="text-sm text-[#777777] leading-relaxed">{card.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Workflow Introduction */}
        <section className="bg-[#FFFCF7] rounded-2xl border border-[#075B62]/15 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-[#124D52]">
              End-to-End SHG Order Workflow
            </h3>
            <span className="text-xs font-medium text-[#8274A8]">
              Sample Order: ORD-2026-0012 · 500 Cotton Bags
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {WORKFLOW_CHAIN.map((step, index) => (
              <div key={step.label} className="flex items-center gap-2">
                <Link
                  to={step.to}
                  className="px-3.5 py-2 rounded-xl bg-[#FFF8EF] border border-[#075B62]/18 text-xs sm:text-sm font-semibold text-[#124D52] hover:bg-[#075B62] hover:text-white transition-colors"
                >
                  {step.label}
                </Link>
                {index < WORKFLOW_CHAIN.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-[#8274A8] shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs text-[#777777]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#075B62] shrink-0" />
              <span>
                Deterministic calculations for all quantities, quality acceptance, and group payouts.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#075B62] shrink-0" />
              <span>
                Privacy-first role separation so every member hears only her own earnings.
              </span>
            </div>
          </div>
        </section>
      </div>
    </WorkflowScreenLayout>
  );
}
