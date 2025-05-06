// Definición de tipos para variables de entorno
export {};

declare global {
  interface Window {
    userSessionId?: string;
    dashboardJsLoaded?: boolean;
    dashboardCheckCount?: number;
    stopDashboardCheck?: boolean;
    env: {
      BACKEND_URL?: string;
      FRONTEND_URL?: string;
      GOOGLE_CLIENT_ID?: string;
      NODE_ENV?: string;
    };
  }
}