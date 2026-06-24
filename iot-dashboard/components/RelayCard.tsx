"use client"

import type { Relay } from "@/types"

type RelayCardProps = {
  relay: Relay
  loading: boolean
  connected: boolean
  onToggle: (id: number, status: boolean) => void
  onSetTimer: (id: number) => void
}

export default function RelayCard({ relay, loading, connected, onToggle, onSetTimer }: RelayCardProps) {
  const isOn = relay.status

  return (
    <div
      className={`
        glass-card p-5 relative overflow-hidden animate-fade-in
        ${isOn ? "glow-accent" : ""}
      `}
    >
      {/* Background gradient saat ON */}
      {isOn && (
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: `radial-gradient(ellipse at top right, var(--iot-accent), transparent 70%)`,
          }}
        />
      )}

      {/* Header: ID + Status Badge */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
            style={{
              background: isOn ? "color-mix(in srgb, var(--iot-accent) 20%, transparent)" : "color-mix(in srgb, var(--iot-border) 50%, transparent)",
              color: isOn ? "var(--iot-accent)" : "var(--iot-muted)",
            }}
          >
            {relay.id}
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--iot-text)" }}>
            {relay.name}
          </span>
        </div>

        {/* Status badge */}
        <span
          className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
          style={{
            background: isOn ? "color-mix(in srgb, var(--iot-accent) 15%, transparent)" : "color-mix(in srgb, var(--iot-danger) 15%, transparent)",
            color: isOn ? "var(--iot-accent)" : "var(--iot-danger)",
            border: `1px solid ${isOn ? "color-mix(in srgb, var(--iot-accent) 25%, transparent)" : "color-mix(in srgb, var(--iot-danger) 25%, transparent)"}`,
          }}
        >
          {isOn ? "ON" : "OFF"}
        </span>
      </div>

      {/* Icon visual besar */}
      <div className="flex items-center justify-center my-5 relative z-10">
        <div
          className={`
            w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500
            ${isOn ? "scale-110" : "scale-100"}
          `}
          style={{
            background: isOn
              ? "color-mix(in srgb, var(--iot-accent) 15%, transparent)"
              : "color-mix(in srgb, var(--iot-border) 30%, transparent)",
            border: `2px solid ${isOn ? "var(--iot-accent)" : "var(--iot-border)"}`,
          }}
        >
          {isOn ? (
            <svg className="w-10 h-10" style={{ color: "var(--iot-accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ) : (
            <svg className="w-10 h-10" style={{ color: "var(--iot-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
        </div>
      </div>

      {/* Toggle + Timer */}
      <div className="flex items-center justify-between mt-4 relative z-10">
        <button
          onClick={() => onToggle(relay.id, !relay.status)}
          disabled={loading || !connected}
          className="group"
          title={loading ? "Memproses..." : !connected ? "Tidak terhubung" : `Toggle ${relay.name}`}
        >
          <div className={`toggle-track ${isOn ? "active" : ""} ${!connected ? "opacity-40 cursor-not-allowed" : ""}`}>
            <div className="toggle-thumb" />
          </div>
        </button>

        <button
          onClick={() => onSetTimer(relay.id)}
          disabled={!connected}
          className="btn-ghost text-xs flex items-center gap-1.5"
          title="Set Timer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Timer
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl z-20"
          style={{ background: "color-mix(in srgb, var(--iot-bg) 60%, transparent)", backdropFilter: "blur(2px)" }}
        >
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--iot-accent)", borderTopColor: "transparent" }}
          />
        </div>
      )}
    </div>
  )
}