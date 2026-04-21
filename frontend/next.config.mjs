import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  devIndicators: false,
  // Parent folder (repo root) has a stray package-lock.json; Next can infer the wrong
  // workspace root and split module resolution. Pin tracing to this app directory.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
