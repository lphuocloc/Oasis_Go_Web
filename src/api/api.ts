import axios from 'axios'
import config from '../config/config'

export const api = axios.create({
  baseURL: config.API_BASE_URL, // -> http://localhost:3000/api
  timeout: 20000,
  // withCredentials: true, // chỉ bật nếu backend dùng cookie session
})

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token')
  if (token) {
    cfg.headers = cfg.headers ?? {}
    cfg.headers.Authorization = `Bearer ${token}`
    console.log('Request with token:', cfg.url)
  } else {
    console.log('Request without token:', cfg.url)
  }
  return cfg
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error?.response?.status, error?.response?.data)
    return Promise.reject(error)
  }
)