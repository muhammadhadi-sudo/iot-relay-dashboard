import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("model") as File | null

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (ext !== "glb" && ext !== "gltf") {
      return NextResponse.json({ error: "Format harus .glb atau .gltf" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File maksimal 50MB" }, { status: 400 })
    }

    await fs.mkdir(DATA_DIR, { recursive: true })

    // Hapus file lama jika ada
    for (const e of ["glb", "gltf"]) {
      try { await fs.unlink(path.join(DATA_DIR, `floorplan.${e}`)) } catch {}
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = path.join(DATA_DIR, `floorplan.${ext}`)
    await fs.writeFile(filePath, buffer)

    return NextResponse.json({
      message: `File ${file.name} berhasil diupload`,
      filename: `floorplan.${ext}`,
      size: file.size,
      type: ext,
    })
  } catch (error) {
    console.error("[UPLOAD] Error:", error)
    return NextResponse.json({ error: "Gagal upload file" }, { status: 500 })
  }
}