import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'drive.google.com', pathname: '/thumbnail' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
    ],
  },
  outputFileTracingIncludes: {
    '/api/conselho/ficha': ['./private/conselho/**/*'],
  },
};

export default nextConfig;
