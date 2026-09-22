/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['avatars.steamstatic.com', 'community.cloudflare.steamstatic.com'],
  },
};

module.exports = nextConfig;
