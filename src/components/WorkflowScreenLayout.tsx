import React, { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Home,
  Mic,
  Users,
  Activity,
  Wallet,
  Volume2,
  HelpCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogIn,
  Globe,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LANGUAGE_OPTIONS } from '../i18n/translations';
import type { SupportedLanguage } from '../types';

export interface WorkflowStepDef {
  step: number;
  path: string;
  shortLabel: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const WORKFLOW_STEPS: WorkflowStepDef[] = [
  {
    step: 1,
    path: '/voice-intake',
    shortLabel: 'Voice Intake',
    title: 'Voice Order Intake',
    subtitle: 'Create a new order using your voice or enter the details manually.',
    icon: Mic,
  },
  {
    step: 2,
    path: '/work-allocation',
    shortLabel: 'Allocation',
    title: 'Work Allocation',
    subtitle: 'Distribute orders fairly based on member capacity and availability.',
    icon: Users,
  },
  {
    step: 3,
    path: '/order-progress',
    shortLabel: 'Progress',
    title: 'Order Progress & Quality',
    subtitle: 'Monitor production, identify delays, and review quality.',
    icon: Activity,
  },
  {
    step: 4,
    path: '/payout-summary',
    shortLabel: 'Payouts',
    title: 'Payout Summary',
    subtitle: "Review member earnings and approve the group's payout.",
    icon: Wallet,
  },
  {
    step: 5,
    path: '/member-audio',
    shortLabel: 'Audio',
    title: 'Member Audio Playback',
    subtitle: 'Listen to your work and earnings summary in your preferred language.',
    icon: Volume2,
  },
];

export function WorkflowScreenLayout({
  currentStep,
  pageTitle,
  pageSubtitle,
  headerActions,
  children,
}: {
  currentStep?: 1 | 2 | 3 | 4 | 5;
  pageTitle?: string;
  pageSubtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, group, language, setLanguage, loginDemo } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);

  const activeDef = currentStep ? WORKFLOW_STEPS[currentStep - 1] : null;
  const prevDef = currentStep && currentStep > 1 ? WORKFLOW_STEPS[currentStep - 2] : null;
  const nextDef = currentStep && currentStep < 5 ? WORKFLOW_STEPS[currentStep] : null;

  const orderIdParam = searchParams.get('orderId');
  const buildPath = (basePath: string) =>
    orderIdParam && basePath !== '/voice-intake' ? `${basePath}?orderId=${orderIdParam}` : basePath;

