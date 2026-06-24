"use client"

import type { Relay } from "@/types"

type NavbarProps = {
  connected: boolean
  relays: Relay[]
  onToggleAll: (status: boolean) => void
  onToggleDark: () => void
  isDark: boolean
  onMenuClick: () => void
  loading: boolean
}

export default function Navbar({
  connected,
  relays,
  onToggleAll,
  onToggleDark,
  isDark,
  onMenuClick,
  loading,
}: NavbarProps) {
  const allOn = relays.every(r => r.status)
  const allOff = relays.every(r => !r.status)

  return (
    <header
      className="h-16 flex items-center justify-between px-4 lg:px-6 border-b"
      style={{
        background: "var(--iot-surface)",
        borderColor: "var(--iot-border)",
      }}
    >
      {/* Kiri: Hamburger + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg transition-colors hover:bg-[var(--iot-surface-hover)]"
          style={{ color: "var(--iot-muted)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Logo icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--iot-accent)" }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight" style={{ color: "var(--iot-text)" }}>
              IoT Relay Control
            </h1>
            <p className="text-xs leading-tight" style={{ color: "var(--iot-muted)" }}>
              ESP8266 Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Tengah: All ON / All OFF */}
      <div className="hidden sm:flex items-center gap-2">
        <button
          onClick={() => onToggleAll(true)}
          disabled={loading || !connected || allOn}
          className="btn-primary flex items-center gap-1.5 text-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          All ON
        </button>
        <button
          onClick={() => onToggleAll(false)}
          disabled={loading || !connected || allOff}
          className="btn-danger flex items-center gap-1.5 text-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          All OFF
        </button>
      </div>

      {/* Kanan: Status + Dark Mode */}
      <div className="flex items-center gap-3">
        {/* Status koneksi */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: connected ? "color-mix(in srgb, var(--iot-accent) 10%, transparent)" : "color-mix(in srgb, var(--iot-danger) 10%, transparent)",
            color: connected ? "var(--iot-accent)" : "var(--iot-danger)",
            border: `1px solid ${connected ? "color-mix(in srgb, var(--iot-accent) 20%, transparent)" : "color-mix(in srgb, var(--iot-danger) 20%, transparent)"}`,
          }}
        >
          <div className={`pulse-dot ${connected ? "online" : "offline"}`} />
          {connected ? "Terhubung" : "Terputus"}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className="p-2 rounded-lg transition-colors hover:bg-[var(--iot-surface-hover)]"
          style={{ color: "var(--iot-muted)" }}
          title={isDark ? "Light Mode" : "Dark Mode"}
        >
          {isDark ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}