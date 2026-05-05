import { api } from '../api'

export interface AdminUserListItem {
    _id?: string
    id?: string
    name?: string
    email?: string
    phone?: string | null
    avatar?: string | null
    role?: string
    isActive?: boolean
    createdAt?: string
    authProvider?: string
    isVerified?: boolean
}

export interface AdminUserIdentityCard {
    idNumber?: string
    fullName?: string
    dob?: string
    gender?: string
    address?: string
    placeOfOrigin?: string
    expiryDate?: string
    nationality?: string
}

export interface AdminUserDetail extends AdminUserListItem {
    bank_name?: string | null
    bank_account_number?: string | null
    profilePicture?: string | null
    identityCardStatus?: string | null
    identityCardVerifiedAt?: string | null
    identityCardRejectReason?: string | null
    cccd?: AdminUserIdentityCard | null
}

interface AdminUserListResponse {
    success: boolean
    count: number
    data: AdminUserListItem[]
}

interface AdminUserDetailResponse {
    success: boolean
    data: AdminUserDetail
}

export const adminUserApi = {
    getAll: async () => {
        const response = await api.get<AdminUserListResponse>('/admin/users')
        return response.data
    },
    getById: async (id: string) => {
        const response = await api.get<AdminUserDetailResponse>(`/admin/users/${id}`)
        return response.data
    }
}
