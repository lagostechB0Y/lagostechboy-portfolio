/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WP_API_URL: string
  // add other environment variables here if needed
  // readonly VITE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
