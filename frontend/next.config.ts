import type { NextConfig } from "next";

// Dynamically inject the exact backend host from NEXT_PUBLIC_API_URL at build/start
const patterns: { protocol: 'http' | 'https'; hostname: string; port?: string; pathname: string }[] = [];

try {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    const u = new URL(envUrl);
    patterns.push({
      protocol: (u.protocol.replace(':', '') as 'http' | 'https'),
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? '443' : '80'),
      pathname: '/uploads/**',
    });
  }
} catch {}

// Always allow localhost:8080 as a fallback for dev
patterns.push({ protocol: 'http', hostname: 'localhost', port: '8080', pathname: '/uploads/**' });

const nextConfig: NextConfig = {
  images: {
    remotePatterns: patterns,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
