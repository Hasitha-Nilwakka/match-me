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

// Allow all ngrok domains for dynamic ngrok usage
patterns.push({ 
  protocol: 'https', 
  hostname: '*.ngrok-free.app', 
  pathname: '/uploads/**' 
});

// Allow specific common ngrok patterns
patterns.push({ 
  protocol: 'https', 
  hostname: '*.ngrok.io', 
  pathname: '/uploads/**' 
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: patterns,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Hide dev overlay when NEXT_DEV_OVERLAY=false (for mobile/clean testing)
  // Note: devIndicators.buildActivity is deprecated in Next.js 15.5+
  // The dev indicator now shows automatically in dev mode and is hidden in production
  // Error overlay (red screen) will still appear in dev mode for critical errors
};

export default nextConfig;
