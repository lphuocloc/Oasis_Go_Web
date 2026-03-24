import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  type ChartData,
  type ChartOptions,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from 'chart.js'
import {
  adminDashboardApi,
  type AdminDashboardResponse,
  type DashboardFilters,
  type DashboardPod
} from '../../api/lib/dashboardApi'
import { TrendingUp, AlertCircle, Calendar, Package, RefreshCw, ChevronDown } from 'lucide-react'
import { toast } from 'react-toastify'
import { useManagerScope } from '../../contexts/ManagerScopeContext'

ChartJS.register(
  DoughnutController,
  LineController,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const OPEN_INCIDENT_STATUSES = ['PENDING', 'INVESTIGATING']

type RangeOption = 'today' | 'week' | 'month'

const RANGE_OPTIONS: { label: string; value: RangeOption }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' }
]

const getDateRange = (range: RangeOption): { from: Date; to: Date; groupBy: DashboardFilters['groupBy'] } => {
  const now = new Date()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  if (range === 'today') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
      to: endOfDay,
      groupBy: 'day'
    }
  }

  if (range === 'week') {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)
    return { from: monday, to: endOfDay, groupBy: 'week' }
  }

  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
    to: endOfDay,
    groupBy: 'month'
  }
}

const STATUS_COLORS: Record<string, string> = {
  BOOKED: 'bg-blue-100 text-blue-800',
  IN_USE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  OPEN: 'bg-orange-100 text-orange-800',
  PENDING: 'bg-orange-100 text-orange-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  AVAILABLE: 'bg-emerald-100 text-emerald-800',
  OCCUPIED: 'bg-blue-100 text-blue-800',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800',
  INACTIVE: 'bg-gray-100 text-gray-800'
}

const CHART_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#10b981',
  NEEDS_CLEANING: '#f59e0b',
  MAINTENANCE: '#f43f5e',
  OCCUPIED: '#6366f1',
  BOOKED: '#6366f1',
  CANCELLED: '#f43f5e',
  IN_USE: '#10b981',
  COMPLETED: '#14b8a6',
  PENDING: '#f59e0b',
  INVESTIGATING: '#3b82f6',
  RESOLVED: '#10b981'
}

const FALLBACK_CHART_COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#14b8a6', '#8b5cf6']

const statusColor = (status: string, index: number) =>
  CHART_STATUS_COLORS[status] ?? FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length]

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
    {status}
  </span>
)

const SummaryCard: React.FC<{
  title: string
  value: React.ReactNode
  icon: React.ReactNode
  iconBg: string
  extra?: React.ReactNode
}> = ({ title, value, icon, iconBg, extra }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
    </div>
    <div className="flex items-end gap-2">
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
    {extra && <div className="text-sm space-y-1">{extra}</div>}
  </div>
)

const SkeletonCard = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
    <div className="h-8 bg-gray-200 rounded w-1/3" />
  </div>
)

const SectionTitle: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children, icon }) => (
  <div className="flex items-center gap-2 mb-4">
    {icon && <span className="text-gray-400">{icon}</span>}
    <h2 className="text-base font-semibold text-gray-800">{children}</h2>
  </div>
)

const DoughnutChart: React.FC<{
  labels: string[]
  values: number[]
  colors: string[]
}> = ({ labels, values, colors }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const data: ChartData<'doughnut'> = {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 4,
          hoverOffset: 6
        }
      ]
    }

    const options: ChartOptions<'doughnut'> = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            boxWidth: 8,
            color: '#64748b'
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = Number(ctx.raw) || 0
              const total = values.reduce((sum, item) => sum + item, 0)
              const pct = total > 0 ? Math.round((value / total) * 100) : 0
              return `${ctx.label}: ${value} (${pct}%)`
            }
          }
        }
      }
    }

    const chart = new ChartJS(chartRef.current, {
      type: 'doughnut',
      data,
      options
    })

    return () => chart.destroy()
  }, [labels, values, colors])

  return (
    <div className="h-72">
      <canvas ref={chartRef} />
    </div>
  )
}

const LineChart: React.FC<{
  labels: string[]
  values: number[]
}> = ({ labels, values }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const data: ChartData<'line'> = {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: values,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#6366f1'
        }
      ]
    }

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const amount = Number(ctx.raw) || 0
              return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b' }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#e2e8f0' },
          ticks: {
            color: '#64748b',
            callback: (tickValue) =>
              new Intl.NumberFormat('vi-VN', {
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(Number(tickValue))
          }
        }
      }
    }

    const chart = new ChartJS(chartRef.current, {
      type: 'line',
      data,
      options
    })

    return () => chart.destroy()
  }, [labels, values])

  return (
    <div className="h-72">
      <canvas ref={chartRef} />
    </div>
  )
}

