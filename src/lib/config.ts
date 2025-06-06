export const config = {
  apiUrl: (import.meta as any).env.VITE_API_URL || 'http://localhost:3001/api',
  socketUrl: (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:3001',
  isDevelopment: (import.meta as any).env.DEV,
  isProduction: (import.meta as any).env.PROD,
}; 