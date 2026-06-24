"use client"

import type { SensorData } from "@/types"

type SensorPanelProps = {
  sensors: SensorData | null
  loading: boolean
}

type SensorCard = {
  key: keyof SensorData
  label: string
  unit: string
  icon: JSX.Element
  color: string
  min: number
  max: number
}

const SENSOR_CARDS: SensorCard[] = [
  {
    key: "temperature",
    label: "Suhu",
    unit: "°C",
    color: "#ef4444",
    min: 15,
    max: 45,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3c-4.97 0-9 3.582-9 8 0 3.067 1.735 5.716 4.286 7.066A3.5 3.5 0 0012 21a3.5 3.5 0 002.714-1.934C17.265 16.716 19 14.067 19 11c0-4.418-4.03-8-9-8z" />
      </svg>
    ),
  },
  {
    key: "humidity",
    label: "Kelembaban",
    unit: "%",
    color: "#06b6d4",
    min: 0,
    max: 100,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 14a5 5 0 110-10 5 5 0 010 10z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2 2" />
      </svg>
    ),
  },
  {
    key: "voltage",
    label: "Tegangan",
    unit: "V",
    color: "#f59e0b",
    min: 180,
    max: 250,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: "current",
    label: "Arus",
    unit: "A",
    color: "#8b5cf6",
    min: 0,
    max: 5,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
]

function getPercentage(value: number, min: number, max: number): number {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

export default function SensorPanel({ sensors, loading }: SensorPanelProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {SENSOR_CARDS.map(card => {
        const value = sensors?.[card.key] ?? 0
        const pct = getPercentage(value, card.min, card.max)

        return (
          <div key={card.key} className="glass-card p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${card.color}15`, color: card.color }}
              >
                {card.icon}
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--iot-muted)" }}>
                {card.label}
              </span>
            </div>

            {loading && !sensors ? (
              <div className="h-8 w-24 rounded-md animate-pulse" style={{ background: "var(--iot-border)" }} />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono" style={{ color: "var(--iot-text)" }}>
                  {value.toFixed(1)}
                </span>
                <span className="text-xs font-medium" style={{ color: "var(--iot-muted)" }}>
                  {card.unit}
                </span>
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--iot-border)" }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: card.color,
                  opacity: 0.8,
                }}
              />
            </div>

            <div className="flex justify-between mt-1">
              <span className="text-[10px] font-mono" style={{ color: "var(--iot-border)" }}>{card.min}</span>
              <span className="text-[10px] font-mono" style={{ color: "var(--iot-border)" }}>{card.max}{card.unit}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}