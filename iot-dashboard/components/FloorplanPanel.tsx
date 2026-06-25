"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useToast } from "@/components/Toast"
import { toggleRelay } from "@/services/relay"
import type { FloorplanMarker, Relay } from "@/types"
import { RELAY_NAMES } from "@/types"

const SceneWrapper = dynamic(() => import("./three/SceneWrapper"), { ssr: false })

type DropData = { x: number; y: number; relayId: number } | null

type FloorplanPanelProps = {
  relays: Relay[]
}

export default function FloorplanPanel({ relays }: FloorplanPanelProps) {
  const { addToast } = useToast()

  const [markers, setMarkers] = useState<FloorplanMarker[]>([])
  const [hasModel, setHasModel] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropDataRef = useRef<DropData>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    try {
      const [markersRes, modelRes] = await Promise.all([
        fetch("/api/floorplan/markers"),
        fetch("/api/floorplan/model", { method: "HEAD" }),
      ])
      if (markersRes.ok) setMarkers(await markersRes.json())
      setHasModel(modelRes.ok)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const saveMarkers = useCallback(
    async (newMarkers: FloorplanMarker[]) => {
      setMarkers(newMarkers)
      try {
        await fetch("/api/floorplan/markers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMarkers),
        })
      } catch {
        // silent
      }
    },
    []
  )

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (ext !== "glb" && ext !== "gltf") {
      addToast("Format harus .glb atau .gltf", "error")
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append("model", file)

    try {
      const res = await fetch("/api/floorplan/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (res.ok) {
        setHasModel(true)
        addToast(data.message, "success")
      } else {
        addToast(data.error || "Upload gagal", "error")
      }
    } catch {
      addToast("Gagal upload file", "error")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemoveModel = async () => {
    try {
      await fetch("/api/floorplan/model", { method: "DELETE" })
      setHasModel(false)
      addToast("Model dihapus", "info")
    } catch {
      addToast("Gagal hapus model", "error")
    }
  }

  const handleToggleRelay = async (id: number, status: boolean) => {
    try {
      await toggleRelay(id, status)
      addToast(`${RELAY_NAMES[id - 1]} ${status ? "nyala" : "mati"}`, "success")
    } catch {
      addToast(`Gagal kontrol ${RELAY_NAMES[id - 1]}`, "error")
    }
  }

  const handleDragStart = (e: React.DragEvent, relayId: number) => {
    e.dataTransfer.setData("text/plain", String(relayId))
    e.dataTransfer.effectAllowed = "copy"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const relayId = parseInt(e.dataTransfer.getData("text/plain"))
    if (isNaN(relayId)) return

    const alreadyPlaced = markers.some(m => m.relayId === relayId && m.placed)
    if (alreadyPlaced) {
      addToast(`${RELAY_NAMES[relayId - 1]} sudah ada di floorplan`, "warning")
      return
    }

    dropDataRef.current = { x: e.clientX, y: e.clientY, relayId }
  }

  const unplaced = markers.filter((m) => !m.placed)
  const placed = markers.filter((m) => m.placed)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" style={{ color: "var(--iot-muted)" }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--iot-accent)", borderTopColor: "transparent" }} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--iot-text)" }}>Floorplan 3D</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--iot-muted)" }}>
            Upload model GLB/GLTF, lalu drag relay ke floorplan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            {uploading ? (
              <><div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "white", borderTopColor: "transparent" }} /> Uploading...</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg> Upload GLB/GLTF</>
            )}
          </button>
          {hasModel && (
            <button onClick={handleRemoveModel} className="btn-ghost text-xs" style={{ color: "var(--iot-danger)" }}>
              Hapus Model
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}>
        <div
          className="w-48 flex-shrink-0 glass-card p-3 flex flex-col gap-2 overflow-y-auto"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--iot-muted)" }}>
            Relay — Drag ke 3D
          </h3>

          {unplaced.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--iot-border)" }}>
              Semua relay sudah ditempatkan
            </p>
          ) : (
            unplaced.map((m) => {
              const relay = relays.find((r) => r.id === m.relayId)
              const isOn = relay?.status ?? false
              return (
                <div
                  key={m.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, m.relayId)}
                  className="flex items-center gap-2 p-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all border"
                  style={{
                    background: "var(--iot-bg)",
                    borderColor: "var(--iot-border)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--iot-accent)"
                    e.currentTarget.style.background = "var(--iot-surface-hover)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--iot-border)"
                    e.currentTarget.style.background = "var(--iot-bg)"
                  }}
                  title={`Drag ${m.name} ke floorplan`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: isOn ? "var(--iot-accent)" : "var(--iot-muted)" }}
                  />
                  <span className="text-xs font-medium flex-1" style={{ color: "var(--iot-text)" }}>
                    {m.name}
                  </span>
                  <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--iot-border)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
              )
            })
          )}

          {placed.length > 0 && (
            <>
              <div className="border-t mt-2 pt-2" style={{ borderColor: "var(--iot-border)" }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--iot-muted)" }}>
                Di Floorplan
              </h3>
              {placed.map((m) => {
                const relay = relays.find((r) => r.id === m.relayId)
                const isOn = relay?.status ?? false
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 p-2 rounded-lg border"
                    style={{
                      background: "color-mix(in srgb, var(--iot-accent) 5%, transparent)",
                      borderColor: "color-mix(in srgb, var(--iot-accent) 20%, transparent)",
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: isOn ? "var(--iot-accent)" : "var(--iot-muted)" }}
                    />
                    <span className="text-xs font-medium flex-1" style={{ color: "var(--iot-text)" }}>
                      {m.name}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--iot-muted)" }}>
                      {isOn ? "ON" : "OFF"}
                    </span>
                  </div>
                )
              })}
            </>
          )}

          <div className="mt-auto pt-3 border-t" style={{ borderColor: "var(--iot-border)" }}>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--iot-border)" }}>
              <strong style={{ color: "var(--iot-muted)" }}>Cara pakai:</strong><br />
              1. Upload file GLB/GLTF<br />
              2. Drag relay ke floorplan<br />
              3. Drag marker untuk pindahkan<br />
              4. Double-click marker toggle<br />
              5. Klik ✕ untuk hapus marker
            </p>
          </div>
        </div>

        <div
          className="flex-1 rounded-xl overflow-hidden border relative"
          style={{ borderColor: "var(--iot-border)" }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div
            id="drop-overlay"
            className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center rounded-xl border-2 border-dashed opacity-0 transition-opacity duration-200"
            style={{ borderColor: "var(--iot-accent)", background: "rgba(16,185,129,0.05)" }}
          />

          <SceneWrapper
            relays={relays}
            markers={markers}
            onToggleRelay={handleToggleRelay}
            onUpdateMarkers={saveMarkers}
            dropPayloadRef={dropDataRef}
            hasModel={hasModel}
          />
        </div>
      </div>
    </div>
  )
}