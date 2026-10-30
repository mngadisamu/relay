import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep pages you've just seen (or that were fetched ahead of a click) for 30 seconds,
    // so going back to the inbox or My requests is instant. Sending a reply, moving a
    // ticket or submitting a request refreshes the affected pages straight away anyway.
    staleTimes: { dynamic: 30, static: 30 },
  },
};

export default nextConfig;
