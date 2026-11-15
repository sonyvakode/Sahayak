import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Mic,
  Calculator,
  Users,
  Activity,
  ShieldCheck,
  Layers,
  Wallet,
  Settings,
  LogOut,
  Volume2,
  Briefcase,
  CheckSquare,
  Wifi,
  WifiOff,
  RefreshCw,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { LANGUAGE_OPTIONS, UI_COPY } from '../i18n/translations';
import type { SupportedLanguage } from '../types';

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { user, group, language, setLanguage, logout } = useAuth();
  const { isOffline, pendingCount, syncing, syncNow } = useOffline();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;
  const copy = UI_COPY[language];

  const leaderLinks = [
    { to: '/leader/dashboard', label: copy.leaderNav.dashboard, icon: LayoutDashboard },
    { to: '/leader/orders', label: copy.leaderNav.orders, icon: ClipboardList },
    { to: '/leader/orders/new', label: copy.leaderNav.newOrder, icon: Mic },
    { to: '/leader/pricing', label: copy.leaderNav.pricing, icon: Calculator },
    { to: '/leader/allocation', label: copy.leaderNav.allocation, icon: Users },
    { to: '/leader/progress', label: copy.leaderNav.progress, icon: Activity },
    { to: '/leader/quality', label: copy.leaderNav.quality, icon: ShieldCheck },
    { to: '/leader/consolidation', label: copy.leaderNav.consolidation, icon: Layers },
    { to: '/leader/payouts', label: copy.leaderNav.payouts, icon: Wallet },
    { to: '/leader/members', label: copy.leaderNav.members, icon: Users },
    { to: '/settings', label: copy.leaderNav.settings, icon: Settings },
  ];

  const memberLinks = [
    { to: '/member/dashboard', label: copy.memberNav.dashboard, icon: LayoutDashboard },
    { to: '/member/work', label: copy.memberNav.work, icon: Briefcase },
    { to: '/member/progress', label: copy.memberNav.progress, icon: CheckSquare },
    { to: '/member/earnings', label: copy.memberNav.earnings, icon: Wallet },
    { to: '/member/audio-summary', label: copy.memberNav.audioSummary, icon: Volume2 },
    { to: '/settings', label: copy.memberNav.settings, icon: Settings },
  ];

  const navItems = user.role === 'leader' ? leaderLinks : memberLinks;
  const mobilePrimaryTabs =
    user.role === 'leader'
      ? [
          leaderLinks[0],
          leaderLinks[2],
          leaderLinks[4],
          leaderLinks[6],
          leaderLinks[8],
        ]
      : [
          memberLinks[0],
          memberLinks[1],
          memberLinks[2],
          memberLinks[4],
        ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#FFF8EF] text-[#252525] flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-[#075B62]/12 z-30">
        <div className="px-6 py-5 border-b border-[#075B62]/10">
          <div className="font-display text-xl font-bold tracking-tight text-[#075B62]">
            SahayakSHG
          </div>
          <p className="text-xs text-[#252525]/70 mt-1 truncate">
            {group?.name || 'Saraswati Mahila SHG'}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavLink
            to="/voice-intake"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap text-[#8274A8] hover:bg-[#E9E3F5]/60 hover:text-[#075B62]"
          >
            <Mic className="w-4 h-4 shrink-0" />
            <span className="truncate">Guided 5-Screen App</span>
          </NavLink>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap ${
                  active
                    ? 'bg-[#075B62] text-white'
                    : 'text-[#252525]/80 hover:bg-[#E9E3F5]/60 hover:text-[#075B62]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#075B62]/10 space-y-3">
          <div className="px-2">
            <div className="text-sm font-semibold text-[#252525] truncate">{user.name}</div>
            <div className="text-xs text-[#252525]/65">
              {user.role === 'leader' ? 'SHG Leader' : 'SHG Member'}
              {user.isDemo ? ' · Demo Account' : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#075B62]/20 text-sm font-medium text-[#124D52] hover:bg-[#E9E3F5]/50 transition-colors min-h-[44px] whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{copy.common.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full">
        {/* Clean 3-Zone Top Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#075B62]/12 px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#075B62] hover:bg-[#E9E3F5]/50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-base lg:text-lg font-bold text-[#124D52] truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Connectivity / Sync Indicator */}
            {pendingCount > 0 ? (
              <button
                type="button"
                onClick={() => syncNow()}
                disabled={isOffline || syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F2A15A]/25 text-[#7C2D12] hover:bg-[#F2A15A]/35 transition-colors min-h-[38px] whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>
                  {pendingCount} {copy.common.pendingSync}
                </span>
              </button>
            ) : (
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium ${
                  isOffline ? 'text-[#B45309]' : 'text-[#075B62]'
                }`}
              >
                {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                <span>{isOffline ? copy.common.offline : copy.common.online}</span>
              </span>
            )}

            {/* Language Selector */}
            <label htmlFor="global-lang-select" className="sr-only">
              Language
            </label>
            <select
              id="global-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF] text-xs sm:text-sm font-medium text-[#124D52] focus:outline-none focus:ring-2 focus:ring-[#075B62]"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.nativeLabel}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-7 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Thumb-Zone Navigation (<= 64px, compact within 15% cap) */}
        <nav
          aria-label="Primary mobile navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#075B62]/15 h-16 px-1 flex items-center justify-around"
        >
          {mobilePrimaryTabs.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-1 rounded-xl transition-colors ${
                  active ? 'text-[#075B62] font-semibold' : 'text-[#252525]/65'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] mt-0.5 truncate max-w-[68px]">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Mobile Full Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col z-10 shadow-xl">
            <div className="px-5 py-4 border-b border-[#075B62]/10 flex items-center justify-between">
              <div>
                <div className="font-display text-lg font-bold text-[#075B62]">SahayakSHG</div>
                <div className="text-xs text-[#252525]/70">{user.name}</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#252525]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              <NavLink
                to="/voice-intake"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium min-h-[44px] text-[#8274A8] hover:bg-[#E9E3F5]/50 hover:text-[#075B62]"
              >
                <Mic className="w-4 h-4 shrink-0" />
                <span>Guided 5-Screen App</span>
              </NavLink>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium min-h-[44px] ${
                      active
                        ? 'bg-[#075B62] text-white'
                        : 'text-[#252525] hover:bg-[#E9E3F5]/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#075B62]/10">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#075B62]/20 text-sm font-semibold text-[#124D52] min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>{copy.common.signOut}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
