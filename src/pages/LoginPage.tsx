import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, Mic, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { apiFetch } from '../lib/api';
import { getMemberAvatar } from '../lib/memberAvatars';
import { LANGUAGE_OPTIONS, UI_COPY } from '../i18n/translations';
import type { DemoAccount, SupportedLanguage } from '../types';

export function LoginPage() {
  const { user, language, setLanguage, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [signingInId, setSigningInId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Optional phone + PIN login
  const [phone, setPhone] = useState('9876500001');
  const [pin, setPin] = useState('1234');

  useEffect(() => {
    if (user) {
      navigate(user.role === 'leader' ? '/leader/dashboard' : '/member/dashboard', {
        replace: true,
      });
    }
  }, [user, navigate]);

  useEffect(() => {
    apiFetch<{ accounts: DemoAccount[] }>('/api/auth/demo-accounts')
      .then((res) => setAccounts(res.accounts))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load demo accounts'))
      .finally(() => setLoadingAccounts(false));
  }, []);

  const handleQuickLogin = async (account: DemoAccount) => {
    setError(null);
    setSigningInId(account.id);
    try {
      const loggedUser = await loginDemo(account.id);
      navigate(loggedUser.role === 'leader' ? '/leader/dashboard' : '/member/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSigningInId(null);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const match = accounts.find((a) => a.phone === phone.trim());
    if (!match) {
      setError('Phone number not found in demo directory.');
      return;
    }
    setSigningInId(match.id);
    try {
      const loggedUser = await loginDemo(match.id, pin);
      navigate(loggedUser.role === 'leader' ? '/leader/dashboard' : '/member/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSigningInId(null);
    }
  };

  const leaderAccount = accounts.find((a) => a.role === 'leader');
  const memberAccounts = accounts.filter((a) => a.role === 'member');
  const copy = UI_COPY[language];

  return (
    <div className="min-h-screen bg-[#FFF8EF] text-[#252525] flex flex-col">
      {/* Clean Top Bar */}
      <header className="bg-white border-b border-[#075B62]/12 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="font-display text-xl font-bold tracking-tight text-[#075B62] whitespace-nowrap"
        >
          SahayakSHG
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-xs sm:text-sm font-semibold text-[#075B62] hover:underline whitespace-nowrap"
          >
            Home
          </Link>
          <label htmlFor="login-lang" className="sr-only">
            Select language
          </label>
          <select
            id="login-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF] text-sm font-medium text-[#124D52]"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.nativeLabel}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 lg:py-12 grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Context & Principles */}
        <section className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-[#8274A8]">
              Tech4Bharat Hackathon · Problem Statement 8.1
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#124D52] leading-tight text-balance">
              Voice-First Operations &amp; Fair Payouts for Self-Help Groups
            </h1>
            <p className="text-base text-[#252525]/80 leading-relaxed">
              {copy.appTagline}. Record regional-language orders, review transparent pricing, allocate work fairly, inspect quality, and let every member hear her own earnings.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#075B62]/12 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E9E3F5] text-[#075B62] flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-[#124D52]">
                  Voice-First &amp; Multilingual
                </h2>
                <p className="text-sm text-[#252525]/75 mt-0.5">
                  Supports Telugu, Hindi, Kannada, and English with large touch targets and offline queuing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DCEFE3] text-[#14532D] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-[#124D52]">
                  Human Approval &amp; Privacy First
                </h2>
                <p className="text-sm text-[#252525]/75 mt-0.5">
                  Every price, work split, quality inspection, and payout requires group approval. Members see and hear only their own earnings.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#075B62]/12 p-5">
            <h2 className="font-display text-sm font-bold text-[#124D52] mb-3">
              Prototype Phone + PIN Sign-In (Demo PIN: 1234)
            </h2>
            <form onSubmit={handlePhoneLogin} className="grid sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (e.g. 9876500001)"
                aria-label="Phone number"
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/50 text-sm font-mono-num"
              />
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN (1234)"
                aria-label="Demo PIN"
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/50 text-sm font-mono-num"
              />
              <button
                type="submit"
                disabled={signingInId !== null}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#124D52] text-white text-sm font-semibold hover:bg-[#075B62] transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
            </form>
          </div>
        </section>

        {/* Right Demo Role Switcher */}
        <section className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl border border-[#075B62]/15 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#075B62]/10">
              <div>
                <h2 className="font-display text-xl font-bold text-[#124D52]">
                  Select a Demo Account
                </h2>
                <p className="text-sm text-[#252525]/70">
                  Pre-loaded with Order ORD-2026-0012 (500 Cotton Bags) · Saraswati Mahila SHG
                </p>
              </div>
              <span className="text-xs font-semibold text-[#8274A8]">
                Prototype Auth Mode
              </span>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-[#D9534F]/10 border border-[#D9534F]/30 text-sm text-[#991B1B]">
                {error}
              </div>
            )}

            {loadingAccounts ? (
              <div className="py-10 text-center text-sm text-[#252525]/60">
                Loading Saraswati Mahila SHG demo accounts...
              </div>
            ) : (
              <div className="space-y-5">
                {/* Leader Demo Card */}
                {leaderAccount && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[#075B62]">
                      SHG Leader Role (Full Order, Pricing, Quality &amp; Payout Controls)
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin(leaderAccount)}
                      disabled={signingInId !== null}
                      className="w-full text-left p-4 rounded-2xl bg-[#075B62] text-white hover:bg-[#124D52] transition-colors flex items-center justify-between gap-4 min-h-[72px]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-display text-base font-bold truncate">
                            {leaderAccount.name}
                          </div>
                          <div className="text-xs text-white/80 font-mono-num">
                            Demo Leader · {leaderAccount.phone} · Language: {leaderAccount.preferred_language.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold shrink-0">
                        {signingInId === leaderAccount.id ? 'Signing in...' : 'Enter Leader Workspace'}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  </div>
                )}

                {/* Member Demo Cards */}
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-[#8274A8]">
                    SHG Member Roles (Private Work, Progress Updates &amp; Personal Audio Earnings)
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {memberAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleQuickLogin(acc)}
                        disabled={signingInId !== null}
                        className="text-left p-4 rounded-2xl bg-[#FFF8EF] border border-[#075B62]/15 hover:border-[#075B62] hover:bg-[#E9E3F5]/40 transition-colors flex items-center justify-between gap-3 min-h-[76px]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ImageWithFallback
                            src={getMemberAvatar(acc.name)}
                            alt={acc.name}
                            className="w-11 h-11 rounded-full object-cover border border-[#075B62]/20 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-display text-sm font-bold text-[#124D52] truncate">
                              {acc.name}
                            </div>
                            <div className="text-xs text-[#252525]/70 font-mono-num truncate">
                              Demo Member · {acc.phone}
                            </div>
                            <div className="text-xs text-[#8274A8] truncate mt-0.5">
                              {acc.skills || 'Cotton stitching'}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#075B62] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
