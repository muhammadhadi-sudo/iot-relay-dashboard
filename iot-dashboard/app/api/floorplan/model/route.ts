import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

// Tentukan lokasi folder data
const DATA_DIR = path.join(process.cwd(), "data")

// Pastikan folder data ada saat aplikasi berjalan
async function ensureDataDirExists() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

export async function GET() {
  try {
    // Pastikan folder ada sebelum membaca
    await ensureDataDirExists()

    // Cek GLB terlebih dahulu, baru GLTF
    for (const ext of ["glb", "gltf"]) {
      const filePath = path.join(DATA_DIR, `floorplan.${ext}`)
      try {
        const buffer = await fs.readFile(filePath)
        const mimeType = ext === "glb" ? "model/gltf-binary" : "model/gltf+json"

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": String(buffer.length),
            "Cache-Control": "public, max-age=3600, immutable",
            "Accept-Ranges": "bytes", // Dukung pemuatan sebagian file
          },
        })
      } catch {
        // Lanjut ke ekstensi berikutnya jika tidak ditemukan
        continue
      }
    }

    // Jika tidak ada file sama sekali
    return NextResponse.json({ error: "File model floorplan tidak ditemukan" }, { status: 404 })
  } catch (error) {
    console.error("[API /floorplan/model] Error baca model:", error)
    return NextResponse.json({ error: "Gagal membaca file model" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await ensureDataDirExists()

    let deleted = false
    for (const ext of ["glb", "gltf"]) {
      const filePath = path.join(DATA_DIR, `floorplan.${ext}`)
      try {
        await fs.unlink(filePath)
        deleted = true
      } catch {
        continue
      }
    }

    if (!deleted) {
      return NextResponse.json({ message: "Tidak ada model yang perlu dihapus" }, { status: 200 })
    }

    return NextResponse.json({ message: "Model floorplan berhasil dihapus" })
  } catch (error) {
    console.error("[API /floorplan/model] Error hapus model:", error)
    return NextResponse.json({ error: "Gagal menghapus model" }, { status: 500 })
  }
}