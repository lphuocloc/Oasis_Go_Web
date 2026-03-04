import axios from 'axios'
import config from '../config/config'

export const api = axios.create({
  baseURL: config.API_BASE_URL, // -> http://localhost:3000/api
  timeout: 20000,
  // withCredentials: true, // chỉ bật nếu backend dùng cookie session
})

api.interceptors.request.use((cfg) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      cfg.headers = cfg.headers ?? {}
      cfg.headers.Authorization = `Bearer ${token}`
    }
    return cfg
  })