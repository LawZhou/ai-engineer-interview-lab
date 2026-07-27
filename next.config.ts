import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/ai-engineer-interview-lab" : "",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
