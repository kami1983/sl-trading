import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@project/anchor': path.resolve(__dirname, './anchor/src'),
    }
    return config
  },
}

export default nextConfig
