/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** CDN base URL for the exported assets (apps/client/public/assets); see src/assets-base.ts. */
  readonly VITE_ASSETS_BASE_URL?: string;
}
