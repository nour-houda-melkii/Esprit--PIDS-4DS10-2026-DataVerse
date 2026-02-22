"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { useTutorial } from "@/lib/tutorial-context"
import { cn } from "@/lib/utils"
import {
  Menu, X, LogOut, Play, LayoutDashboard,
  UserCircle, Settings, ChevronDown, TrendingUp,
} from "lucide-react"

const navLinks = [
  { href: "/",                  label: "Home"     },
  { href: "/platform/overview", label: "Platform" },
  { href: "/tutorial",          label: "Tutorial" },
]

export function FloatingNavbar() {
  const [isScrolled, setIsScrolled]         = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname  = usePathname()
  const router    = useRouter()
  const { user, isAuthenticated, logout } = useAuth()
  const { startTutorial } = useTutorial()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const isLandingPage = pathname === "/"

  const handleLogout = async () => {
    await logout()
    router.push("/")
    router.refresh()
  }

  const roleColor = user?.role === "trader" ? "from-primary to-secondary" : "from-emerald-500 to-teal-500"

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled || !isLandingPage
          ? "bg-[#0f172a]/95 backdrop-blur-md border-b border-[#334155]/50 shadow-lg"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
            <span className="text-lg font-bold text-primary-foreground">FX</span>
          </div>
          <span className="text-xl font-bold text-foreground">AlphaLab</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === link.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          {isLandingPage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={startTutorial}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Play className="h-4 w-4" />
              Start Tour
            </Button>
          )}

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-xl border border-[#334155]/60 bg-[#1e293b]/40 px-3 py-2 text-sm transition-all hover:border-[#334155] hover:bg-[#1e293b]/70 focus:outline-none">
                  {/* Avatar */}
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${roleColor} text-[11px] font-black text-white shadow-sm`}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden text-left lg:block">
                    <p className="text-xs font-semibold text-foreground leading-none">{user?.name}</p>
                    <p className="mt-0.5 text-[10px] capitalize text-muted-foreground leading-none">{user?.role}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border border-[#334155]/60 bg-[#0f172a]/95 p-1.5 backdrop-blur-xl shadow-2xl shadow-black/50"
              >
                {/* User info header */}
                <div className="mb-1 rounded-lg bg-[#1e293b]/40 px-3 py-2.5">
                  <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-bold capitalize text-primary">
                      {user?.role} · {user?.portfolios?.length ?? 0} portfolio{(user?.portfolios?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <DropdownMenuSeparator className="bg-[#334155]/40" />

                <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm text-muted-foreground focus:bg-[#1e293b]/60 focus:text-foreground cursor-pointer">
                  <Link href="/platform/overview" className="flex items-center gap-2.5">
                    <LayoutDashboard className="h-4 w-4" />
                    Platform
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm text-muted-foreground focus:bg-[#1e293b]/60 focus:text-foreground cursor-pointer">
                  <Link href="/profile" className="flex items-center gap-2.5">
                    <UserCircle className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm text-muted-foreground focus:bg-[#1e293b]/60 focus:text-foreground cursor-pointer">
                  <Link href="/settings" className="flex items-center gap-2.5">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-[#334155]/40" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-sm text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                >
                  <LogOut className="mr-2.5 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </nav>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-[#334155]/50 bg-[#0f172a]/95 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-4 px-6 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "text-sm font-medium transition-colors",
                  pathname === link.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated && (
              <>
                <Link href="/profile"   onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><UserCircle className="h-4 w-4" />Profile</Link>
                <Link href="/settings"  onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Settings  className="h-4 w-4" />Settings</Link>
              </>
            )}

            {isLandingPage && (
              <button onClick={() => { setIsMobileMenuOpen(false); startTutorial() }} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <Play className="h-4 w-4" />Start Tour
              </button>
            )}

            <div className="flex gap-2 pt-2">
              {isAuthenticated ? (
                <Button variant="outline" size="sm" onClick={() => { handleLogout(); setIsMobileMenuOpen(false) }} className="flex-1 gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10">
                  <LogOut className="h-4 w-4" />Sign out
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" asChild className="flex-1 bg-transparent"><Link href="/login">Login</Link></Button>
                  <Button size="sm" asChild className="flex-1"><Link href="/signup">Sign Up</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}