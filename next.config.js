/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'chromadb',
      '@chroma-core/default-embed',
      'onnxruntime-node',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        'onnxruntime-node',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
