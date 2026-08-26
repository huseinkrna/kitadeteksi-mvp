/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAPID_PUBLIC_KEY: string;
  // add other VITE_ prefixed env vars here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
