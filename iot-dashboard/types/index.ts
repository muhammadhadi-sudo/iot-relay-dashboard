// ============================================
// Type Definitions — IoT Relay Control System
// ============================================

/** Data relay yang dikembalikan ESP8266 */
export type Relay = {
  id: number
  name: string
  status: boolean
}

/** Record history aktivitas relay */
export type HistoryRecord = {
  relayId: number
  action: string
  timestamp: string
}

/** Schedule (jadwal otomatis) */
export type Schedule = {
  id: string
  relayId: number
  action: "ON" | "OFF"
  time: string       // format "HH:MM"
  days: number[]     // 0=minggu, 1=senin, ..., 6=sabtu
  enabled: boolean
  lastTriggered?: string
}

/** Data sensor dari ESP8266 */
export type SensorData = {
  temperature: number
  humidity: number
  voltage: number
  current: number
}

/** Timer aktif */
export type ActiveTimer = {
  id: string
  relayId: number
  relayName: string
  duration: number     // total detik
  remaining: number    // sisa detik
  endAction: "ON" | "OFF"
  startTime: number    // timestamp ms
}

/** Toast notification */
export type Toast = {
  id: string
  message: string
  type: "success" | "error" | "info" | "warning"
  exiting?: boolean
}

/** View aktif di sidebar */
export type ViewType = "dashboard" | "history" | "scheduler" | "timer"

/** Nama hari dalam bahasa Indonesia */
export const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const

/** Nama relay default */
export const RELAY_NAMES = ["Relay 1", "Relay 2", "Relay 3", "Relay 4"] as const