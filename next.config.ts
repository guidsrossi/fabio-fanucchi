import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/conselho/ficha': ['./private/conselho/**/*'],
  },
};

export default nextConfig;
