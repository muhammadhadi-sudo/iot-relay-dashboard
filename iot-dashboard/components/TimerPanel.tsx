"use client"

import { useState, useEffect, useCallback } from "react"
import type { ActiveTimer } from "@/types"
import { RELAY_NAMES } from "@/types"

type TimerPanelProps = {
  timers: ActiveTimer[]
  onSetTimer: (relayId: number, duration: number, endAction: "ON" | "OFF") => void
  onCancelTimer: (id: string) => void
  initialRelayId?: number
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function TimerPanel({ timers, onSetTimer, onCancelTimer, initialRelayId }: TimerPanelProps) {
  const [relayId, setRelayId] = useState(initialRelayId || 1)
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)
  const [endAction, setEndAction] = useState<"ON" | "OFF">("OFF")

  useEffect(() => {
    if (initialRelayId) setRelayId(initialRelayId)
  }, [initialRelayId])

  const handleSet = () => {
    const totalSeconds = minutes * 60 + seconds
    if (totalSeconds <= 0) return
    onSetTimer(relayId, totalSeconds, endAction)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--iot-text)" }}>Timer Relay</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--iot-muted)" }}>
          Atur countdown timer. Relay akan berubah status saat waktu habis.
        </p>
      </div>

      {/* Form set timer */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--iot-text)" }}>
          Set Timer Baru
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--iot-muted)" }}>Relay</label>
            <select value={relayId} onChange={e => setRelayId(Number(e.target.value))} className="select-field">
              {RELAY_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--iot-muted)" }}>Menit</label>
            <input
              type="number"
              min={0}
              max={999}
              value={minutes}
              onChange={e => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              className="input-field font-mono text-center"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--iot-muted)" }}>Detik</label>
            <input
              type="number"
              min={0}
              max={59}
              value={seconds}
              onChange={e => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              className="input-field font-mono text-center"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--iot-muted)" }}>Aksi Saat Habis</label>
            <select value={endAction} onChange={e => setEndAction(e.target.value as "ON" | "OFF")} className="select-field">
              <option value="OFF">Matikan (OFF)</option>
              <option value="ON">Nyalakan (ON)</option>
            </select>
          </div>

          <div>
            <button
              onClick={handleSet}
              disabled={minutes * 60 + seconds <= 0}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mulai
            </button>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <span className="text-xs font-medium self-center mr-1" style={{ color: "var(--iot-muted)" }}>Preset:</span>
          {[
            { label: "1m", m: 1, s: 0 },
            { label: "5m", m: 5, s: 0 },
            { label: "15m", m: 15, s: 0 },
            { label: "30m", m: 30, s: 0 },
            { label: "1j", m: 60, s: 0 },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => { setMinutes(preset.m); setSeconds(preset.s) }}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: "var(--iot-bg)",
                color: "var(--iot-muted)",
                border: "1px solid var(--iot-border)",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active timers */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--iot-text)" }}>
          Timer Aktif ({timers.length})
        </h3>

        {timers.length === 0 ? (
          <div className="glass-card p-8 flex flex-col items-center" style={{ color: "var(--iot-muted)" }}>
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">Tidak ada timer aktif</p>
          </div>
        ) : (
          timers.map(timer => {
            const pct = (timer.remaining / timer.duration) * 100
            const isWarning = pct < 20

            return (
              <div key={timer.id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--iot-text)" }}>
                      {timer.relayName}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        background: "color-mix(in srgb, var(--iot-warning) 15%, transparent)",
                        color: "var(--iot-warning)",
                      }}
                    >
                      akan {timer.endAction}
                    </span>
                  </div>

                  <button
                    onClick={() => onCancelTimer(timer.id)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[var(--iot-surface-hover)]"
                    style={{ color: "var(--iot-danger)" }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Countdown display */}
                <div className="flex items-center gap-3">
                  <span
                    className="text-3xl font-bold font-mono"
                    style={{
                      color: isWarning ? "var(--iot-danger)" : "var(--iot-text)",
                    }}
                  >
                    {formatDuration(timer.remaining)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "var(--iot-border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{
                      width: `${pct}%`,
                      background: isWarning
                        ? "var(--iot-danger)"
                        : pct < 50
                          ? "var(--iot-warning)"
                          : "var(--iot-accent)",
                    }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}