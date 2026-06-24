// ============================================
// API Route: /api/backup
// POST — backup history.json ke file terpisah
// ============================================

import { NextResponse } from "next/server"
import { backupJsonFile } from "@/lib/fileStorage"

export async function POST() {
  try {
    const backupPath = await backupJsonFile("history.json")
    return NextResponse.json({
      message: "Backup berhasil",
      path: backupPath,
    })
  } catch (error) {
    console.error("[API /backup POST] Error:", error)
    return NextResponse.json(
      { error: "Gagal membuat backup" },
      { status: 500 }
    )
  }
}