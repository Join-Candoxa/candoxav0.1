/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@farcaster/mini-app-solana': false,
    }
    return config
  },
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'hrctlwneejclkstpjsyo.supabase.co',
    ],
  },
}

module.exports = nextConfig