  const sidebarNavItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: buildPath('/voice-intake'), matchPath: '/voice-intake', label: 'Voice Order Intake', icon: Mic },
    { to: buildPath('/work-allocation'), matchPath: '/work-allocation', label: 'Work Allocation', icon: Users },
    { to: buildPath('/order-progress'), matchPath: '/order-progress', label: 'Order Progress & Quality', icon: Activity },
    { to: buildPath('/payout-summary'), matchPath: '/payout-summary', label: 'Payout Summary', icon: Wallet },
    { to: buildPath('/member-audio'), matchPath: '/member-audio', label: 'Member Audio Playback', icon: Volume2 },
    { to: '/help', matchPath: '/help', label: 'Help and Support', icon: HelpCircle },
    { to: '/settings', matchPath: '/settings', label: 'Profile and Settings', icon: Settings },
  ];

  const mobileBottomTabs = [
    { to: '/', matchPath: '/', label: 'Home', icon: Home },
    { to: buildPath('/voice-intake'), matchPath: '/voice-intake', label: 'Intake', icon: Mic },
    { to: buildPath('/work-allocation'), matchPath: '/work-allocation', label: 'Allocate', icon: Users },
    { to: buildPath('/order-progress'), matchPath: '/order-progress', label: 'Progress', icon: Activity },
    { to: buildPath('/payout-summary'), matchPath: '/payout-summary', label: 'Payout', icon: Wallet },
    { to: buildPath('/member-audio'), matchPath: '/member-audio', label: 'Audio', icon: Volume2 },
  ];

  const resolvedTitle = pageTitle || activeDef?.title || 'SahayakSHG';
  const resolvedSubtitle =
    pageSubtitle || activeDef?.subtitle || "Voice-First AI Assistant for Indian Women's Self-Help Groups";

  return (
    <div className="min-h-screen w-full bg-[#FFF8EF] text-[#252525] flex">
      {/* Persistent Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-[#FFFCF7] border-r border-[#075B62]/12 z-30">
        {/* Brand Logo & Name */}
        <div className="px-5 py-5 border-b border-[#075B62]/10">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#075B62] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-xl font-bold tracking-tight text-[#075B62]">
                SahayakSHG
              </div>
              <div className="text-[11px] text-[#777777] truncate">
                {group?.name || 'Saraswati Mahila SHG'}
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            const matchTarget = item.matchPath || item.to;
            const isActive = location.pathname === matchTarget;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-[#075B62] text-white shadow-sm'
                    : 'text-[#124D52] hover:bg-[#E9E3F5]/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer: Language & Demo Role */}
        <div className="p-4 border-t border-[#075B62]/10 space-y-3 bg-[#FFF8EF]/60">
          <div className="space-y-1">
            <label
              htmlFor="sidebar-lang-select"
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#777777]"
            >
              <Globe className="w-3.5 h-3.5 text-[#075B62]" />
              <span>Language Selection</span>
            </label>
            <select
              id="sidebar-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-[#075B62]/20 bg-white text-xs font-semibold text-[#124D52]"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.nativeLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#075B62]/12 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#124D52] truncate">
                  {user?.name || 'Demo Mode'}
                </div>
                <div className="text-[11px] text-[#8274A8] font-medium">
                  {user?.role === 'member' ? 'SHG Member View' : 'SHG Leader View'}
                </div>
              </div>
              <Link
                to="/login"
                className="text-[11px] font-bold text-[#075B62] hover:underline shrink-0"
              >
                Switch
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => loginDemo('USR-LEADER-01').catch(() => {})}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                  user?.role !== 'member'
                    ? 'bg-[#075B62] text-white border-[#075B62]'
                    : 'bg-[#FFF8EF] text-[#124D52] border-[#075B62]/20'
                }`}
              >
                Leader
              </button>
              <button
                type="button"
                onClick={() => loginDemo('USR-MEM-03').catch(() => {})}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                  user?.role === 'member'
                    ? 'bg-[#075B62] text-white border-[#075B62]'
                    : 'bg-[#FFF8EF] text-[#124D52] border-[#075B62]/20'
                }`}
              >
                Member
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen w-full min-w-0">
        {/* Top Bar (Mobile + Desktop Page Header) */}
        <header className="sticky top-0 z-20 bg-[#FFFCF7]/95 backdrop-blur-md border-b border-[#075B62]/12 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden w-11 h-11 rounded-xl bg-[#FFF8EF] text-[#075B62] flex items-center justify-center hover:bg-[#E9E3F5]/60 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-lg font-bold text-[#124D52] truncate">
                {resolvedTitle}
              </h1>
              <p className="hidden sm:block text-xs text-[#777777] truncate">{resolvedSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {headerActions}
            <label htmlFor="header-lang-select" className="sr-only">
              Language
            </label>
            <select
              id="header-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="lg:hidden min-h-[40px] px-2.5 py-1.5 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF] text-xs font-semibold text-[#124D52]"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.nativeLabel}
                </option>
              ))}
            </select>
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#E9E3F5]/75 text-[#124D52] text-xs font-semibold hover:bg-[#E9E3F5] transition-colors whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{user ? `${user.name}` : 'Sign In / Demo'}</span>
            </Link>
          </div>
        </header>

        {/* Single Active Screen Content */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 pb-24 lg:pb-8 flex flex-col">
          <div className="flex-1 flex flex-col gap-6">{children}</div>

          {/* Workflow Previous / Next Footer (only on Screens 1..5) */}
          {currentStep && (
            <nav
              aria-label="Workflow step navigation"
              className="mt-6 pt-4 border-t border-[#075B62]/12 flex items-center justify-between gap-2 sm:gap-3"
            >
              {prevDef ? (
                <Link
                  to={buildPath(prevDef.path)}
                  className="min-h-[44px] px-3 sm:px-4 py-2 rounded-xl border border-[#075B62]/25 bg-[#FFFCF7] text-[#124D52] text-xs sm:text-sm font-semibold hover:bg-[#E9E3F5]/50 inline-flex items-center gap-1 sm:gap-1.5 transition-colors min-w-0"
                >
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                  <span className="sm:hidden">Prev</span>
                  <span className="hidden sm:inline truncate">Previous: {prevDef.shortLabel}</span>
                </Link>
              ) : (
                <Link
                  to="/"
                  className="min-h-[44px] px-3 sm:px-4 py-2 rounded-xl border border-[#075B62]/25 bg-[#FFFCF7] text-[#124D52] text-xs sm:text-sm font-semibold hover:bg-[#E9E3F5]/50 inline-flex items-center gap-1 sm:gap-1.5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                  <span>Home</span>
                </Link>
              )}

              <span className="text-[11px] sm:text-xs font-mono-num font-semibold text-[#777777] whitespace-nowrap shrink-0">
                Step {currentStep} / 5
              </span>

              {nextDef ? (
                <Link
                  to={buildPath(nextDef.path)}
                  className="min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-[#075B62] text-white text-xs sm:text-sm font-semibold hover:bg-[#124D52] inline-flex items-center gap-1 sm:gap-1.5 transition-colors min-w-0"
                >
                  <span className="sm:hidden">Next</span>
                  <span className="hidden sm:inline truncate">Next: {nextDef.shortLabel}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </Link>
              ) : (
                <Link
                  to="/"
                  className="min-h-[44px] px-3 sm:px-4 py-2 rounded-xl border border-[#075B62]/25 bg-[#FFFCF7] text-[#075B62] text-xs sm:text-sm font-semibold hover:bg-[#E9E3F5]/50 inline-flex items-center gap-1 sm:gap-1.5 transition-colors"
                >
                  <span>Home</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </Link>
              )}
            </nav>
          )}
        </main>

        {/* Compact Mobile Bottom Navigation */}
        <nav
          aria-label="Mobile bottom navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FFFCF7]/95 backdrop-blur-md border-t border-[#075B62]/15 h-16 px-1 flex items-center justify-between"
        >
          {mobileBottomTabs.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.matchPath;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center min-h-[44px] px-0.5 rounded-xl transition-colors ${
                  isActive ? 'text-[#075B62] font-bold' : 'text-[#777777]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] mt-0.5 truncate w-full text-center">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Slide-Over Menu Drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="relative w-80 max-w-[86vw] bg-[#FFFCF7] h-full flex flex-col z-10 shadow-xl">
            <div className="px-5 py-4 border-b border-[#075B62]/10 flex items-center justify-between">
              <div>
                <div className="font-display text-lg font-bold text-[#075B62]">SahayakSHG</div>
                <div className="text-xs text-[#777777]">Saraswati Mahila SHG</div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
                className="w-11 h-11 rounded-xl flex items-center justify-center text-[#124D52] hover:bg-[#FFF8EF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {sidebarNavItems.map((item) => {
                const Icon = item.icon;
                const matchTarget = item.matchPath || item.to;
                const isActive = location.pathname === matchTarget;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold min-h-[46px] transition-colors ${
                      isActive ? 'bg-[#075B62] text-white' : 'text-[#124D52] hover:bg-[#E9E3F5]/55'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#075B62]/10 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    loginDemo('USR-LEADER-01').catch(() => {});
                    setMenuOpen(false);
                  }}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#075B62] text-white text-xs font-semibold"
                >
                  Leader Demo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    loginDemo('USR-MEM-03').catch(() => {});
                    setMenuOpen(false);
                  }}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#E9E3F5] text-[#124D52] text-xs font-semibold"
                >
                  Member Demo
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
