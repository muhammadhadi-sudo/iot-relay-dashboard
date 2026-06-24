// ============================================
// API Route: /api/schedules
// GET    — ambil semua jadwal
// POST   — tambah jadwal baru
// PUT    — update jadwal (toggle enabled / update lastTriggered)
// DELETE — hapus jadwal (query param ?id=xxx)
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { readJsonFile, writeJsonFile } from "@/lib/fileStorage"
import type { Schedule } from "@/types"

/** GET /api/schedules */
export async function GET() {
  try {
    const schedules = await readJsonFile<Schedule[]>("schedules.json", [])
    return NextResponse.json(schedules)
  } catch (error) {
    console.error("[API /schedules GET] Error:", error)
    return NextResponse.json({ error: "Gagal membaca jadwal" }, { status: 500 })
  }
}

/** POST /api/schedules — tambah jadwal baru */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { relayId, action, time, days } = body

    if (typeof relayId !== "number" || !["ON", "OFF"].includes(action) || !time || !Array.isArray(days)) {
      return NextResponse.json(
        { error: "Field relayId, action (ON/OFF), time (HH:MM), days (array) wajib" },
        { status: 400 }
      )
    }

    // Validasi format waktu
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: "Format waktu harus HH:MM" }, { status: 400 })
    }

    const schedules = await readJsonFile<Schedule[]>("schedules.json", [])
    const newSchedule: Schedule = {
      id: `sch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      relayId,
      action,
      time,
      days,
      enabled: true,
    }

    schedules.push(newSchedule)
    await writeJsonFile("schedules.json", schedules)

    return NextResponse.json(newSchedule, { status: 201 })
  } catch (error) {
    console.error("[API /schedules POST] Error:", error)
    return NextResponse.json({ error: "Gagal menambah jadwal" }, { status: 500 })
  }
}

/** PUT /api/schedules — update jadwal */
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, enabled, lastTriggered } = body

    if (!id) {
      return NextResponse.json({ error: "Field id wajib" }, { status: 400 })
    }

    const schedules = await readJsonFile<Schedule[]>("schedules.json", [])
    const index = schedules.findIndex(s => s.id === id)

    if (index === -1) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 })
    }

    if (typeof enabled === "boolean") schedules[index].enabled = enabled
    if (lastTriggered) schedules[index].lastTriggered = lastTriggered

    await writeJsonFile("schedules.json", schedules)
    return NextResponse.json(schedules[index])
  } catch (error) {
    console.error("[API /schedules PUT] Error:", error)
    return NextResponse.json({ error: "Gagal update jadwal" }, { status: 500 })
  }
}

/** DELETE /api/schedules?id=xxx */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Query param id wajib" }, { status: 400 })
    }

    const schedules = await readJsonFile<Schedule[]>("schedules.json", [])
    const filtered = schedules.filter(s => s.id !== id)

    if (filtered.length === schedules.length) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 })
    }

    await writeJsonFile("schedules.json", filtered)
    return NextResponse.json({ message: "Jadwal dihapus" })
  } catch (error) {
    console.error("[API /schedules DELETE] Error:", error)
    return NextResponse.json({ error: "Gagal hapus jadwal" }, { status: 500 })
  }
}