"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  Lock, User, Bell, Shield, Palette, ChevronRight,
  Check, LogOut, Trash2, Moon, Globe2, TrendingUp,
} from "lucide-react"

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-200 ${
        value ? "border-primary bg-primary" : "border-[#334155] bg-[#1e293b]"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#334155]/40 bg-[#111827]/60">
      <div className="flex items-center gap-2.5 border-b border-[#334155]/30 bg-[#1e293b]/30 px-5 py-4">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">{title}</h2>
      </div>
      <div className="divide-y divide-[#334155]/20">{children}</div>
    </div>
  )
}

function SettingRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
      <div className="ml-4 shrink-0">{children}</div>
    </div>
  )
}

function SelectRow({ label, sub, value, options, onChange }: {
  label: string; sub?: string
  value: string; options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg border border-[#334155]/60 bg-[#0a0f1e]/60 px-3 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-primary/60"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.push("/login")
  }, [isAuthenticated, router])

  // Account
  const [name,  setName]  = useState(user?.name  ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [saved, setSaved] = useState(false)

  // Notifications
  const [notifSignals,  setNotifSignals]  = useState(true)
  const [notifNews,     setNotifNews]     = useState(true)
  const [notifWeekly,   setNotifWeekly]   = useState(false)
  const [notifEmail,    setNotifEmail]    = useState(true)

  // Platform
  const [currency,    setCurrency]    = useState("USD")
  const [timezone,    setTimezone]    = useState("UTC")
  const [theme,       setTheme]       = useState("Dark")
  const [signalStyle, setSignalStyle] = useState("Detailed")

  // Security
  const [twoFA, setTwoFA] = useState(false)

  const handleSaveProfile = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // TODO: call PATCH /api/user with { name, email }
  }

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#060d1a] pb-32 pt-24">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(56,108,255,0.06),transparent)]" />

      <div className="relative mx-auto max-w-2xl px-4">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account and platform preferences</p>
        </div>

        <div className="space-y-5">

          {/* ── Account ── */}
          <Section title="Account" icon={User}>
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#334155]/60 bg-[#0a0f1e]/60 px-4 text-sm text-foreground outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#334155]/60 bg-[#0a0f1e]/60 px-4 text-sm text-foreground outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                />
              </div>

              {/* Role badge (read-only) */}
              <div className="flex items-center justify-between rounded-xl border border-[#334155]/40 bg-[#1e293b]/30 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Account type</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold capitalize text-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    {user.role}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground/50">Locked</span>
              </div>

              <button
                onClick={handleSaveProfile}
                className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.98] ${
                  saved
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save changes"}
              </button>
            </div>
          </Section>

          {/* ── Notifications ── */}
          <Section title="Notifications" icon={Bell}>
            <SettingRow label="AI Agent Signals"    sub="Get notified when agents generate a signal">
              <Toggle value={notifSignals}  onChange={setNotifSignals}  />
            </SettingRow>
            <SettingRow label="Market News Alerts"  sub="Breaking news affecting your pairs">
              <Toggle value={notifNews}     onChange={setNotifNews}     />
            </SettingRow>
            <SettingRow label="Weekly Digest"       sub="Summary of signals and performance">
              <Toggle value={notifWeekly}   onChange={setNotifWeekly}   />
            </SettingRow>
            <SettingRow label="Email Notifications" sub="Receive alerts via email">
              <Toggle value={notifEmail}    onChange={setNotifEmail}    />
            </SettingRow>
          </Section>

          {/* ── Platform preferences ── */}
          <Section title="Platform" icon={Globe2}>
            <SelectRow label="Base currency"   sub="Used for capital display"           value={currency}    options={["USD","EUR","GBP","JPY","CHF","AUD","CAD"]} onChange={setCurrency}    />
            <SelectRow label="Timezone"        sub="For timestamps and market hours"    value={timezone}    options={["UTC","EST","PST","CET","JST","GMT+1","GMT+3"]} onChange={setTimezone} />
            <SelectRow label="Theme"           sub="Interface appearance"               value={theme}       options={["Dark","Light","System"]}                    onChange={setTheme}       />
            <SelectRow label="Signal display"  sub="How AI signals are presented"       value={signalStyle} options={["Detailed","Compact","Minimal"]}              onChange={setSignalStyle} />
          </Section>

          {/* ── Security ── */}
          <Section title="Security" icon={Shield}>
            <SettingRow label="Two-factor authentication" sub="Add an extra layer of security (coming soon)">
              <Toggle value={twoFA} onChange={setTwoFA} />
            </SettingRow>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">Change password</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Update your login password</p>
              </div>
              <button className="flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80">
                Update <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active sessions</p>
              <div className="flex items-center justify-between rounded-xl border border-[#334155]/40 bg-[#1e293b]/30 px-4 py-3 mt-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">Current session</p>
                  <p className="text-[10px] text-muted-foreground">This device · Just now</p>
                </div>
                <div className="flex h-2 w-2 rounded-full bg-emerald-400" />
              </div>
            </div>
          </Section>

          {/* ── Appearance ── */}
          <Section title="Appearance" icon={Palette}>
            <div className="px-5 py-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Accent colour</p>
              <div className="flex gap-2">
                {[
                  { name: "Indigo",   cls: "bg-indigo-500"  },
                  { name: "Blue",     cls: "bg-blue-500"    },
                  { name: "Emerald",  cls: "bg-emerald-500" },
                  { name: "Violet",   cls: "bg-violet-500"  },
                  { name: "Amber",    cls: "bg-amber-500"   },
                  { name: "Rose",     cls: "bg-rose-500"    },
                ].map(c => (
                  <button
                    key={c.name}
                    title={c.name}
                    className={`h-8 w-8 rounded-full ${c.cls} ring-offset-2 ring-offset-[#060d1a] transition-all hover:ring-2 hover:ring-white/30`}
                  />
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground/50">Custom accent colours coming with full platform launch</p>
            </div>
          </Section>

          {/* ── Danger zone ── */}
          <div className="overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-2.5 border-b border-red-500/20 px-5 py-4">
              <Trash2 className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-red-400">Danger zone</h2>
            </div>
            <div className="divide-y divide-red-500/10">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Sign out</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Sign out of your current session</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Delete account</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Permanently delete your account and all data</p>
                </div>
                <button className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}