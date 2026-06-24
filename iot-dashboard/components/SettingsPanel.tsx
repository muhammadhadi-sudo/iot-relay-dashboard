"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/components/Toast"
import { getWifiStatus, scanWifiNetworks, setWifiConfig, resetWifiConfig, getDeviceInfo } from "@/services/device"
import type { WifiStatus, WifiNetwork, DeviceInfoExtended } from "@/types"

export default function SettingsPanel() {
  const { addToast } = useToast()

  const [wifiStatus, setWifiStatus] = useState<WifiStatus | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoExtended | null>(null)
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ssid, setSsid] = useState("")
  const [password, setPassword] = useState("")

  const loadStatus = useCallback(async () => {
    try {
      const [ws, di] = await Promise.all([getWifiStatus(), getDeviceInfo()])
      setWifiStatus(ws)
      setDeviceInfo(di)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 5000)
    return () => clearInterval(interval)
  }, [loadStatus])

  const handleScan = async () => {
    setScanning(true)
    try {
      const nets = await scanWifiNetworks()
      setNetworks(nets.sort((a, b) => b.rssi - a.rssi))
      addToast(`Ditemukan ${nets.length} jaringan`, "info")
    } catch {
      addToast("Gagal memindai WiFi", "error")
    } finally {
      setScanning(false)
    }
  }

  const handleSave = async () => {
    if (!ssid.trim()) { addToast("SSID tidak boleh kosong", "warning"); return }
    setSaving(true)
    try {
      const result = await setWifiConfig(ssid, password)
      addToast(result.message, "success")
      addToast(`Jika gagal, akses AP: ${result.ap_fallback}`, "info")
      // Refresh status setelah delay
      setTimeout(loadStatus, 5000)
      setTimeout(loadStatus, 12000)
    } catch {
      addToast("Gagal menyimpan konfigurasi", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm("Reset konfigurasi WiFi? ESP akan restart.")) return
    try {
      await resetWifiConfig()
      addToast("WiFi direset. ESP akan restart.", "warning")
    } catch {
      addToast("Gagal reset WiFi", "error")
    }
  }

  const selectNetwork = (net: WifiNetwork) => {
    setSsid(net.ssid)
  }

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h}j ${m}m ${sec}d`
  }

  const rssiLabel = (r: number) => r > -50 ? "Kuat" : r > -70 ? "Sedang" : "Lemah"
  const rssiColor = (r: number) => r > -50 ? "var(--iot-accent)" : r > -70 ? "var(--iot-warning)" : "var(--iot-danger)"

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold" style={{ color: "var(--iot-text)" }}>Pengaturan Perangkat</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--iot-muted)" }}>
          Konfigurasi WiFi, informasi perangkat, dan akses AP mode
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* WiFi Status */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--iot-muted)" }}>
            <span>📡</span> Status WiFi
          </h3>
          {wifiStatus ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm py-1.5 border-b" style={{ borderColor: "var(--iot-border)" }}>
                <span style={{ color: "var(--iot-muted)" }}>Mode</span>
                <span className="font-mono text-xs" style={{ color: "var(--iot-text)" }}>{wifiStatus.mode}</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b" style={{ borderColor: "var(--iot-border)" }}>
                <span style={{ color: "var(--iot-muted)" }}>STA Status</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: wifiStatus.sta_connected ? "color-mix(in srgb, var(--iot-accent) 15%, transparent)" : "color-mix(in srgb, var(--iot-danger) 15%, transparent)",
                    color: wifiStatus.sta_connected ? "var(--iot-accent)" : "var(--iot-danger)",
                  }}>
                  {wifiStatus.sta_connected ? "Terhubung" : "Terputus"}
                </span>
              </div>
              {wifiStatus.sta_connected && (
                <>
                  <div className="flex justify-between text-sm py-1.5 border-b" style={{ borderColor: "var(--iot-border)" }}>
                    <span style={{ color: "var(--iot-muted)" }}>SSID</span>
                    <span className="font-mono text-xs" style={{ color: "var(--iot-text)" }}>{wifiStatus.sta_ssid}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1.5 border-b" style={{ borderColor: "var(--iot-border)" }}>
                    <span style={{ color: "var(--iot-muted)" }}>IP Address</span>
                    <span className="font-mono text-xs" style={{ color: "var(--iot-accent)" }}>{wifiStatus.sta_ip}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1.5 border-b" style={{ borderColor: "var(--iot-border)" }}>
                    <span style={{ color: "var(--iot-muted)" }}>Signal</span>
                    <span className="font-mono text-xs" style={{ color: rssiColor(wifiStatus.rssi) }}>
                      {wifiStatus.rssi} dBm ({rssiLabel(wifiStatus.rssi)})
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm py-1.5 border-b" style={{ borderColor: "var(--iot-border)" }}>
                <span style={{ color: "var(--iot-muted)" }}>AP SSID</span>
                <span className="font-mono text-xs" style={{ color: "var(--iot-text)" }}>{wifiStatus.ap_ssid}</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b" style={{ borderColor: "var(--iot-border)" }}>
                <span style={{ color: "var(--iot-muted)" }}>AP IP</span>
                <span className="font-mono text-xs" style={{ color: "var(--iot-warning)" }}>{wifiStatus.ap_ip}</span>
              </div>
              <div className="flex justify-between text-sm py-1.5">
                <span style={{ color: "var(--iot-muted)" }}>AP Password</span>
                <span className="font-mono text-xs" style={{ color: "var(--iot-text)" }}>{wifiStatus.ap_pass}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--iot-accent)", borderTopColor: "transparent" }} />
            </div>
          )}
        </div>

        {/* Device Info */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--iot-muted)" }}>
            <span>💻</span> Informasi Perangkat
          </h3>
          {deviceInfo ? (
            <div className="space-y-2">
              {[
                ["Nama", deviceInfo.device_name],
                ["MAC", deviceInfo.mac_address],
                ["Uptime", formatUptime(deviceInfo.uptime)],
                ["Free Heap", `${(deviceInfo.free_heap / 1024).toFixed(1)} KB`],
                ["Flash Size", `${(deviceInfo.flash_size / 1024)} KB`],
                ["CPU Freq", `${deviceInfo.cpu_freq} MHz`],
                ["SDK", deviceInfo.sdk_version],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-sm py-1.5 border-b last:border-b-0" style={{ borderColor: "var(--iot-border)" }}>
                  <span style={{ color: "var(--iot-muted)" }}>{label}</span>
                  <span className="font-mono text-xs" style={{ color: "var(--iot-text)" }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--iot-accent)", borderTopColor: "transparent" }} />
            </div>
          )}
        </div>
      </div>

      {/* WiFi Scan & Config */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--iot-muted)" }}>
          <span>🔍</span> Pindai & Ubah WiFi
        </h3>

        <button onClick={handleScan} disabled={scanning} className="btn-ghost text-xs mb-3">
          {scanning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--iot-accent)", borderTopColor: "transparent" }} />
              Memindai...
            </>
          ) : "Pindai Jaringan WiFi"}
        </button>

        {networks.length > 0 && (
          <div className="max-h-48 overflow-y-auto mb-4 rounded-lg border" style={{ borderColor: "var(--iot-border)" }}>
            {networks.map((net, i) => (
              <button
                key={`${net.ssid}-${i}`}
                onClick={() => selectNetwork(net)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm transition-colors border-b last:border-b-0"
                style={{
                  borderColor: "var(--iot-border)",
                  background: ssid === net.ssid ? "color-mix(in srgb, var(--iot-accent) 10%, transparent)" : "transparent",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--iot-surface-hover)" }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = ssid === net.ssid ? "color-mix(in srgb, var(--iot-accent) 10%, transparent)" : "transparent"
                }}
              >
                <span className="flex items-center gap-2">
                  {net.ssid}
                  {net.secured && <span style={{ color: "var(--iot-warning)", fontSize: "10px" }}>🔒</span>}
                </span>
                <span className="font-mono text-xs" style={{ color: rssiColor(net.rssi) }}>
                  {net.rssi}dBm
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--iot-muted)" }}>SSID Baru</label>
            <input type="text" value={ssid} onChange={e => setSsid(e.target.value)} className="input-field" placeholder="Nama WiFi" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--iot-muted)" }}>Password Baru</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="Password WiFi" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !ssid.trim()} className="btn-primary w-full">
          {saving ? "Menyimpan..." : "Simpan & Hubungkan"}
        </button>

        <button onClick={handleReset} className="btn-danger w-full mt-2">
          Reset Konfigurasi WiFi
        </button>
      </div>
    </div>
  )
}