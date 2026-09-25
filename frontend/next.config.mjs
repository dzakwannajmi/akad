import { createRequire } from 'module';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The repo root has its own package-lock.json for repo tooling
  // (markdownlint). Pin tracing to this app so Next does not pick the root.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      'isomorphic-ws$': require.resolve('./lib/isomorphic-ws-fix.mjs'),
    };

    return config;
  },
};

export default nextConfig;
