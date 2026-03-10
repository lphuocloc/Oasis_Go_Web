import { api } from '../../api'

const BASE_URL = '/dashboard'

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

export const dashboardApi = {
  getDashboard: (filters?: DashboardFilters) => {
    const params = new URLSearchParams()
    
    if (filters?.from) {
      params.append('from', filters.from instanceof Date ? filters.from.toISOString() : filters.from)
    }
    if (filters?.to) {
      params.append('to', filters.to instanceof Date ? filters.to.toISOString() : filters.to)
    }
    if (filters?.groupBy) {
      params.append('groupBy', filters.groupBy)
    }
    if (filters?.locationId) {
      params.append('locationId', filters.locationId)
    }
    if (filters?.clusterId) {
      params.append('clusterId', filters.clusterId)
    }

    return api.get<DashboardResponse>(`${BASE_URL}`, { params }).then((r) => r.data)
  }
}
