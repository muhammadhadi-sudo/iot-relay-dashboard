// ============================================
// API Route: /api/schedules/check
// GET — Cek & eksekusi scheduler (server-side)
// Dipanggil oleh frontend setiap 10 detik
// ============================================

import { NextResponse } from "next/server"
import { readJsonFile, writeJsonFile } from "@/lib/fileStorage"
import type { Schedule, HistoryRecord } from "@/types"

export async function GET() {
  const now = new Date()

  // Format waktu saat ini
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const currentTime = `${hours}:${minutes}`                    // "08:00"
  const currentMinuteKey = now.toISOString().slice(0, 16)     // "2024-06-24T08:00"
  const currentDay = now.getDay()                             // 0=Min, 1=Sen, ..., 6=Sab

  // Baca jadwal
  let schedules: Schedule[]
  try {
    schedules = await readJsonFile<Schedule[]>("schedules.json", [])
  } catch {
    return NextResponse.json({ error: "Gagal baca jadwal" }, { status: 500 })
  }

  const triggeredActions: string[] = []
  let schedulesChanged = false

  // IP ESP8266 dari environment
  const espIp = process.env.NEXT_PUBLIC_ESP_IP || "192.168.1.100"

  for (const schedule of schedules) {
    // Cek apakah jadwal ini harus di-trigger sekarang
    const shouldTrigger =
      schedule.enabled &&
      schedule.time === currentTime &&
      schedule.days.includes(currentDay) &&
      schedule.lastTriggered !== currentMinuteKey

    if (!shouldTrigger) continue

    // Eksekusi: kirim perintah ke ESP8266
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(`http://${espIp}/api/relay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: schedule.relayId,
          status: schedule.action === "ON",
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (res.ok) {
        // Berhasil → update lastTriggered
        schedule.lastTriggered = currentMinuteKey
        schedulesChanged = true
        triggeredActions.push(`Relay ${schedule.relayId} ${schedule.action}`)

        // Simpan ke history
        try {
          const history = await readJsonFile<HistoryRecord[]>("history.json", [])
          history.push({
            relayId: schedule.relayId,
            action: `SCHEDULER ${schedule.action}`,
            timestamp: now.toISOString(),
          })
          await writeJsonFile("history.json", history)
        } catch (historyErr) {
          console.error("[SCHEDULER] Gagal simpan history:", historyErr)
        }
      } else {
        // ESP8266 return error → JANGAN update lastTriggered
        // Agar scheduler bisa coba lagi di kesempatan berikutnya
        console.error(
          `[SCHEDULER] ESP8266 error untuk Relay ${schedule.relayId}: ${res.status}`
        )
      }
    } catch (fetchErr) {
      // Gagal hubungi ESP8266 → JANGAN update lastTriggered
      console.error(
        `[SCHEDULER] Gagal hubungi ESP8266 untuk Relay ${schedule.relayId}:`,
        fetchErr
      )
    }
  }

  // Simpan schedules jika ada yang berubah
  if (schedulesChanged) {
    try {
      await writeJsonFile("schedules.json", schedules)
    } catch (writeErr) {
      console.error("[SCHEDULER] Gagal update schedules.json:", writeErr)
    }
  }

  // Return daftar aksi yang baru di-trigger
  return NextResponse.json({
    time: currentTime,
    triggered: triggeredActions,
  })
}