"use client"

import {
  useEffect,
  useState,
} from "react"

import { useRouter } from "next/navigation"

import { FloatingNavbar } from "@/components/floating-navbar"

import { useAuth } from "@/lib/auth-context"

import {
  User,
  Shield,
  ChevronRight,
  Trash2,
} from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()

  const {
    user,
    loading,
    isAuthenticated,
    logout,
    setUser,
  } = useAuth()

  // STATES

  const [name, setName] =
    useState("")

  const [saved, setSaved] =
    useState(false)

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("")

  const [
    newPassword,
    setNewPassword,
  ] = useState("")

  const [
    passwordLoading,
    setPasswordLoading,
  ] = useState(false)

  const [
    passwordSaved,
    setPasswordSaved,
  ] = useState(false)

  const [passwordError,
  setPasswordError] =
    useState("")

  const [
    showPasswordSection,
    setShowPasswordSection,
  ] = useState(false)

  // REDIRECT

  useEffect(() => {
    if (
      !loading &&
      !isAuthenticated
    ) {
      router.push("/login")
    }
  }, [
    loading,
    isAuthenticated,
    router,
  ])

  // LOAD USER

  useEffect(() => {
    if (user) {
      setName(user.name || "")
    }
  }, [user])

  if (loading) return null

  if (!isAuthenticated || !user)
    return null

  // UPDATE PROFILE

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
                email: user.email,
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

  // CHANGE PASSWORD

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
                email: user.email,
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
          error.message ||
            "Failed to update password"
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
          "Are you sure you want to permanently delete your account?"
        )

      if (!confirmDelete) return

      try {
        const response =
          await fetch(
            "/api/profile/delete",
            {
              method: "DELETE",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                email: user.email,
              }),
            }
          )

        if (!response.ok) {
          throw new Error(
            "Delete failed"
          )
        }

        localStorage.removeItem(
          "alphalab-user"
        )

        router.push("/signup")
      } catch (error) {
        console.error(error)
      }
    }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <FloatingNavbar />

      <main className="mx-auto max-w-4xl px-6 py-24">
        {/* HEADER */}

        <div className="mb-10">
          <h1 className="text-5xl font-black tracking-tight text-white">
            Settings
          </h1>

          <p className="mt-2 text-lg text-yellow-400">
            Manage your account
            settings
          </p>
        </div>

        {/* ACCOUNT */}

        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0B1120]/95 shadow-2xl">
          {/* TITLE */}

          <div className="border-b border-white/10 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
                <User size={28} />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white">
                  Account
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Update your account
                  information
                </p>
              </div>
            </div>
          </div>

          {/* CONTENT */}

          <div className="space-y-6 p-8">
            {/* NAME */}

            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-5 py-4 text-white outline-none transition focus:border-yellow-500"
              />
            </div>

            {/* EMAIL */}

            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
                Email
              </label>

              <input
                type="email"
                value={user.email}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-black/10 px-5 py-4 text-slate-400 outline-none"
              />
            </div>

            {/* ROLE */}

            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
                Account Type
              </label>

              <div className="rounded-2xl border border-white/10 bg-black/10 px-5 py-4 text-white">
                {user.role}
              </div>
            </div>

            {/* BUTTON */}

            <button
              onClick={
                handleSaveProfile
              }
              className="w-full rounded-2xl bg-yellow-400 px-6 py-4 text-lg font-black text-black transition hover:bg-yellow-300"
            >
              {saved
                ? "Saved Successfully"
                : "Save Changes"}
            </button>
          </div>
        </section>

        {/* PASSWORD */}

        <section className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-[#0B1120]/95 shadow-2xl">
          <button
            type="button"
            onClick={() =>
              setShowPasswordSection(
                !showPasswordSection
              )
            }
            className="flex w-full items-center justify-between px-5 py-4 transition hover:bg-white/5"
          >
            <div className="text-left">
              <p className="text-sm font-medium text-white">
                Change password
              </p>

              <p className="mt-0.5 text-xs text-yellow-400">
                Update your login
                password
              </p>
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-yellow-400 transition-colors hover:text-yellow-300">
              Update

              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </button>

          {showPasswordSection && (
            <div className="border-t border-white/10 p-8">
              {/* CURRENT */}

              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
                  Current Password
                </label>

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
                  className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-5 py-4 text-white outline-none transition focus:border-yellow-500"
                  placeholder="Enter current password"
                />

                {passwordError && (
                  <p className="mt-2 text-sm font-medium text-red-500">
                    {passwordError}
                  </p>
                )}
              </div>

              {/* NEW */}

              <div className="mt-5">
                <label className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
                  New Password
                </label>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0A1020] px-5 py-4 text-white outline-none transition focus:border-yellow-500"
                  placeholder="Enter new password"
                />
              </div>

              {/* BUTTON */}

              <button
                type="button"
                onClick={
                  handlePasswordChange
                }
                disabled={
                  passwordLoading
                }
                className="mt-6 w-full rounded-2xl bg-yellow-400 px-6 py-4 text-lg font-black text-black transition hover:bg-yellow-300 disabled:opacity-50"
              >
                {passwordLoading
                  ? "Updating..."
                  : passwordSaved
                  ? "Updated Successfully"
                  : "Update Password"}
              </button>
            </div>
          )}
        </section>

        {/* DELETE */}

        <section className="mt-8 overflow-hidden rounded-[32px] border border-red-500/20 bg-red-500/5 shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-white">
                Delete account
              </p>

              <p className="mt-0.5 text-xs text-red-300">
                Permanently delete your
                account and all data
              </p>
            </div>

            <button
              onClick={
                handleDeleteAccount
              }
              className="flex items-center gap-2 text-xs font-semibold text-red-400 transition hover:text-red-300"
            >
              Delete

              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* LOGOUT */}

        <button
          onClick={logout}
          className="mt-8 w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-lg font-black text-white transition hover:bg-white/10"
        >
          Logout
        </button>
      </main>
    </div>
  )
}