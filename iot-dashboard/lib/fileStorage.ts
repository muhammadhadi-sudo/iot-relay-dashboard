// ============================================
// File Storage Helper — Baca/tulis file JSON
// Digunakan oleh API routes (server-side only)
// ============================================

import fs from "fs/promises"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")

/** Pastikan direktori data ada */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

/** Baca file JSON, return parsed object. Jika tidak ada, return defaultValue */
export async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    return JSON.parse(raw) as T
  } catch {
    // File belum ada atau kosong — tulis default
    await writeJsonFile(filename, defaultValue)
    return defaultValue
  }
}

/** Tulis object ke file JSON (atomic: tulis temp lalu rename) */
export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  const tempPath = filePath + ".tmp"
  const json = JSON.stringify(data, null, 2)
  await fs.writeFile(tempPath, json, "utf-8")
  await fs.rename(tempPath, filePath)
}

/** Backup file JSON dengan timestamp */
export async function backupJsonFile(filename: string): Promise<string> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = path.join(DATA_DIR, `backup_${timestamp}_${filename}`)
  await fs.copyFile(filePath, backupPath)
  return backupPath
}

/** Append record ke file JSON array */
export async function appendToJsonFile<T>(
  filename: string,
  record: T
): Promise<T[]> {
  const existing = await readJsonFile<T[]>(filename, [])
  existing.push(record)
  await writeJsonFile(filename, existing)
  return existing
}