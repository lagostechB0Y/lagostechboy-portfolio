/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WP_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
