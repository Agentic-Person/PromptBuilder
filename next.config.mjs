/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable if you need server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;