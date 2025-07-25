/**
 * SynapseAI Universal SDK
 * Production-ready TypeScript SDK for all platform features
 */

export * from "./client";
export * from "./types";
export * from "./modules";
export * from "./utils";
export * from "./errors";
export * from "./apix";

// Main SDK export
export { SynapseAI, createClient } from "./client";

// Version
export const SDK_VERSION = "1.0.0";

// Default export for convenience
export default SynapseAI;
