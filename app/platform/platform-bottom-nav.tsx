"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Newspaper, Sparkles, History } from "lucide-react"

const NAV_ITEMS = [
  { href: "/platform/overview",        label: "Feed",            icon: Newspaper, live: true  },
  { href: "/platform/recommendations", label: "Recommendations", icon: Sparkles,  live: true },
  { href: "/platform/history",         label: "History",         icon: History,   live:  true },
]

export function PlatformBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4">
      <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-[#0a0f1e]/85 px-2 py-2 shadow-2xl shadow-black/70 backdrop-blur-2xl">
        {NAV_ITEMS.map(({ href, label, icon: Icon, live }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={live ? href : "#"}
              aria-disabled={!live}
              className={`relative flex flex-col items-center gap-1 rounded-xl px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest transition-all duration-200 select-none
                ${active
                  ? "bg-primary/15 text-primary"
                  : live
                    ? "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    : "cursor-not-allowed text-muted-foreground/30"
                }`}
            >
              {/* Active ring */}
              {active && (
                <span className="absolute inset-0 rounded-xl ring-1 ring-primary/40" />
              )}

              {/* Active dot above icon */}
              {active && (
                <span className="absolute -top-0.5 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-primary" />
              )}

              <Icon className={`h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
              <span>{label}</span>

              {/* Coming soon badge */}
              {active && (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#334155] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Soon
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}