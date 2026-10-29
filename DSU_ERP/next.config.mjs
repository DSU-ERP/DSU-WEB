/** @type {import('next').NextConfig} */
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

/** IPv4 addresses of this machine's network adapters (Wi-Fi, Ethernet, VMs). */
function localNetworkAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((address) => address && address.family === "IPv4" && !address.internal)
    .map((address) => address.address);
}

const config = {
  // There is another package-lock.json one directory above this application.
  // Keep Next's workspace and its development lock inside this actual app.
  turbopack: { root: appRoot },
  outputFileTracingRoot: appRoot,
  // Validate production output separately while a development server is running.
  distDir: process.env.DSU_NEXT_DIST_DIR || ".next",
  // The desktop preview opens the app through loopback rather than localhost.
  // Next also checks this host for development scripts and hot reload. This
  // machine's own network addresses are added so a phone on the same Wi-Fi
  // can open the dev server; this setting has no effect in production.
  allowedDevOrigins: ["127.0.0.1", ...localNetworkAddresses()],
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
