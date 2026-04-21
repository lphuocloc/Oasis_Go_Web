import { api } from '../api'

// ── Revenue (payments + transactions) ─────────────────────────────────────────
export interface RevenueStats {
  totalAllTime: number           // Tổng doanh thu mọi thời điểm
  periodRevenue: number          // Doanh thu trong khoảng lọc
  successfulPayments: number     // Số giao dịch thành công
  refundedAmount: number         // Tổng hoàn tiền (REFUND transactions)
  byMethod: Array<{ method: string; amount: number; count: number }> // Tiền mặt, VNPay, Momo...
  byStatus: Array<{ status: string; amount: number; count: number }> // INITIATED, AUTHORIZED, FAILED
  recentTransactions: Array<{
    id: string
    orderId: string
    type: string         // CHARGE | REFUND | DISCOUNT | PENALTY
    amount: number
    currency: string
    status: string
    created_at: string
  }>
  comparison?: {
    revenueChange: number
  }
}

// ── Users (users table) ────────────────────────────────────────────────────────
export interface UserStats {
  total: number
  active: number                 // is_active = true
  newInPeriod: number            // Đăng ký trong khoảng lọc
  byRole: Array<{ role: string; count: number }> // CUSTOMER, CLEANER, MANAGER, ADMIN
  comparison?: {
    newUsersChange: number
  }
}

// ── Location Performance (locations + pods + bookings + payments) ─────────────
export interface LocationPerformance {
  id: string
  name: string
  type: string          // airport, mall, terminal, floor
  totalPods: number
  activePods: number    // AVAILABLE + OCCUPIED
  totalBookings: number
  totalRevenue: number
}

// ── Reviews Moderation (reviews table) ────────────────────────────────────────
export interface ReviewItem {
  id: string
  userName: string
  podCode: string
  bookingId: string
  rating: number        // 1-5
  comment: string | null
  isRejected: string    // 'true' = pending/rejected, 'false' = approved
  createdAt: string
}

export interface ReviewStats {
  total: number
  pendingModeration: number   // is_rejected = 'true' (chưa duyệt)
  averageRating: number
  ratingDistribution: Array<{ rating: number; count: number }> // 1-5 stars
  latest: ReviewItem[]
}

// ── Voucher Usage (vouchers + booking_vouchers) ────────────────────────────────
export interface VoucherStats {
  totalActive: number
  usedInPeriod: number
  totalDiscountGiven: number
  topVouchers: Array<{
    code: string
    description: string
    discountType: string   // PERCENT | FIXED
    usageCount: number
    totalDiscount: number
  }>
}

// ── Combined Admin Stats Response ─────────────────────────────────────────────
export interface AdminStatsResponse {
  success: boolean
  data: {
    revenue: RevenueStats
    users: UserStats
    locations: LocationPerformance[]
    reviews: ReviewStats
    vouchers: VoucherStats
  }
}

export interface AdminStatsFilters {
  from?: string | Date
  to?: string | Date
}

const toISO = (d: string | Date) => (d instanceof Date ? d.toISOString() : d)

export const adminStatsApi = {
  /**
   * GET /admin/stats?from=...&to=...
   * Trả về doanh thu, users, location performance, reviews, vouchers
   */
  getStats: (filters?: AdminStatsFilters) => {
    const params = new URLSearchParams()
    if (filters?.from) params.append('from', toISO(filters.from))
    if (filters?.to) params.append('to', toISO(filters.to))
    return api.get<AdminStatsResponse>('/admin/stats', { params }).then((r) => r.data)
  }
}
