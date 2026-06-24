"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ToastProvider, useToast } from "@/components/Toast"
import Navbar from "@/components/Navbar"
import Sidebar from "@/components/Sidebar"
import RelayCard from "@/components/RelayCard"
import SensorPanel from "@/components/SensorPanel"
import HistoryPanel from "@/components/HistoryPanel"
import SchedulerPanel from "@/components/SchedulerPanel"
import TimerPanel from "@/components/TimerPanel"

import { fetchRelays, toggleRelay, toggleAllRelays, fetchSensors, checkConnection } from "@/services/relay"
import { fetchHistory, addHistory, backupHistory, exportHistory } from "@/services/history"

import type { Relay, SensorData, HistoryRecord, Schedule, ActiveTimer, ViewType } from "@/types"
import { RELAY_NAMES } from "@/types"

const POLL_INTERVAL = parseInt(process.env.NEXT_PUBLIC_POLL_INTERVAL || "2000", 10)

// ============================================
// Komponen utama dashboard (dibungkus ToastProvider di bawah)
// ============================================
function DashboardContent() {
  const { addToast } = useToast()

  // --- State ---
  const [activeView, setActiveView] = useState<ViewType>("dashboard")
  const [isDark, setIsDark] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Data dari ESP8266
  const [relays, setRelays] = useState<Relay[]>([
    { id: 1, name: "Relay 1", status: false },
    { id: 2, name: "Relay 2", status: false },
    { id: 3, name: "Relay 3", status: false },
    { id: 4, name: "Relay 4", status: false },
  ])
  const [sensors, setSensors] = useState<SensorData | null>(null)
  const [connected, setConnected] = useState(false)

  // Data lokal
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [timers, setTimers] = useState<ActiveTimer[]>([])

  // Loading states
  const [relayLoading, setRelayLoading] = useState<number | "all" | null>(null)
  const [relaysLoading, setRelaysLoading] = useState(false)
  const [sensorsLoading, setSensorsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [schedulesLoading, setSchedulesLoading] = useState(false)

  // Timer relay yang dipilih dari dashboard (untuk buka view timer)
  const [timerRelayId, setTimerRelayId] = useState<number | undefined>(undefined)

  // Ref untuk mencegah race condition
  const pollingRef = useRef(true)

  // --- Fetch functions ---
  const loadRelays = useCallback(async () => {
    try {
      setRelaysLoading(true)
      const data = await fetchRelays()
      setRelays(data)
      if (!connected) setConnected(true)
    } catch {
      setConnected(false)
    } finally {
      setRelaysLoading(false)
    }
  }, [connected])

  const loadSensors = useCallback(async () => {
    try {
      setSensorsLoading(true)
      const data = await fetchSensors()
      setSensors(data)
    } catch {
      // Sensor gagal tidak perlu disconnect
    } finally {
      setSensorsLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      const data = await fetchHistory()
      setHistory(data)
    } catch {
      addToast("Gagal memuat history", "error")
    } finally {
      setHistoryLoading(false)
    }
  }, [addToast])

  const loadSchedules = useCallback(async () => {
    try {
      setSchedulesLoading(true)
      const res = await fetch("/api/schedules")
      if (res.ok) setSchedules(await res.json())
    } catch {
      // silent
    } finally {
      setSchedulesLoading(false)
    }
  }, [])

  // --- Actions ---
  const handleToggleRelay = useCallback(async (id: number, status: boolean) => {
    try {
      setRelayLoading(id)
      await toggleRelay(id, status)
      setRelays(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      await addHistory({ relayId: id, action: status ? "ON" : "OFF" })
      addToast(`${RELAY_NAMES[id - 1]} ${status ? "nyala" : "mati"}`, "success")
      loadHistory()
    } catch {
      addToast(`Gagal mengontrol ${RELAY_NAMES[id - 1]}`, "error")
    } finally {
      setRelayLoading(null)
    }
  }, [addToast, loadHistory])

  const handleToggleAll = useCallback(async (status: boolean) => {
    try {
      setRelayLoading("all")
      const result = await toggleAllRelays(status)
      setRelays(result.relays)
      await addHistory({ relayId: 0, action: status ? "ALL ON" : "ALL OFF" })
      addToast(status ? "Semua relay dinyalakan" : "Semua relay dimatikan", "success")
      loadHistory()
    } catch {
      addToast("Gagal mengontrol semua relay", "error")
    } finally {
      setRelayLoading(null)
    }
  }, [addToast, loadHistory])

  const handleExportHistory = useCallback(() => {
    exportHistory(history)
    addToast("History berhasil di-export", "success")
  }, [history, addToast])

  const handleBackupHistory = useCallback(async () => {
    try {
      await backupHistory()
      addToast("Backup berhasil dibuat", "success")
    } catch {
      addToast("Gagal membuat backup", "error")
    }
  }, [addToast])

  const handleClearHistory = useCallback(async () => {
    try {
      await fetch("/api/history", { method: "DELETE" })
      setHistory([])
      addToast("History dikosongkan", "info")
    } catch {
      addToast("Gagal mengosongkan history", "error")
    }
  }, [addToast])

  // --- Schedule actions ---
  const handleAddSchedule = useCallback(async (schedule: Omit<Schedule, "id" | "enabled">) => {
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      })
      if (res.ok) {
        const newSchedule = await res.json()
        setSchedules(prev => [...prev, newSchedule])
        addToast("Jadwal berhasil ditambahkan", "success")
      }
    } catch {
      addToast("Gagal menambah jadwal", "error")
    }
  }, [addToast])

  const handleDeleteSchedule = useCallback(async (id: string) => {
    try {
      await fetch(`/api/schedules?id=${id}`, { method: "DELETE" })
      setSchedules(prev => prev.filter(s => s.id !== id))
      addToast("Jadwal dihapus", "info")
    } catch {
      addToast("Gagal menghapus jadwal", "error")
    }
  }, [addToast])

  const handleToggleSchedule = useCallback(async (id: string, enabled: boolean) => {
    try {
      const res = await fetch("/api/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      })
      if (res.ok) {
        const updated = await res.json()
        setSchedules(prev => prev.map(s => s.id === id ? updated : s))
      }
    } catch {
      addToast("Gagal update jadwal", "error")
    }
  }, [addToast])

  // --- Timer actions ---
  const handleSetTimer = useCallback((relayId: number, duration: number, endAction: "ON" | "OFF") => {
    const newTimer: ActiveTimer = {
      id: `timer_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      relayId,
      relayName: RELAY_NAMES[relayId - 1],
      duration,
      remaining: duration,
      endAction,
      startTime: Date.now(),
    }
    setTimers(prev => [...prev, newTimer])
    addToast(`Timer dimulai: ${RELAY_NAMES[relayId - 1]} akan ${endAction} dalam ${Math.floor(duration / 60)}m ${duration % 60}s`, "info")
  }, [addToast])

  const handleCancelTimer = useCallback((id: string) => {
    setTimers(prev => prev.filter(t => t.id !== id))
    addToast("Timer dibatalkan", "info")
  }, [addToast])

  const handleRelaySetTimer = useCallback((relayId: number) => {
    setTimerRelayId(relayId)
    setActiveView("timer")
    setSidebarOpen(false)
  }, [])

  // --- Polling: data dari ESP8266 setiap 2 detik ---
  useEffect(() => {
    pollingRef.current = true

    const poll = async () => {
      if (!pollingRef.current) return
      await loadRelays()
      await loadSensors()
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => {
      pollingRef.current = false
      clearInterval(interval)
    }
  }, [loadRelays, loadSensors])

  // --- Load history & schedules saat pertama kali dan saat view berubah ---
  useEffect(() => {
    loadHistory()
    loadSchedules()
  }, [loadHistory, loadSchedules])

  // --- Timer countdown setiap detik ---
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const updated = prev.map(t => ({
          ...t,
          remaining: Math.max(0, t.remaining - 1),
        }))

        // Cek timer yang habis
        updated.forEach(t => {
          if (t.remaining === 0 && prev.find(p => p.id === t.id)?.remaining !== 0) {
            // Timer habis — eksekusi aksi
            handleToggleRelay(t.relayId, t.endAction === "ON")
          }
        })

        // Hapus timer yang sudah habis
        return updated.filter(t => t.remaining > 0)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [handleToggleRelay])

  // --- Scheduler check setiap 30 detik ---
 useEffect(() => {
    const checkScheduler = async () => {
      try {
        const res = await fetch("/api/schedules/check")
        if (!res.ok) return

        const data = await res.json()

        // Jika ada scheduler yang baru di-trigger
        if (data.triggered && data.triggered.length > 0) {
          // Tampilkan toast untuk setiap aksi
          data.triggered.forEach((action: string) => {
            addToast(`Scheduler: ${action}`, "success")
          })
          // Refresh data relay, history, dan schedules
          loadRelays()
          loadHistory()
          loadSchedules()
        }
      } catch {
        // Silent fail — jangan spam error toast setiap 10 detik
      }
    }

    // Cek langsung saat pertama kali mount
    checkScheduler()

    // Cek setiap 10 detik
    const interval = setInterval(checkScheduler, 10000)

    return () => clearInterval(interval)
  }, []) // ← dependency kosong: tidak pernah restart!

  // --- Dark mode toggle ---
  const handleToggleDark = useCallback(() => {
    setIsDark(prev => {
      const next = !prev
      document.documentElement.classList.toggle("dark", next)
      document.documentElement.classList.toggle("light", !next)
      return next
    })
  }, [])

  // --- Render ---
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          connected={connected}
          relays={relays}
          onToggleAll={handleToggleAll}
          onToggleDark={handleToggleDark}
          isDark={isDark}
          onMenuClick={() => setSidebarOpen(true)}
          loading={relayLoading === "all"}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* === DASHBOARD VIEW === */}
          {activeView === "dashboard" && (
            <>
              {/* Sensor Panel */}
              <section>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--iot-muted)" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Monitoring Sensor
                </h2>
                <SensorPanel sensors={sensors} loading={sensorsLoading} />
              </section>

              {/* Relay Grid */}
              <section>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--iot-muted)" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Kontrol Relay
                  <span className="text-xs font-normal ml-auto">
                    {relays.filter(r => r.status).length}/{relays.length} aktif
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {relays.map(relay => (
                    <RelayCard
                      key={relay.id}
                      relay={relay}
                      loading={relayLoading === relay.id}
                      connected={connected}
                      onToggle={handleToggleRelay}
                      onSetTimer={handleRelaySetTimer}
                    />
                  ))}
                </div>
              </section>

              {/* Quick History (5 terakhir) */}
              {history.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--iot-muted)" }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Aktivitas Terakhir
                    </h2>
                    <button
                      onClick={() => setActiveView("history")}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "var(--iot-accent)" }}
                    >
                      Lihat semua
                    </button>
                  </div>
                  <div className="glass-card overflow-hidden">
                    {[...history].reverse().slice(0, 5).map((record, idx) => {
                      const isOn = record.action.includes("ON")
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-4 py-2.5 text-sm border-b last:border-b-0"
                          style={{ borderColor: "var(--iot-border)" }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono" style={{ color: "var(--iot-muted)" }}>
                              {new Date(record.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                            <span className="text-xs" style={{ color: "var(--iot-text)" }}>
                              {record.relayId === 0 ? "Semua Relay" : RELAY_NAMES[record.relayId - 1]}
                            </span>
                          </div>
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
                      )
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          {/* === HISTORY VIEW === */}
          {activeView === "history" && (
            <HistoryPanel
              history={history}
              loading={historyLoading}
              onExport={handleExportHistory}
              onBackup={handleBackupHistory}
              onClear={handleClearHistory}
            />
          )}

          {/* === SCHEDULER VIEW === */}
          {activeView === "scheduler" && (
            <SchedulerPanel
              schedules={schedules}
              onAdd={handleAddSchedule}
              onDelete={handleDeleteSchedule}
              onToggle={handleToggleSchedule}
            />
          )}

          {/* === TIMER VIEW === */}
          {activeView === "timer" && (
            <TimerPanel
              timers={timers}
              onSetTimer={handleSetTimer}
              onCancelTimer={handleCancelTimer}
              initialRelayId={timerRelayId}
            />
          )}
        </main>
      </div>
    </div>
  )
}

// ============================================
// Export halaman dengan ToastProvider wrapper
// ============================================
export default function HomePage() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  )
}