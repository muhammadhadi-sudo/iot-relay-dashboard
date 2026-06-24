"use client"

import type { ViewType } from "@/types"

type SidebarProps = {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  isOpen: boolean
  onClose: () => void
}

const NAV_ITEMS: { key: ViewType; label: string; icon: JSX.Element }[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    key: "history",
    label: "History",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "scheduler",
    label: "Scheduler",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: "timer",
    label: "Timer",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export default function Sidebar({ activeView, onViewChange, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay untuk mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-60 flex flex-col
          border-r transition-transform duration-300 ease-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "var(--iot-surface)",
          borderColor: "var(--iot-border)",
        }}
      >
        {/* Header sidebar — hanya mobile */}
        <div className="h-16 flex items-center justify-between px-4 lg:hidden border-b" style={{ borderColor: "var(--iot-border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--iot-text)" }}>Menu</span>
          <button onClick={onClose} style={{ color: "var(--iot-muted)" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigasi */}
        <nav className="flex-1 p-3 space-y-1 mt-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => {
                onViewChange(item.key)
                onClose()
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
              `}
              style={{
                background: activeView === item.key ? "color-mix(in srgb, var(--iot-accent) 12%, transparent)" : "transparent",
                color: activeView === item.key ? "var(--iot-accent)" : "var(--iot-muted)",
                borderLeft: activeView === item.key ? "3px solid var(--iot-accent)" : "3px solid transparent",
              }}
              onMouseEnter={e => {
                if (activeView !== item.key) {
                  e.currentTarget.style.background = "var(--iot-surface-hover)"
                  e.currentTarget.style.color = "var(--iot-text)"
                }
              }}
              onMouseLeave={e => {
                if (activeView !== item.key) {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.color = "var(--iot-muted)"
                }
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t" style={{ borderColor: "var(--iot-border)" }}>
          <p className="text-xs" style={{ color: "var(--iot-muted)" }}>
            IoT Relay Control v1.0
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--iot-border)" }}>
            ESP8266 + Next.js
          </p>
        </div>
      </aside>
    </>
  )
}