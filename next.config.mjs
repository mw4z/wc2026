/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Flag/team logos are served as static SVGs from /public; no remote images needed for MVP.
  // Allow redirecting the build dir off OneDrive locally (OneDrive corrupts .next
  // symlinks → readlink EINVAL). Vercel ignores this (env unset → default .next).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
