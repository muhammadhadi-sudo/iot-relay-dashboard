// ============================================
// Device Service — WiFi config, scan, device info
// ============================================

import type { WifiStatus, WifiNetwork, DeviceInfoExtended } from "@/types"

const ESP_IP = process.env.NEXT_PUBLIC_ESP_IP || "192.168.1.100"
const BASE_URL = `http://${ESP_IP}`

async function espFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10 detik untuk scan
  try {
    return await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...options?.headers },
    })
  } finally {
    clearTimeout(timeout)
  }
}

/** Ambil status WiFi ESP8266 */
export async function getWifiStatus(): Promise<WifiStatus> {
  const res = await espFetch("/api/wifi/status")
  if (!res.ok) throw new Error("Gagal ambil WiFi status")
  return res.json()
}

/** Scan jaringan WiFi */
export async function scanWifiNetworks(): Promise<WifiNetwork[]> {
  const res = await espFetch("/api/wifi/scan")
  if (!res.ok) throw new Error("Gagal scan WiFi")
  const data = await res.json()
  return data.networks || []
}

/** Simpan konfigurasi WiFi baru */
export async function setWifiConfig(ssid: string, password: string): Promise<{ message: string; ap_fallback: string }> {
  const res = await espFetch("/api/wifi/config", {
    method: "POST",
    body: JSON.stringify({ ssid, password }),
  })
  if (!res.ok) throw new Error("Gagal simpan WiFi config")
  return res.json()
}

/** Reset konfigurasi WiFi */
export async function resetWifiConfig(): Promise<{ message: string }> {
  const res = await espFetch("/api/wifi/reset", { method: "POST" })
  if (!res.ok) throw new Error("Gagal reset WiFi")
  return res.json()
}

/** Ambil device info lengkap */
export async function getDeviceInfo(): Promise<DeviceInfoExtended> {
  const res = await espFetch("/api/device-info")
  if (!res.ok) throw new Error("Gagal ambil device info")
  return res.json()
}