/** @type {import('next').NextConfig} */
const config = {
  deploymentId:
    process.env.DEPLOYMENT_ID || process.env.RENDER_GIT_COMMIT || undefined,
  poweredByHeader: false,
  devIndicators: false,
  images: { qualities: [75, 85] },
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
    // /student/api passes through proxy.ts, which buffers bodies only up to this
    // size. Base64 uploads of 10 MB files are ~13.4 MB; the route caps at 15 MB.
    proxyClientMaxBodySize: "16mb",
  },
  async redirects() {
    return [
      {
        source: "/portal/imports",
        destination: "/placement/imports",
        permanent: false,
      },
      {
        source: "/portal/students/:id",
        destination: "/placement/students/:id",
        permanent: false,
      },
      {
        source: "/portal/students",
        destination: "/placement/student-analytics",
        permanent: false,
      },
      {
        source: "/portal/analytics",
        destination: "/placement/batch",
        permanent: false,
      },
      {
        source: "/portal/batch-analytics",
        destination: "/placement/batch",
        permanent: false,
      },
      {
        source: "/portal/batch-analytics/:batch",
        destination: "/placement/batch?batch=:batch",
        permanent: false,
      },
      { source: "/portal/:path*", destination: "/placement", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          // A document's permissions policy is fixed when it first loads and
          // in-app navigation keeps it, so per-route policies broke interviews
          // and voice input after signing in. Same-origin only; the browser
          // still asks the user before any device is used.
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), display-capture=(self), geolocation=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};
export default config;
