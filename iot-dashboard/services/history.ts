// ============================================
// History Service — Baca/tulis history via API routes
// ============================================

import type { HistoryRecord } from "@/types"

/** Ambil semua history */
export async function fetchHistory(): Promise<HistoryRecord[]> {
  const res = await fetch("/api/history")
  if (!res.ok) throw new Error("Gagal ambil history")
  return res.json()
}

/** Tambah record history baru */
export async function addHistory(record: Omit<HistoryRecord, "timestamp">): Promise<HistoryRecord> {
  const res = await fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  })
  if (!res.ok) throw new Error("Gagal simpan history")
  return res.json()
}

/** Trigger backup history */
export async function backupHistory(): Promise<{ message: string; path: string }> {
  const res = await fetch("/api/backup", { method: "POST" })
  if (!res.ok) throw new Error("Gagal backup history")
  return res.json()
}

/** Export history sebagai file download */
export function exportHistory(history: HistoryRecord[]): void {
  const blob = new Blob([JSON.stringify(history, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `history_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}