export const config = {
  apiUrl: (import.meta as any).env.VITE_API_URL || (
    (import.meta as any).env.PROD ? '/api' : 'http://localhost:3001/api'
  ),
  socketUrl: (import.meta as any).env.VITE_SOCKET_URL || (
    (import.meta as any).env.PROD ? window.location.origin : 'http://localhost:3001'
  ),
  isDevelopment: (import.meta as any).env.DEV,
  isProduction: (import.meta as any).env.PROD,
}; 