"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

import {
  Lock,
  User,
  Bell,
  Shield,
  Palette,
  ChevronRight,
  Check,
  LogOut,
  Trash2,
  Globe2,
  TrendingUp,
} from "lucide-react"

// ─────────────────────────────────────────────
// TOGGLE
// ─────────────────────────────────────────────

function Toggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-200 ${
        value
          ? "border-primary bg-primary"
          : "border-[#334155] bg-[#1e293b]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          value
            ? "translate-x-6"
            : "translate-x-1"
        }`}
      />
    </button>
  )
}

// ─────────────────────────────────────────────
// SECTION
// ─────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: any
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#334155]/40 bg-[#111827]/60">
      <div className="flex items-center gap-2.5 border-b border-[#334155]/30 bg-[#1e293b]/30 px-5 py-4">
        <Icon className="h-4 w-4 text-primary" />

        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
          {title}
        </h2>
      </div>

      <div className="divide-y divide-[#334155]/20">
        {children}
      </div>
    </div>
  )
}

function SettingRow({
  label,
  sub,
  children,
}: {
  label: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          {label}
        </p>

        {sub && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {sub}
          </p>
        )}
      </div>

      <div className="ml-4 shrink-0">
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()

  const {
    user,
    setUser,
    isAuthenticated,
    logout,
  } = useAuth()

  // STATES

  const [name, setName] =
    useState(user?.name ?? "")

  const [email] =
    useState(user?.email ?? "")

  const [saved, setSaved] =
    useState(false)

  const [notifSignals,
    setNotifSignals] =
    useState(true)

  const [notifNews,
    setNotifNews] =
    useState(true)

  const [notifWeekly,
    setNotifWeekly] =
    useState(false)

  const [notifEmail,
    setNotifEmail] =
    useState(true)

  const [twoFA,
    setTwoFA] =
    useState(false)

  const [showPasswordSection,
    setShowPasswordSection] =
    useState(false)

  const [currentPassword,
    setCurrentPassword] =
    useState("")

  const [newPassword,
    setNewPassword] =
    useState("")

  const [passwordLoading,
    setPasswordLoading] =
    useState(false)

  const [passwordSaved,
    setPasswordSaved] =
    useState(false)

  const [passwordError,
    setPasswordError] =
    useState("")

  // AUTH

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  // SAVE PROFILE

  const handleSaveProfile =
    async () => {
      try {
        const response =
          await fetch(
            "/api/profile/update",
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                name,
                email: user?.email,
              }),
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error
          )
        }

        setUser(data.user)

        localStorage.setItem(
          "alphalab-user",
          JSON.stringify(data.user)
        )

        setSaved(true)

        setTimeout(() => {
          setSaved(false)
        }, 2000)
      } catch (error) {
        console.error(error)
      }
    }

  // PASSWORD

  const handlePasswordChange =
    async () => {
      try {
        setPasswordLoading(true)

        setPasswordError("")

        const response =
          await fetch(
            "/api/profile/update/change-password",
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                email: user?.email,
                currentPassword,
                newPassword,
              }),
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error
          )
        }

        setPasswordSaved(true)

        setCurrentPassword("")
        setNewPassword("")

        setTimeout(() => {
          setPasswordSaved(false)
        }, 2000)
      } catch (error: any) {
        setPasswordError(
          error.message
        )
      } finally {
        setPasswordLoading(false)
      }
    }

  // DELETE ACCOUNT

  const handleDeleteAccount =
    async () => {
      const confirmDelete =
        confirm(
          "Are you sure you want to delete your account permanently?"
        )

      if (!confirmDelete) return

      try {
        await fetch(
          "/api/profile/update/delete",
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email: user?.email,
            }),
          }
        )

        localStorage.removeItem(
          "alphalab-user"
        )

        router.push("/signup")
      } catch (error) {
        console.error(error)
      }
    }

  // LOGOUT

  const handleLogout =
    async () => {
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

      <div className="relative mx-auto max-w-2xl px-4">

        <div className="mb-8">

          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Settings
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account
          </p>
        </div>

        <div className="space-y-5">

          {/* ACCOUNT */}

          <Section
            title="Account"
            icon={User}
          >

            <div className="space-y-4 px-5 py-5">

              <input
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-[#334155]/60 bg-[#0a0f1e]/60 px-4 text-sm text-white outline-none"
              />

              <input
                type="email"
                value={email}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-black/10 px-5 py-4 text-slate-400 outline-none"
              />

              <button
                onClick={
                  handleSaveProfile
                }
                className="flex h-11 w-full items-center justify-center rounded-xl bg-primary font-semibold text-white"
              >
                {saved
                  ? "Saved"
                  : "Save Changes"}
              </button>
            </div>
          </Section>

          {/* SECURITY */}

          <Section
            title="Security"
            icon={Shield}
          >

            <SettingRow
              label="Two-factor authentication"
              sub="Coming soon"
            >
              <Toggle
                value={twoFA}
                onChange={setTwoFA}
              />
            </SettingRow>

            <div className="px-5 py-5">

              <button
                onClick={() =>
                  setShowPasswordSection(
                    !showPasswordSection
                  )
                }
                className="flex items-center gap-2 text-sm font-semibold text-yellow-400"
              >
                Change Password

                <ChevronRight className="h-4 w-4" />
              </button>

              {showPasswordSection && (
                <div className="mt-5 space-y-4">

                  <input
                    type="password"
                    value={
                      currentPassword
                    }
                    onChange={(e) =>
                      setCurrentPassword(
                        e.target.value
                      )
                    }
                    placeholder="Current password"
                    className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-5 py-4 text-white outline-none"
                  />

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(
                        e.target.value
                      )
                    }
                    placeholder="New password"
                    className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-5 py-4 text-white outline-none"
                  />

                  {passwordError && (
                    <p className="text-sm text-red-500">
                      {passwordError}
                    </p>
                  )}

                  <button
                    onClick={
                      handlePasswordChange
                    }
                    disabled={
                      passwordLoading
                    }
                    className="w-full rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black"
                  >
                    {passwordLoading
                      ? "Updating..."
                      : passwordSaved
                      ? "Updated"
                      : "Update Password"}
                  </button>
                </div>
              )}
            </div>
          </Section>

          {/* DANGER */}

          <div className="overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/5">

            <div className="flex items-center gap-2.5 border-b border-red-500/20 px-5 py-4">

              <Trash2 className="h-4 w-4 text-red-400" />

              <h2 className="text-sm font-bold uppercase tracking-widest text-red-400">
                Danger zone
              </h2>
            </div>

            <div className="divide-y divide-red-500/10">

              <div className="flex items-center justify-between px-5 py-4">

                <div>
                  <p className="text-sm font-medium text-white">
                    Sign out
                  </p>
                </div>

                <button
                  onClick={
                    handleLogout
                  }
                  className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400"
                >
                  <LogOut className="h-3.5 w-3.5" />

                  Sign out
                </button>
              </div>

              <div className="flex items-center justify-between px-5 py-4">

                <div>
                  <p className="text-sm font-medium text-white">
                    Delete account
                  </p>
                </div>

                <button
                  onClick={
                    handleDeleteAccount
                  }
                  className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400"
                >
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