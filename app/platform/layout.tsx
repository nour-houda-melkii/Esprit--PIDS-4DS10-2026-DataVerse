import { PlatformBottomNav } from "./platform-bottom-nav"

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen">
      {children}
      {/* Bottom nav floats above all platform pages */}
      <PlatformBottomNav />
      {/* Extra bottom padding so content isn't hidden behind nav */}
      <div className="h-28" />
    </div>
  )
}