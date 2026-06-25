"use client"

import { useRef, useState, useEffect, useCallback, Suspense } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Html, Grid, useGLTF } from "@react-three/drei"
import * as THREE from "three"
import type { FloorplanMarker, Relay } from "@/types"

// ============================================
// Types
// ============================================
type DropPayload = { x: number; y: number; relayId: number } | null

type SceneWrapperProps = {
  relays: Relay[]
  markers: FloorplanMarker[]
  onToggleRelay: (id: number, status: boolean) => void
  onUpdateMarkers: (markers: FloorplanMarker[]) => void
  dropPayloadRef: React.MutableRefObject<DropPayload>
  hasModel: boolean
}

// ============================================
// Loader Model GLB
// ============================================
function GltfModel({ 
  onFloorY, 
  onModelCentered 
}: { 
  onFloorY: (y: number) => void
  onModelCentered: (center: THREE.Vector3, size: THREE.Vector3) => void 
}) {
  const { scene } = useGLTF("/api/floorplan/model")
  const isInitialized = useRef(false)

  useEffect(() => {
    if (!scene || isInitialized.current) return
    isInitialized.current = true

    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    // Pindahkan titik tengah model ke koordinat (0,0,0)
    scene.position.set(-center.x, -center.y, -center.z)

    // Sesuaikan skala
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0) {
      const scaleFactor = 10 / maxDim
      scene.scale.setScalar(scaleFactor)
      
      const scaledBox = new THREE.Box3().setFromObject(scene)
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3())
      scene.position.set(-scaledCenter.x, -scaledCenter.y, -scaledCenter.z)
    }

    const finalBox = new THREE.Box3().setFromObject(scene)
    const finalY = finalBox.min.y
    const finalSize = finalBox.getSize(new THREE.Vector3())
    const finalCenter = finalBox.getCenter(new THREE.Vector3())

    onFloorY(finalY)
    onModelCentered(finalCenter, finalSize)

    scene.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })

  }, [scene, onFloorY, onModelCentered])

  return <primitive object={scene} />
}

