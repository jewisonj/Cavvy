import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google Photos
      { protocol: 'https', hostname: '*.supabase.co' }, // breman-media storage bucket
    ],
  },
}

export default nextConfig
