import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: false, // NONAKTIFKAN untuk mencegah double-mount Three.js
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
}

export default nextConfig