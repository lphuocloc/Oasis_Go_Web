import { api } from '../api'

interface UpdateProfileRequest {
    name: string
    phone: string
  avatar?: string
}

interface UpdateProfileResponse {
  success: boolean
  data: {
    id: string
    email: string
    name: string
    phone: string
    role: string
    authProvider: string
    avatar: string | null
    createdAt: string
  }
}

export const userApi = {
  updateProfile: (data: UpdateProfileRequest) => {
    return api.put<UpdateProfileResponse>('/users/profile', data).then((r) => r.data)
  },
  
  getProfile: () => {
    return api.get<UpdateProfileResponse>('/users/profile').then((r) => r.data)
  }
}
