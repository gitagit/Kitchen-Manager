/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Prevent the app being embedded in an iframe (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Legacy XSS filter for older browsers
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Don't send full URL in Referer header to third parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features the app doesn't use
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
