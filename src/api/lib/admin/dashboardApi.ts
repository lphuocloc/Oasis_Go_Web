import { api } from '../../api'

// ── Query filters ─────────────────────────────────────────────────────────────

export interface DashboardFilters {
  from?: string | Date
  to?: string | Date
  groupBy?: 'day' | 'week' | 'month'
  locationId?: string
  clusterId?: string
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
      bookingsInRange: number
      incidentsTotal: number
    }
    pods: {
      list: DashboardPod[]
    }
    bookings: {
      from: string
      to: string
      list: DashboardBooking[]
    }
    incidents: {
      list: DashboardIncident[]
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
