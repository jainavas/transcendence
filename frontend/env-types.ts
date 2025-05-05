// Definición de tipos para variables de entorno
export {};

declare global {
  interface Window {
    env: {
      BACKEND_URL: string;
      FRONTEND_URL: string;
      GOOGLE_CLIENT_ID: string;
      NODE_ENV: string;
    };
  }
}