import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "IoT Relay Control System",
  description: "Dashboard monitoring dan kontrol relay berbasis ESP8266 dan Next.js",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-grid">
        {children}
      </body>
    </html>
  )
}