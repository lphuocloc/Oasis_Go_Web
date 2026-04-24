import { api } from '../api'

export interface ReviewItem {
  id: string
  booking_id: string
  user_id: string
  cluster_id: string
  rating: number | null
  comment: string | null
  is_rejected: boolean
  moderated_at: string | null
  created_at: string
  updated_at: string
  user?: {
    name: string
    email?: string
    avatar?: string
  }
  cluster?: {
    name: string
  }
}

interface ReviewListResponse {
  success: boolean
  data: ReviewItem[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface ReviewStatsResponse {
  success: boolean
  data: {
    avgRating: number
    totalReviews: number
    ratingCounts: Record<string, number>
  }
}

export const reviewApi = {
  getAdminReviews: (params: {
    page?: number
    limit?: number
    cluster_id?: string
    rating?: number
    status?: 'active' | 'hidden'
  }) => {
    return api.get<ReviewListResponse>('/reviews/admin/all', { params }).then((r) => r.data)
  },

  approve: (reviewId: string) => {
    // Keep this for now but it should ideally be removed or redirected to restore
    return api.post(`/reviews/${reviewId}/restore`).then((r) => r.data)
  },

  reject: (reviewId: string) => {
    return api.post(`/reviews/${reviewId}/reject`).then((r) => r.data)
  },

  restore: (reviewId: string) => {
    return api.post(`/reviews/${reviewId}/restore`).then((r) => r.data)
  },

  getGlobalStats: () => {
    return api.get<{
      success: boolean
      data: {
        avgRating: number
        totalReviews: number
        satisfactionRate: number
        hiddenReviews: number
      }
    }>('/reviews/stats').then((r) => r.data)
  },

  getClusterStats: (clusterId: string) => {
    return api.get<ReviewStatsResponse>(`/reviews/cluster/${clusterId}/stats`).then((r) => r.data)
  }
}
