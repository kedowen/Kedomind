/// <reference types="vite/client" />

enum EnvMode {
  DEV = 'development-api',
  PROD = 'production-api'
}


interface ImportMetaEnv {
  readonly VITE_APP_DEV: EnvMode;
  readonly VITE_APP_BASE_URL: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
