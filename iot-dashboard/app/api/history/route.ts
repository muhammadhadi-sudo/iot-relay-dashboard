// ============================================
// API Route: /api/history
// GET  — ambil semua history dari history.json
// POST — tambah record baru ke history.json
// ============================================

import { NextResponse } from "next/server"
import { readJsonFile, appendToJsonFile, writeJsonFile, backupJsonFile } from "@/lib/fileStorage"
import type { HistoryRecord } from "@/types"

/** GET /api/history */
export async function GET() {
  try {
    const history = await readJsonFile<HistoryRecord[]>("history.json", [])
    return NextResponse.json(history)
  } catch (error) {
    console.error("[API /history GET] Error:", error)
    return NextResponse.json(
      { error: "Gagal membaca history" },
      { status: 500 }
    )
  }
}

/** POST /api/history */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { relayId, action } = body

    // Validasi input
    if (typeof relayId !== "number" || typeof action !== "string") {
      return NextResponse.json(
        { error: "Field relayId (number) dan action (string) wajib diisi" },
        { status: 400 }
      )
    }

    const record: HistoryRecord = {
      relayId,
      action: action.toUpperCase(),
      timestamp: new Date().toISOString(),
    }

    // Auto-backup sebelum menulis (jika file sudah ada dan cukup besar)
    const existing = await readJsonFile<HistoryRecord[]>("history.json", [])
    if (existing.length > 0 && existing.length % 50 === 0) {
      await backupJsonFile("history.json")
    }

    const updated = await appendToJsonFile<HistoryRecord>("history.json", record)
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error("[API /history POST] Error:", error)
    return NextResponse.json(
      { error: "Gagal menulis history" },
      { status: 500 }
    )
  }
}

/** DELETE /api/history — kosongkan history */
export async function DELETE() {
  try {
    // Backup sebelum hapus
    const existing = await readJsonFile<HistoryRecord[]>("history.json", [])
    if (existing.length > 0) {
      await backupJsonFile("history.json")
    }
    await writeJsonFile("history.json", [])
    return NextResponse.json({ message: "History dikosongkan, backup dibuat" })
  } catch (error) {
    console.error("[API /history DELETE] Error:", error)
    return NextResponse.json(
      { error: "Gagal mengosongkan history" },
      { status: 500 }
    )
  }
}