"use client"

import { useState, useEffect } from "react"
import type { Schedule } from "@/types"
import { DAY_NAMES, RELAY_NAMES } from "@/types"

type SchedulerPanelProps = {
  schedules: Schedule[]
  onAdd: (schedule: Omit<Schedule, "id" | "enabled">) => void
  onDelete: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}

export default function SchedulerPanel({ schedules, onAdd, onDelete, onToggle }: SchedulerPanelProps) {
  const [relayId, setRelayId] = useState(1)
  const [action, setAction] = useState<"ON" | "OFF">("ON")
  const [time, setTime] = useState("08:00")
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])

  const toggleDay = (day: number) => {
    setDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const handleAdd = () => {
    if (days.length === 0) return
    onAdd({ relayId, action, time, days })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--iot-text)" }}>Scheduler</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--iot-muted)" }}>
          Atur jadwal otomatis untuk relay. Scheduler dicek setiap menit.
        </p>
      </div>

      {/* Form tambah jadwal */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--iot-text)" }}>
          Tambah Jadwal Baru
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Relay */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--iot-muted)" }}>
              Relay
            </label>
            <select
              value={relayId}
              onChange={e => setRelayId(Number(e.target.value))}
              className="select-field"
            >
              {RELAY_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>

          {/* Aksi */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--iot-muted)" }}>
              Aksi
            </label>
            <select
              value={action}
              onChange={e => setAction(e.target.value as "ON" | "OFF")}
              className="select-field"
            >
              <option value="ON">Nyala (ON)</option>
              <option value="OFF">Mati (OFF)</option>
            </select>
          </div>

          {/* Waktu */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--iot-muted)" }}>
              Waktu
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Submit */}
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={days.length === 0}
              className="btn-primary w-full"
            >
              Simpan Jadwal
            </button>
          </div>
        </div>

        {/* Hari */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--iot-muted)" }}>
            Hari Aktif
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {DAY_NAMES.map((name, idx) => (
              <button
                key={idx}
                onClick={() => toggleDay(idx)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                style={{
                  background: days.includes(idx) ? "var(--iot-accent)" : "var(--iot-bg)",
                  color: days.includes(idx) ? "white" : "var(--iot-muted)",
                  border: `1px solid ${days.includes(idx) ? "var(--iot-accent)" : "var(--iot-border)"}`,
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Daftar jadwal */}
      <div className="space-y-2">
        {schedules.length === 0 ? (
          <div className="glass-card p-8 flex flex-col items-center" style={{ color: "var(--iot-muted)" }}>
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Belum ada jadwal</p>
          </div>
        ) : (
          schedules.map(schedule => {
            const isOn = schedule.action === "ON"
            return (
              <div key={schedule.id} className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Waktu besar */}
                  <div className="text-center min-w-[56px]">
                    <div className="text-lg font-bold font-mono" style={{ color: "var(--iot-text)" }}>
                      {schedule.time}
                    </div>
                  </div>

                  <div className="w-px h-10 hidden sm:block" style={{ background: "var(--iot-border)" }} />

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium" style={{ color: "var(--iot-text)" }}>
                        {RELAY_NAMES[schedule.relayId - 1]}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: isOn ? "color-mix(in srgb, var(--iot-accent) 15%, transparent)" : "color-mix(in srgb, var(--iot-danger) 15%, transparent)",
                          color: isOn ? "var(--iot-accent)" : "var(--iot-danger)",
                        }}
                      >
                        {schedule.action}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {DAY_NAMES.map((name, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background: schedule.days.includes(idx) ? "color-mix(in srgb, var(--iot-accent) 10%, transparent)" : "transparent",
                            color: schedule.days.includes(idx) ? "var(--iot-accent)" : "var(--iot-border)",
                          }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                    {schedule.lastTriggered && (
                      <p className="text-[10px] mt-1" style={{ color: "var(--iot-border)" }}>
                        Terakhir: {new Date(schedule.lastTriggered).toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle enabled */}
                  <button
                    onClick={() => onToggle(schedule.id, !schedule.enabled)}
                    className="group"
                  >
                    <div className={`toggle-track ${schedule.enabled ? "active" : ""}`} style={{ width: "40px", height: "22px" }}>
                      <div className="toggle-thumb" style={{ width: "16px", height: "16px", top: "3px", left: "3px" }}
                        {...(schedule.enabled ? { style: { width: "16px", height: "16px", top: "3px", left: "3px", transform: "translateX(18px)" } } : {})}
                      />
                    </div>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDelete(schedule.id)}
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--iot-surface-hover)]"
                    style={{ color: "var(--iot-danger)" }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}