// ============================================
// Invisible Ground
// ============================================
function InvisibleGround({
  floorY,
  modelCenter,
  onHover,
}: {
  floorY: number
  modelCenter: THREE.Vector3
  onHover: (pt: THREE.Vector3) => void
}) {
  return (
    <mesh
      position={[modelCenter.x, floorY - 0.01, modelCenter.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={false}
      onPointerMove={(e) => {
        e.stopPropagation()
        onHover(e.point)
      }}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

// ============================================
// Pin Marker 3D
// ============================================
function PinMarker({
  marker,
  isOn,
  onToggle,
  onDragStart,
  onRemove,
}: {
  marker: FloorplanMarker
  isOn: boolean
  onToggle: () => void
  onDragStart: () => void
  onRemove: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const tick = useRef(0)
  const col = isOn ? "#10b981" : "#4b5563"

  useFrame((_, dt) => {
    tick.current += dt
    if (groupRef.current) {
      groupRef.current.scale.setScalar(isOn ? 1 + Math.sin(tick.current * 3) * 0.07 : 1)
    }
  })

  return (
    <group ref={groupRef} position={marker.position}>
      <mesh position={[0, -0.25, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 0.5, 8]} />
        <meshStandardMaterial color={col} />
      </mesh>

      <mesh
        position={[0, 0.1, 0]}
        castShadow
        onPointerDown={(e) => {
          e.stopPropagation()
          onDragStart()
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        <sphereGeometry args={[0.18, 20, 20]} />
        <meshStandardMaterial
          color={col}
          emissive={isOn ? col : "#000000"}
          emissiveIntensity={isOn ? 0.6 : 0}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      {isOn && (
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.4, 32]} />
          <meshBasicMaterial color={col} transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      )}

      <Html position={[0, 0.55, 0]} center distanceFactor={8} style={{ pointerEvents: "auto" }}>
        <div className="flex flex-col items-center gap-1 select-none">
          <div
            className="px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg border"
            style={{
              background: isOn ? "rgba(16,185,129,0.95)" : "rgba(15,23,42,0.95)",
              color: isOn ? "white" : "#e2e8f0",
              borderColor: isOn ? "#059669" : "#334155",
            }}
            onDoubleClick={(e) => { e.stopPropagation(); onToggle() }}
          >
            {marker.name}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold opacity-50 hover:opacity-100 transition-opacity"
            style={{ background: "#ef4444", color: "white" }}
            title="Hapus dari floorplan"
          >
            ✕
          </button>
          <span className="text-[10px] opacity-40" style={{ color: isOn ? "#10b981" : "#6b7fa3" }}>
            dbl-click = toggle
          </span>
        </div>
      </Html>
    </group>
  )
}

// ============================================
// Scene Internal
// ============================================
function InternalScene({
  relays,
  markers,
  onToggleRelay,
  onUpdateMarkers,
  dropPayloadRef,
  hasModel,
}: SceneWrapperProps) {
  const { camera, gl } = useThree()
  const [floorY, setFloorY] = useState(0)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [modelCenter, setModelCenter] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const [modelSize, setModelSize] = useState<THREE.Vector3>(new THREE.Vector3(10, 10, 10))
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const ray = useRef(new THREE.Raycaster())

  const handleFloorY = useCallback((y: number) => {
    setFloorY(prev => Math.abs(prev - y) > 0.001 ? y : prev)
  }, [])

  const handleModelCentered = useCallback((center: THREE.Vector3, size: THREE.Vector3) => {
    setModelCenter(prev => prev.equals(center) ? prev : center.clone())
    setModelSize(prev => prev.equals(size) ? prev : size.clone())
  }, [])

  useEffect(() => {
    dragPlane.current.set(new THREE.Vector3(0, 1, 0), -(floorY + modelCenter.y))
  }, [floorY, modelCenter.y])

  useEffect(() => {
    const maxDim = Math.max(modelSize.x, modelSize.z)
    const distance = maxDim * 1.5 + 5
    
    camera.position.set(
      modelCenter.x + distance,
      modelCenter.y + distance,
      modelCenter.z + distance
    )
    camera.lookAt(modelCenter.x, modelCenter.y, modelCenter.z)

  }, [modelCenter, modelSize, camera])

  const handleGroundHover = useCallback(
    (pt: THREE.Vector3) => {
      if (!activeDragId) return
      const clamped: [number, number, number] = [pt.x - modelCenter.x, floorY + 0.3, pt.z - modelCenter.z]
      onUpdateMarkers(markers.map((m) => (m.id === activeDragId ? { ...m, position: clamped } : m)))
    },
    [activeDragId, markers, onUpdateMarkers, floorY, modelCenter]
  )

  // ✅ Logika Drop yang diperbaiki
  useFrame(() => {
    if (!dropPayloadRef.current) return
    const payload = dropPayloadRef.current
    if (!payload) return

    dropPayloadRef.current = null

    const rect = gl.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((payload.x - rect.left) / rect.width) * 2 - 1,
      -((payload.y - rect.top) / rect.height) * 2 + 1
    )

    ray.current.setFromCamera(ndc, camera)
    const target = new THREE.Vector3()

    const hit = ray.current.ray.intersectPlane(dragPlane.current, target)
    if (!hit) return

    const pos: [number, number, number] = [
      target.x - modelCenter.x,
      floorY + 0.3,
      target.z - modelCenter.z
    ]

    // Cari atau buat marker baru
    const existingIndex = markers.findIndex(m => m.relayId === payload.relayId)
    let updatedMarkers: FloorplanMarker[]

    if (existingIndex >= 0) {
      updatedMarkers = markers.map((m, i) =>
        i === existingIndex ? { ...m, position: pos, placed: true } : m
      )
    } else {
      const relay = relays.find(r => r.id === payload.relayId)
      if (!relay) return

      const newMarker: FloorplanMarker = {
        id: `m_${Date.now()}_${payload.relayId}`,
        relayId: payload.relayId,
        name: relay.name,
        position: pos,
        placed: true
      }
      updatedMarkers = [...markers, newMarker]
    }

    onUpdateMarkers(updatedMarkers)
  })

  useEffect(() => {
    const el = gl.domElement
    const up = () => {
      if (activeDragId) {
        setActiveDragId(null)
        el.style.cursor = "auto"
      }
    }
    el.addEventListener("pointerup", up)
    return () => el.removeEventListener("pointerup", up)
  }, [activeDragId, gl])

  const startDrag = useCallback(
    (id: string) => {
      setActiveDragId(id)
      gl.domElement.style.cursor = "grabbing"
    },
    [gl]
  )

  const removeMarker = useCallback(
    (id: string) => {
      onUpdateMarkers(
        markers.map((m) =>
          m.id === id ? { ...m, placed: false, position: [0, 0.3, 0] as [number, number, number] } : m
        )
      )
    },
    [markers, onUpdateMarkers]
  )

  const toggle = useCallback(
    (rid: number) => {
      const r = relays.find((x) => x.id === rid)
      if (r) onToggleRelay(rid, !r.status)
    },
    [relays, onToggleRelay]
  )

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      {!hasModel && (
        <Grid
          infiniteGrid
          position={[0, -0.01, 0]}
          cellSize={1}
          sectionSize={5}
          cellColor="#1a2a48"
          sectionColor="#10b981"
          fadeDistance={30}
        />
      )}

      {hasModel && (
        <Suspense
          fallback={
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#1a2a48" wireframe />
            </mesh>
          }
        >
          <GltfModel 
            onFloorY={handleFloorY} 
            onModelCentered={handleModelCentered} 
          />
        </Suspense>
      )}

      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[modelCenter.x, floorY - 0.01, modelCenter.z]} 
        receiveShadow
      >
        <planeGeometry args={[modelSize.x * 2, modelSize.z * 2]} />
        <shadowMaterial opacity={0.15} />
      </mesh>

      <InvisibleGround 
        floorY={floorY} 
        modelCenter={modelCenter}
        onHover={handleGroundHover} 
      />

      {markers
        .filter((m) => m.placed)
        .map((m) => (
          <PinMarker
            key={m.id}
            marker={m}
            isOn={relays.find((r) => r.id === m.relayId)?.status ?? false}
            onToggle={() => toggle(m.relayId)}
            onDragStart={() => startDrag(m.id)}
            onRemove={() => removeMarker(m.id)}
          />
        ))}

      <OrbitControls
        enabled={activeDragId === null}
        makeDefault
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={2}
        maxDistance={100}
        target={[modelCenter.x, modelCenter.y, modelCenter.z]}
      />
    </>
  )
}

// ============================================
// Export
// ============================================
export default function SceneWrapper(props: SceneWrapperProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [8, 8, 8], fov: 50, near: 0.1, far: 500 }}
      style={{ background: "linear-gradient(180deg, #0a0f1e 0%, #060b18 100%)" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.2
      }}
    >
      <InternalScene {...props} />
    </Canvas>
  )
}