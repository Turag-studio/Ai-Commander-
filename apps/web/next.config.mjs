/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ai-commander/core", "@ai-commander/agents"],
  eslint: {
    dirs: ["app", "components", "lib"],
  },
};

export default nextConfig;
