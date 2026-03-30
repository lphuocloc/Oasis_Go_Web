import { api } from '../api'

export interface UserListItem {
  id?: string
  _id?: string
  email?: string
  name?: string
  phone?: string | null
  role?: string
  isActive?: boolean
}

interface UserListResponse {
  success?: boolean
  count?: number
  data?: UserListItem[]
  users?: UserListItem[]
}

interface UserListFilters {
  role?: string
  isActive?: boolean
}

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

const buildUserListParams = (filters?: UserListFilters) => {
  const params = new URLSearchParams()
  if (!filters) return params

  if (filters.role?.trim()) params.append('role', filters.role.trim())
  if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive))

  return params
}

export const userApi = {
  getAll: async (filters?: UserListFilters) => {
    const params = buildUserListParams(filters)
    const candidates = ['/users', '/admin/users', '/auth/users']
    let lastError: any = null

    for (const endpoint of candidates) {
      try {
        const response = await api.get<UserListResponse | UserListItem[]>(endpoint, { params })
        const payload = response.data

        if (Array.isArray(payload)) {
          return { success: true, count: payload.length, data: payload }
        }

        const list = payload.data ?? payload.users ?? []
        return {
          success: payload.success ?? true,
          count: payload.count ?? list.length,
          data: list
        }
      } catch (error: any) {
        const status = error?.response?.status
        if (status === 404) {
          lastError = error
          continue
        }

        throw error
      }
    }

    throw lastError ?? new Error('No user listing endpoint available')
  },

  updateProfile: (data: UpdateProfileRequest) => {
    return api.put<UpdateProfileResponse>('/users/profile', data).then((r) => r.data)
  },
  
  getProfile: () => {
    return api.get<UpdateProfileResponse>('/users/profile').then((r) => r.data)
  },

  getActiveUsers: async (role?: string) => {
    const response = await api.get<UserListResponse | UserListItem[]>('/users', { params: { role } })
    const payload = response.data

    if (Array.isArray(payload)) {
      return { success: true, count: payload.length, data: payload }
    }

    const list = payload.data ?? payload.users ?? []
    return {
      success: payload.success ?? true,
      count: payload.count ?? list.length,
      data: list
    }
  }
}
