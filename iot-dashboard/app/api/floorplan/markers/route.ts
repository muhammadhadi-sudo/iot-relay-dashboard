import { NextResponse } from "next/server"
import { readJsonFile, writeJsonFile } from "@/lib/fileStorage"
import type { FloorplanMarker } from "@/types"

const DEFAULT_MARKERS: FloorplanMarker[] = [
  { id: "m1", relayId: 1, name: "Relay 1", position: [0, 0.3, 0], placed: false },
  { id: "m2", relayId: 2, name: "Relay 2", position: [1, 0.3, 0], placed: false },
  { id: "m3", relayId: 3, name: "Relay 3", position: [2, 0.3, 0], placed: false },
  { id: "m4", relayId: 4, name: "Relay 4", position: [3, 0.3, 0], placed: false },
]

export async function GET() {
  try {
    const markers = await readJsonFile<FloorplanMarker[]>("floorplan-markers.json", DEFAULT_MARKERS)
    return NextResponse.json(markers)
  } catch {
    return NextResponse.json(DEFAULT_MARKERS)
  }
}

export async function PUT(request: Request) {
  try {
    const markers = await request.json()
    await writeJsonFile("floorplan-markers.json", markers)
    return NextResponse.json({ message: "Markers disimpan" })
  } catch {
    return NextResponse.json({ error: "Gagal simpan markers" }, { status: 500 })
  }
}