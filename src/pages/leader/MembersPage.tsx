import React, { useEffect, useState } from 'react';
import { UserPlus, Users, CheckCircle2 } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { apiFetch } from '../../lib/api';
import type { MemberRecord, SupportedLanguage } from '../../types';

export function MembersPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('Cotton stitching, Finishing');
  const [dailyCapacity, setDailyCapacity] = useState('14');
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>('te');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = () => {
    apiFetch<{ members: MemberRecord[] }>('/api/leader/members')
      .then((res) => setMembers(res.members))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setSaving(true);
    try {
      await apiFetch('/api/leader/members', {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone,
          skills,
          dailyCapacity: Number(dailyCapacity),
          preferredLanguage,
        }),
      });
      setMsg(`Registered ${name} in Saraswati Mahila SHG (demo PIN 1234).`);
      setName('');
      setPhone('');
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register member');
    } finally {
      setSaving(false);
    }
  };

  const updateAvailability = async (
    memberId: string,
    availability: 'available' | 'limited' | 'unavailable'
  ) => {
    await apiFetch(`/api/leader/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ availability }),
    });
    loadMembers();
  };

  return (
    <AppShell title="SHG Members">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleAddMember}
          className="lg:col-span-5 bg-white rounded-2xl border border-[#075B62]/15 p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-[#075B62]/10">
            <UserPlus className="w-5 h-5 text-[#075B62]" />
            <h2 className="font-display text-base font-bold text-[#124D52]">
              Register SHG Member
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#252525]/80 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunitaamma K."
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#252525]/80 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876500099"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#252525]/80 mb-1">
                Daily Capacity (Pcs)
              </label>
              <input
                type="number"
                min={1}
                value={dailyCapacity}
                onChange={(e) => setDailyCapacity(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm font-mono-num"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#252525]/80 mb-1">
              Craft Skills
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#252525]/80 mb-1">
              Preferred Audio Language
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as SupportedLanguage)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#075B62]/20 bg-[#FFF8EF]/40 text-sm"
            >
              <option value="te">తెలుగు (Telugu)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="en">English</option>
            </select>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#D9534F]/10 text-xs text-[#991B1B]">{error}</div>
          )}
          {msg && (
            <div className="p-3 rounded-xl bg-[#DCEFE3] text-xs font-medium text-[#14532D] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#075B62] text-white text-sm font-semibold hover:bg-[#124D52]"
          >
            {saving ? 'Registering...' : 'Register Member'}
          </button>
        </form>

        <section className="lg:col-span-7 bg-white rounded-2xl border border-[#075B62]/12 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#075B62]/10">
            <h2 className="font-display text-base font-bold text-[#124D52] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#075B62]" />
              <span>Group Directory ({members.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="h-40 rounded-xl bg-[#FFF8EF] animate-pulse" />
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-[#FFF8EF] border border-[#075B62]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-display text-sm font-bold text-[#124D52]">
                      {m.name}{' '}
                      <span className="font-mono-num text-xs font-normal text-[#252525]/65">
                        · {m.phone}
                      </span>
                    </div>
                    <div className="text-xs text-[#252525]/75">{m.skills}</div>
                    <div className="text-xs text-[#8274A8] font-mono-num">
                      {m.daily_capacity}/day capacity · Past workload {m.past_workload} pcs · Lang:{' '}
                      {m.preferred_language.toUpperCase()} · Consent:{' '}
                      {m.consent_given ? 'Granted' : 'Withdrawn'}
                    </div>
                  </div>

                  <select
                    value={m.availability}
                    onChange={(e) =>
                      updateAvailability(
                        m.id,
                        e.target.value as 'available' | 'limited' | 'unavailable'
                      )
                    }
                    aria-label={`Availability for ${m.name}`}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#075B62]/20 bg-white text-xs font-semibold text-[#124D52]"
                  >
                    <option value="available">Available</option>
                    <option value="limited">Limited</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
