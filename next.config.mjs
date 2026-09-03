/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'pdf-parse', 'mammoth'],
  },
};

export default nextConfig;
