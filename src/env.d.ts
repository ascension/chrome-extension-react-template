/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_CLIENT_ID: string
  readonly VITE_EXTENSION_NAME: string
  readonly VITE_EXTENSION_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}