export const ManagerDashboard = () => {
  const { clusters: scopedClusters, isLoading: isScopeLoading, refreshScope } = useManagerScope()
  const [rawData, setRawData] = useState<AdminDashboardResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeOption>('today')
  const [showRangePicker, setShowRangePicker] = useState(false)

  const fetchDashboard = async (selectedRange: RangeOption) => {
    try {
      setIsLoading(true)
      setError(null)
      const { from, to, groupBy } = getDateRange(selectedRange)
      const response = await adminDashboardApi.getDashboard({ from, to, groupBy })
      setRawData(response.data)
    } catch (fetchError: any) {
      console.error('Dashboard error:', fetchError)
      setError(fetchError?.response?.data?.message || 'Failed to load dashboard')
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const scopedClusterIds = useMemo(
    () => new Set(scopedClusters.map((cluster) => cluster.id)),
    [scopedClusters]
  )

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label ?? 'Today'

  const data = useMemo(() => {
    if (!rawData) return null

    const scopedPods = rawData.pods.list.filter(
      (pod) => !!pod.cluster_id && scopedClusterIds.has(String(pod.cluster_id))
    )

    const scopedPodIds = new Set(scopedPods.map((pod) => pod.id))
    const scopedBookings = rawData.bookings.list.filter((booking) => scopedPodIds.has(String(booking.pod_id)))
    const scopedIncidents = rawData.incidents.list.filter((incident) => scopedPodIds.has(String(incident.pod_id)))

    const podsByStatus = scopedPods.reduce<Record<string, number>>((acc, pod) => {
      const key = pod.status || 'UNKNOWN'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const bookingsByStatus = scopedBookings.reduce<Record<string, number>>((acc, booking) => {
      const key = booking.status || 'UNKNOWN'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const incidentsByStatus = scopedIncidents.reduce<Record<string, number>>((acc, incident) => {
      const key = incident.status || 'UNKNOWN'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const podMap = new Map<string, DashboardPod>(scopedPods.map((pod) => [pod.id, pod]))

    return {
      summary: {
        pods: {
          total: scopedPods.length,
          byStatus: podsByStatus
        },
        clusters: {
          total: rawData.summary.clustersTotal ?? new Set(scopedPods.map((pod) => pod.cluster_id)).size
        },
        bookings: {
          totalInRange: scopedBookings.length,
          byStatus: bookingsByStatus
        },
        incidents: {
          totalInRange: scopedIncidents.length,
          openNow: scopedIncidents.filter((item) => OPEN_INCIDENT_STATUSES.includes(item.status)).length,
          byStatus: incidentsByStatus
        },
        revenue: {
          totalInRange: rawData.summary.revenueInRange ?? rawData.bookings.revenue?.total ?? 0
        }
      },
      charts: {
        bookingStatusRates:
          rawData.charts?.bookingStatus ??
          Object.entries(bookingsByStatus).map(([status, count]) => ({
            status,
            count,
            rate: Math.round((count / Math.max(scopedBookings.length, 1)) * 100)
          })),
        podStatusRealtimeRates:
          rawData.charts?.podStatusRealtime ??
          Object.entries(podsByStatus).map(([status, count]) => ({
            status,
            count,
            rate: Math.round((count / Math.max(scopedPods.length, 1)) * 100)
          })),
        revenueTrend: rawData.charts?.revenueTrend?.points ?? []
      },
      lists: {
        latestBookings: [...scopedBookings]
          .sort((a, b) => new Date(b.start_time ?? 0).getTime() - new Date(a.start_time ?? 0).getTime())
          .slice(0, 5)
          .map((booking) => ({
            id: booking.id,
            podCode: podMap.get(booking.pod_id ?? '')?.code ?? booking.pod_id ?? '-',
            userName: (booking.user as { name?: string } | undefined)?.name ?? '-',
            startTime: booking.start_time ?? '',
            endTime: booking.end_time ?? '',
            status: booking.status
          })),
        latestIncidents: [...scopedIncidents]
          .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
          .slice(0, 5)
          .map((incident) => ({
            id: incident.id,
            podCode: podMap.get(incident.pod_id ?? '')?.code ?? incident.pod_id ?? '-',
            severity: incident.severity ?? '-',
            status: incident.status,
            created_at: incident.created_at ?? ''
          }))
      }
    }
  }, [rawData, scopedClusterIds])

  const isPageLoading = isLoading || isScopeLoading

  const handleRefresh = async () => {
    try {
      await Promise.all([refreshScope(), fetchDashboard(range)])
    } catch {
      // Errors are handled inside refreshScope/fetchDashboard.
    }
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
          <p className="text-gray-400">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of operations in your assigned scope.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowRangePicker((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              {rangeLabel}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {showRangePicker && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setRange(opt.value)
                      setShowRangePicker(false)
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${range === opt.value ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isPageLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isPageLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {isPageLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {!isPageLoading && (
        <>
          <div className="mb-3">
            <SectionTitle icon={<Package className="w-4 h-4" />}>Operations Overview</SectionTitle>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SummaryCard
              title="Total Pods"
              value={data.summary.pods.total}
              icon={<Package className="w-5 h-5 text-blue-600" />}
              iconBg="bg-blue-50"
              extra={Object.entries(data.summary.pods.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <StatusBadge status={status} />
                  <span className="font-semibold text-gray-700">{count}</span>
                </div>
              ))}
            />

            <SummaryCard
              title="Total Clusters"
              value={data.summary.clusters.total}
              icon={<Package className="w-5 h-5 text-indigo-600" />}
              iconBg="bg-indigo-50"
            />

            <SummaryCard
              title={`Bookings (${rangeLabel})`}
              value={data.summary.bookings.totalInRange}
              icon={<Calendar className="w-5 h-5 text-green-600" />}
              iconBg="bg-green-50"
              extra={Object.entries(data.summary.bookings.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <StatusBadge status={status} />
                  <span className="font-semibold text-gray-700">{count}</span>
                </div>
              ))}
            />

            <SummaryCard
              title="Incidents (All)"
              value={data.summary.incidents.totalInRange}
              icon={<AlertCircle className="w-5 h-5 text-red-600" />}
              iconBg="bg-red-50"
              extra={
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                    <span className="text-orange-600 font-semibold">{data.summary.incidents.openNow} Open Now</span>
                  </div>
                  {Object.entries(data.summary.incidents.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <StatusBadge status={status} />
                      <span className="font-semibold text-gray-700">{count}</span>
                    </div>
                  ))}
                </>
              }
            />

            <SummaryCard
              title={`Revenue (${rangeLabel})`}
              value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.summary.revenue.totalInRange)}
              icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
              iconBg="bg-purple-50"
              extra={(() => {
                const points = data.charts.revenueTrend
                if (points.length === 0) {
                  return <p className="text-gray-500 mt-1">No revenue data in this range</p>
                }
                const latest = points[points.length - 1]
                return (
                  <>
                    <p className="text-gray-500 mt-1">Latest point: {latest.label}</p>
                  </>
                )
              })()}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Pod Status Realtime</h2>
              {data.charts.podStatusRealtimeRates.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No pod status data available</p>
              ) : (
                <DoughnutChart
                  labels={data.charts.podStatusRealtimeRates.map((item) => item.status)}
                  values={data.charts.podStatusRealtimeRates.map((item) => item.count)}
                  colors={data.charts.podStatusRealtimeRates.map((item, index) => statusColor(item.status, index))}
                />
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Booking Status</h2>
              {data.charts.bookingStatusRates.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No booking data available</p>
              ) : (
                <DoughnutChart
                  labels={data.charts.bookingStatusRates.map((item) => item.status)}
                  values={data.charts.bookingStatusRates.map((item) => item.count)}
                  colors={data.charts.bookingStatusRates.map((item, index) => statusColor(item.status, index))}
                />
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Revenue Trend ({rangeLabel})</h2>
            {data.charts.revenueTrend.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No revenue trend available</p>
            ) : (
              <LineChart
                labels={data.charts.revenueTrend.map((point) => point.label)}
                values={data.charts.revenueTrend.map((point) => point.amount)}
              />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Latest Bookings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Pod</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.lists.latestBookings.length > 0 ? data.lists.latestBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">{booking.podCode}</td>
                        <td className="px-6 py-4 text-gray-600">{booking.userName}</td>
                        <td className="px-6 py-4"><StatusBadge status={booking.status} /></td>
                        <td className="px-6 py-4 text-gray-600">{booking.startTime ? new Date(booking.startTime).toLocaleTimeString() : '-'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No bookings in this range</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Latest Incidents</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Pod</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.lists.latestIncidents.length > 0 ? data.lists.latestIncidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">{incident.podCode}</td>
                        <td className="px-6 py-4 text-gray-600">{incident.severity}</td>
                        <td className="px-6 py-4"><StatusBadge status={incident.status} /></td>
                        <td className="px-6 py-4 text-gray-600">{incident.created_at ? new Date(incident.created_at).toLocaleDateString() : '-'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No incidents in this range</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
