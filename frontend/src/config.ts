const env = import.meta.env;

export const config = {
  useMock: env.VITE_USE_MOCK === 'true',
  apiUrl: (env.VITE_API_URL ?? '').replace(/\/$/, ''),
  userPoolId: env.VITE_USER_POOL_ID ?? '',
  userPoolClientId: env.VITE_USER_POOL_CLIENT_ID ?? '',
  // Amplify wants the bare domain, without https://
  cognitoDomain: (env.VITE_COGNITO_DOMAIN ?? '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
  siteUrl: env.VITE_SITE_URL ?? '',
};
