/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@muteahitt/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },
};

module.exports = nextConfig;
