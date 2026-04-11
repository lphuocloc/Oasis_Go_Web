import { api } from '../api'

// ── Query filters ─────────────────────────────────────────────────────────────

export interface DashboardFilters {
  from?: string | Date
  to?: string | Date
  groupBy?: 'day' | 'week' | 'month'
  locationId?: string
  clusterId?: string
}

export interface DashboardResponse {
  success: boolean
  data: {
    filters: {
      from: string
      to: string
      groupBy: string
      tz: string
      locationId: string | null
      clusterId: string | null
    }
    summary: {
      pods: {
        total: number
        byStatus: Record<string, number>
      }
      bookings: {
        totalInRange: number
        byStatus: Record<string, number>
      }
      incidents: {
        totalInRange: number
        openNow: number
        byStatus: Record<string, number>
      }
    }
    charts: {
      bookingsStatusPie: Array<{ status: string; count: number }>
      incidentsStatusPie: Array<{ status: string; count: number }>
    }
    lists: {
      latestBookings: Array<{
        id: string
        podCode: string
        userName: string
        startTime: string
        endTime: string
        status: string
      }>
      latestIncidents: Array<{
        id: string
        podCode: string
        severity: string
        status: string
        created_at: string
      }>
    }
  }
}

// ── Raw entity shapes returned by the BE ─────────────────────────────────────

export interface DashboardPod {
  id: string
  code?: string
  name?: string
  status: string
  cluster_id?: string
  [key: string]: unknown
}

export interface DashboardBooking {
  id: string
  pod_id?: string
  /** Present if service populates the relation */
  user?: { name?: string; email?: string }
  user_id?: string
  status: string
  start_time?: string
  end_time?: string
  actual_end_time?: string
  total_price?: number
  base_price?: number
  created_at?: string
  [key: string]: unknown
}

export interface DashboardIncident {
  id: string
  pod_id?: string
  severity?: string
  status: string
  description?: string
  created_at?: string
  [key: string]: unknown
}

// ── API response shape — matches BE getDashboard exactly ─────────────────────
// GET /dashboard?from=&to=&groupBy=&locationId=&clusterId=
//
// BE returns:
// {
//   success: true,
//   data: {
//     summary: { podsTotal, bookingsInRange, incidentsTotal },
//     pods:     { list: Pod[] },           // all pods (unfiltered by date)
//     bookings: { from, to, list: Booking[] }, // filtered by from/to
//     incidents:{ list: Incident[] }       // all incidents (unfiltered by date)
//   }
// }

export interface AdminDashboardResponse {
  success: boolean
  data: {
    summary: {
      podsTotal: number
      clustersTotal?: number
      bookingsInRange: number
      ordersInRange?: number
      incidentsTotal: number
      openIncidents?: number
      revenueInRange?: number
    }
    ratings?: {
      bookingStatus?: Array<{ status: string; count: number; rate: number }>
      podStatusRealtime?: Array<{ status: string; count: number; rate: number }>
    }
    charts?: {
      bookingStatus?: Array<{ status: string; count: number; rate: number }>
      podStatusRealtime?: Array<{ status: string; count: number; rate: number }>
      revenueTrend?: {
        groupBy: string
        points: Array<{ label: string; amount: number; orders?: number }>
      }
    }
    pods: {
      list: DashboardPod[]
      statusSummary?: Array<{ status: string; count: number; rate: number }>
    }
    bookings: {
      from: string
      to: string
      list: DashboardBooking[]
      statusSummary?: Array<{ status: string; count: number; rate: number }>
      revenue?: {
        total: number
      }
    }
    incidents: {
      list: DashboardIncident[]
      byStatus?: Array<{ status: string; count: number; rate: number }>
    }
  }
}

// ── API client ────────────────────────────────────────────────────────────────

const buildParams = (filters?: DashboardFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters?.from) {
    params.append('from', filters.from instanceof Date ? filters.from.toISOString() : filters.from)
  }
  if (filters?.to) {
    params.append('to', filters.to instanceof Date ? filters.to.toISOString() : filters.to)
  }
  if (filters?.groupBy) params.append('groupBy', filters.groupBy)
  if (filters?.locationId) params.append('locationId', filters.locationId)
  if (filters?.clusterId) params.append('clusterId', filters.clusterId)
  return params
}

export const adminDashboardApi = {
  getDashboard: (filters?: DashboardFilters) => {
    const params = buildParams(filters)
    return api.get<AdminDashboardResponse>('/dashboard', { params }).then((r) => r.data)
  }
}

export const dashboardApi = {
  getDashboard: (filters?: DashboardFilters) => {
    const params = buildParams(filters)
    return api.get<DashboardResponse>('/dashboard', { params }).then((r) => r.data)
  }
}
