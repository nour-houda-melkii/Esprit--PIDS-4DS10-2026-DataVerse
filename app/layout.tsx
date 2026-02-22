import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { TutorialProvider } from "@/lib/tutorial-context"
import { FloatingNavbar } from "@/components/floating-navbar"
import { TutorialWizard } from "@/components/tutorial-wizard"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "FX-AlphaLab | Multi-Agent AI Forex Analysis Platform",
  description:
    "Experience the future of forex trading with our multi-agent AI system. Five specialized AI agents work together to provide comprehensive, explainable market analysis.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <TutorialProvider>
            <div className="min-h-screen bg-background">
              <FloatingNavbar />
              <TutorialWizard />
              {children}
            </div>
          </TutorialProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
