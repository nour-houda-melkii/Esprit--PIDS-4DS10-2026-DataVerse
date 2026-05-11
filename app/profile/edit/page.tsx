"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { FloatingNavbar } from "@/components/floating-navbar"
import { useAuth } from "@/lib/auth-context"

import {
  User,
  Mail,
  Camera,
  Save,
} from "lucide-react"

export default function EditProfilePage() {
  const router = useRouter()

  const { user, isAuthenticated } =
    useAuth()

  const [loading, setLoading] =
    useState(false)

  const [formData, setFormData] =
    useState({
      name: "",
      email: "",
    })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (user) {
      setFormData({
        name: user?.name || "",
        email: user?.email || "",
      })
    }
  }, [user])

  if (!isAuthenticated) return null

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    })
  }

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    try {
      setLoading(true)

      const response = await fetch(
        "/api/profile/update",
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            formData
          ),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Update failed"
        )
      }

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      )

      alert(
        "Profile updated successfully"
      )

      router.push("/profile")

      router.refresh()
    } catch (error) {
      console.error(error)

      alert(
        "Error updating profile"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <FloatingNavbar />

      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-yellow-500/10 blur-[140px]" />

        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[140px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-4xl px-5 py-24">
        <section className="overflow-hidden rounded-[36px] border border-yellow-500/10 bg-[#081121]/90 shadow-[0_0_100px_rgba(0,0,0,0.45)]">
          {/* HEADER */}

          <div className="relative h-52 bg-gradient-to-r from-yellow-500/20 via-yellow-400/5 to-transparent">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.15),transparent_40%)]" />
          </div>

          {/* CONTENT */}

          <div className="relative px-8 pb-10">
            {/* AVATAR */}

            <div className="-mt-20 flex flex-col items-center">
              <div className="relative">
                <div className="flex h-40 w-40 items-center justify-center rounded-full border-4 border-yellow-400 bg-[#020617] text-6xl font-black text-yellow-400 shadow-[0_0_60px_rgba(250,204,21,0.25)]">
                  {formData.name
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>

                <button className="absolute bottom-2 right-2 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg transition hover:scale-105">
                  <Camera size={20} />
                </button>
              </div>

              <h1 className="mt-6 text-center text-5xl font-black">
                Edit Profile
              </h1>

              <p className="mt-2 text-slate-400">
                Update your account
                information
              </p>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="mt-14 space-y-6"
            >
              <div className="grid grid-cols-1 gap-6">
                {/* NAME */}

                <InputField
                  icon={<User />}
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={
                    handleChange
                  }
                />

                {/* EMAIL */}

                <InputField
                  icon={<Mail />}
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={
                    handleChange
                  }
                />
              </div>

              {/* SAVE BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-3xl bg-yellow-400 px-6 py-5 text-lg font-black text-black transition hover:bg-yellow-300 disabled:opacity-50"
              >
                <Save size={22} />

                {loading
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}

function InputField({
  icon,
  label,
  name,
  value,
  onChange,
  type = "text",
}: {
  icon: React.ReactNode
  label: string
  name: string
  value: string
  type?: string
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void
}) {
  return (
    <div>
      <label className="mb-3 block text-sm font-bold text-slate-400">
        {label}
      </label>

      <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-black/20 px-5 py-4">
        <div className="text-yellow-400">
          {icon}
        </div>

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full bg-transparent text-white outline-none"
          placeholder={label}
        />
      </div>
    </div>
  )
}