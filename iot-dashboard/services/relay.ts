// ============================================
// Relay Service — Komunikasi dengan ESP8266
// ============================================

import type { Relay, SensorData } from "@/types"

const ESP_IP = process.env.NEXT_PUBLIC_ESP_IP || "192.168.1.100"
const BASE_URL = `http://${ESP_IP}`

/** Fetch dengan timeout dan error handling */
async function espFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

/** Ambil semua data relay dari ESP8266 */
export async function fetchRelays(): Promise<Relay[]> {
  const res = await espFetch("/api/relays")
  if (!res.ok) throw new Error(`Gagal ambil data relay: ${res.status}`)
  return res.json()
}

/** Toggle satu relay */
export async function toggleRelay(id: number, status: boolean): Promise<Relay> {
  const res = await espFetch("/api/relay", {
    method: "POST",
    body: JSON.stringify({ id, status }),
  })
  if (!res.ok) throw new Error(`Gagal kontrol relay ${id}: ${res.status}`)
  return res.json()
}

/** Kontrol semua relay sekaligus */
export async function toggleAllRelays(status: boolean): Promise<{ message: string; relays: Relay[] }> {
  const res = await espFetch("/api/relay/all", {
    method: "POST",
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(`Gagal kontrol semua relay: ${res.status}`)
  return res.json()
}

/** Ambil data sensor dari ESP8266 */
export async function fetchSensors(): Promise<SensorData> {
  const res = await espFetch("/api/sensors")
  if (!res.ok) throw new Error(`Gagal ambil data sensor: ${res.status}`)
  return res.json()
}

/** Cek koneksi ke ESP8266 */
export async function checkConnection(): Promise<boolean> {
  try {
    const res = await espFetch("/api/relays")
    return res.ok
  } catch {
    return false
  }
}