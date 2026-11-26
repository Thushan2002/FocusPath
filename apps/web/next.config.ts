import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import type { NextConfig } from "next";

// One .env at the repo root serves web, worker and db.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const nextConfig: NextConfig = {
  transpilePackages: ["@focuspath/shared", "@focuspath/db"],
  serverExternalPackages: ["bullmq", "ioredis", "nodemailer"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
