/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false, devIndicators: false, images: { qualities: [75, 85] },
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
  async redirects() {
    return [
      { source: '/portal/imports', destination: '/placement/imports', permanent: false },
      { source: '/portal/students/:id', destination: '/placement/students/:id', permanent: false },
      { source: '/portal/students', destination: '/placement/student-analytics', permanent: false },
      { source: '/portal/analytics', destination: '/placement/batch', permanent: false },
      { source: '/portal/batch-analytics', destination: '/placement/batch', permanent: false },
      { source: '/portal/batch-analytics/:batch', destination: '/placement/batch?batch=:batch', permanent: false },
      { source: '/portal/:path*', destination: '/placement', permanent: false },
    ];
  },
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'same-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ...(process.env.NODE_ENV==='production'?[{key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}]:[]),
  ] }, {source:"/placement/assistants/friday",headers:[{key:"Permissions-Policy",value:"camera=(), microphone=(self), geolocation=()"}]}]; },
};
export default config;
