"use client"

import { useState } from "react"
import type { HistoryRecord } from "@/types"
import { RELAY_NAMES } from "@/types"

type HistoryPanelProps = {
  history: HistoryRecord[]
  loading: boolean
  onExport: () => void
  onBackup: () => void
  onClear: () => void
}

export default function HistoryPanel({ history, loading, onExport, onBackup, onClear }: HistoryPanelProps) {
  const [filter, setFilter] = useState<number | null>(null)

  const filtered = filter === null
    ? history
    : history.filter(h => h.relayId === filter)

  // Tampilkan terbaru di atas
  const sorted = [...filtered].reverse()

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header + Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--iot-text)" }}>
            Riwayat Aktivitas
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--iot-muted)" }}>
            {history.length} total record
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter buttons */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--iot-bg)", border: "1px solid var(--iot-border)" }}>
            <button
              onClick={() => setFilter(null)}
              className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                background: filter === null ? "var(--iot-accent)" : "transparent",
                color: filter === null ? "white" : "var(--iot-muted)",
              }}
            >
              All
            </button>
            {[1, 2, 3, 4].map(id => (
              <button
                key={id}
                onClick={() => setFilter(filter === id ? null : id)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                style={{
                  background: filter === id ? "var(--iot-accent)" : "transparent",
                  color: filter === id ? "white" : "var(--iot-muted)",
                }}
              >
                R{id}
              </button>
            ))}
          </div>

          <button onClick={onExport} className="btn-ghost text-xs flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
          <button onClick={onBackup} className="btn-ghost text-xs flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Backup
          </button>
          <button onClick={onClear} className="btn-ghost text-xs" style={{ color: "var(--iot-danger)", borderColor: "color-mix(in srgb, var(--iot-danger) 30%, transparent)" }}>
            Clear
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="glass-card overflow-hidden">
        {/* Table header */}
        <div
          className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b"
          style={{ color: "var(--iot-muted)", borderColor: "var(--iot-border)", background: "var(--iot-bg)" }}
        >
          <div className="col-span-3">Waktu</div>
          <div className="col-span-3">Relay</div>
          <div className="col-span-3">Aksi</div>
          <div className="col-span-3 text-right">Detail</div>
        </div>

        {/* Table body */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--iot-accent)", borderTopColor: "transparent" }}
              />
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--iot-muted)" }}>
              <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">Belum ada riwayat</p>
            </div>
          ) : (
            sorted.map((record, idx) => {
              const isOn = record.action.includes("ON")
              const isAll = record.relayId === 0
              const relayName = isAll ? "Semua Relay" : RELAY_NAMES[record.relayId - 1] || `Relay ${record.relayId}`
              const time = new Date(record.timestamp)
              const timeStr = time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              const dateStr = time.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })

              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b transition-colors"
                  style={{
                    borderColor: "var(--iot-border)",
                    color: "var(--iot-text)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--iot-surface-hover)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                >
                  <div className="col-span-3">
                    <span className="font-mono text-xs">{timeStr}</span>
                    <br />
                    <span className="text-xs" style={{ color: "var(--iot-muted)" }}>{dateStr}</span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span className="text-xs font-medium">{relayName}</span>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: isOn ? "color-mix(in srgb, var(--iot-accent) 15%, transparent)" : "color-mix(in srgb, var(--iot-danger) 15%, transparent)",
                        color: isOn ? "var(--iot-accent)" : "var(--iot-danger)",
                      }}
                    >
                      {record.action}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center justify-end">
                    <span className="text-xs" style={{ color: "var(--iot-muted)" }}>
                      {isAll ? "Bulk action" : `ID: ${record.relayId}`}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}