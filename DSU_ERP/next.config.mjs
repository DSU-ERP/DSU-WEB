/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false, devIndicators: false, images: { qualities: [75, 85] },
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'same-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ...(process.env.NODE_ENV==='production'?[{key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}]:[]),
  ] }, {source:"/placement/assistants/friday",headers:[{key:"Permissions-Policy",value:"camera=(), microphone=(self), geolocation=()"}]}]; },
};
export default config;
