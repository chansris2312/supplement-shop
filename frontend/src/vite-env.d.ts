/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_USER_POOL_ID?: string;
  readonly VITE_USER_POOL_CLIENT_ID?: string;
  readonly VITE_COGNITO_DOMAIN?: string;
  readonly VITE_SITE_URL?: string;
}
