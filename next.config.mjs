// Optional bundle analyzer
const withBundleAnalyzer = async (config) => {
  if (process.env.ANALYZE === "true") {
    const createAnalyzer = (await import("@next/bundle-analyzer")).default
    return createAnalyzer({ enabled: true })(config)
  }
  return config
}

// @ts-check
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }
    ]
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' blob: data: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'"
    ].join("; ")
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      },
      {
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      }
    ]
  }
}

export default await withBundleAnalyzer(nextConfig)
