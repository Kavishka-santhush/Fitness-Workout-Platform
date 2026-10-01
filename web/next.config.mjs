/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    // Proxy API + uploads to the Express backend in dev so cookies/CORS are painless.
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return [
      { source: '/backend/:path*', destination: `${api}/:path*` },
    ];
  },
};

export default nextConfig;
