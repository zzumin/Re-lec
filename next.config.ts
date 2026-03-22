import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mammoth', 'pdf-parse', 'word-extractor'],
};

export default nextConfig;
