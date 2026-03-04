import { api } from '../api'

export type LoginPayload = { email: string; password: string }

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post('/auth/login', payload).then((r) => r.data),

  me: () =>
    api.get('/auth/me').then((r) => r.data),
}