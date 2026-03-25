import { api } from '../api'

export type BookingStatus = 'BOOKED' | 'IN_USE' | 'COMPLETED' | 'CANCELLED'

export interface BookingItem {
  id: string
  order_id: string
  user_id: string
  pod_id: string
  start_time: string
  end_time: string
  actual_end_time?: string | null
  status: BookingStatus
  checkin_state?: string | null
  cleaner_access_allowed?: boolean
  cleaner_access_updated_at?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface BookingListFilters {
  user_id?: string
  pod_id?: string
  order_id?: string
  status?: BookingStatus
  start_date?: string
  end_date?: string
}

interface BookingListResponse {
  success: boolean
  message?: string
  data: BookingItem[]
  pagination?: {
    current_page: number
    total_pages: number
    total_items: number
    items_per_page: number
  }
}

const buildParams = (filters?: BookingListFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (!filters) return params

  if (filters.user_id?.trim()) params.append('user_id', filters.user_id.trim())
  if (filters.pod_id?.trim()) params.append('pod_id', filters.pod_id.trim())
  if (filters.order_id?.trim()) params.append('order_id', filters.order_id.trim())
  if (filters.status) params.append('status', filters.status)
  if (filters.start_date?.trim()) params.append('start_date', filters.start_date.trim())
  if (filters.end_date?.trim()) params.append('end_date', filters.end_date.trim())

  return params
}

export const bookingApi = {
  getAll: (filters?: BookingListFilters) => {
    const params = buildParams(filters)
    return api.get<BookingListResponse>('/bookings', { params }).then((r) => r.data)
  }
}
