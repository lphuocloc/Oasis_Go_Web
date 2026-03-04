// Lấy env từ Vite
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL

export const config = {
  API_BASE_URL,
  SOCKET_URL,
}

export default config