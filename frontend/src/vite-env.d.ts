/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MANATAL_API_TOKEN: string
  readonly VITE_GA_MEASUREMENT_ID: string
  readonly VITE_ENV: 'development' | 'staging' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
