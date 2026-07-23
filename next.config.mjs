/** @type {import('next').NextConfig} */

// Static export is ONLY needed for the Capacitor/mobile build — a static
// export can't run Next.js API routes (no server exists on the phone to
// run them). The normal web build (npm run dev, npm run build, Vercel)
// needs the opposite: a real server, so /api/tag-vibe and friends work.
// The `cap:*` scripts in package.json set CAPACITOR_BUILD=true before
// building specifically for that case.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig = {
  ...(isCapacitorBuild
    ? {
        output: "export",
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
