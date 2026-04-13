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
  BarController,
  BarElement,
  LinearScale,
  PointElement,
  LineController,
  LineElement,
  Tooltip
} from 'chart.js'
import {
  adminDashboardApi,
  type AdminDashboardResponse,
  type DashboardFilters,
  type DashboardPod
} from '../../api/lib/dashboardApi'
import { TrendingUp, Calendar, Package, RefreshCw, ChevronDown } from 'lucide-react'
import { toast } from 'react-toastify'
import { useManagerScope } from '../../contexts/ManagerScopeContext'

ChartJS.register(
  DoughnutController,
  BarController,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineController,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const OPEN_INCIDENT_STATUSES = ['PENDING', 'INVESTIGATING']

type RangeOption = 'today' | 'week' | 'month'

const RANGE_OPTIONS: { label: string; value: RangeOption }[] = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Tuần này', value: 'week' },
  { label: 'Tháng này', value: 'month' }
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
    return { from: monday, to: endOfDay, groupBy: 'day' }
  }

  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
    to: endOfDay,
    groupBy: 'day'
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
  revenue: number[]
  orders: number[]
}> = ({ labels, revenue, orders }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const data: ChartData<'line'> = {
      labels,
      datasets: [
        {
          label: 'Doanh thu',
          data: revenue,
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          yAxisID: 'y',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: 'Đơn hàng',
          data: orders,
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          yAxisID: 'y1',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    }

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            color: '#64748b'
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 0) {
                const amount = Number(ctx.raw) || 0
                return `Doanh thu: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}`
              } else {
                return `Đơn hàng: ${ctx.raw}`
              }
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 13, weight: 'bold' } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#64748b',
            font: { size: 13, weight: 'bold' },
            callback: (tickValue) =>
              new Intl.NumberFormat('vi-VN', {
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(Number(tickValue))
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { color: '#64748b', font: { size: 13, weight: 'bold' }, stepSize: 1 }
        }
      }
    }

    const chart = new ChartJS(chartRef.current, {
      type: 'line',
      data,
      options
    })

    return () => chart.destroy()
  }, [labels, revenue, orders])

  return (
    <div className="h-72">
      <canvas ref={chartRef} />
    </div>
  )
}

const mapDateLabelToVietnamese = (label: string, groupBy: string) => {
  if (groupBy === 'day') {
    const date = new Date(label)
    if (!Number.isNaN(date.getTime())) {
      const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
      return days[date.getDay()]
    }
  }
  return label
}

export const ManagerDashboard = () => {
  const { clusters: scopedClusters, isLoading: isScopeLoading, refreshScope } = useManagerScope()
  const [summaryRange, setSummaryRange] = useState<RangeOption>('month')
  const [chartRange, setChartRange] = useState<RangeOption>('week')

  const [summaryRawData, setSummaryRawData] = useState<AdminDashboardResponse['data'] | null>(null)
  const [chartRawData, setChartRawData] = useState<AdminDashboardResponse['data'] | null>(null)

  const [isSummaryLoading, setIsSummaryLoading] = useState(true)
  const [isChartLoading, setIsChartLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const [showSummaryRangePicker, setShowSummaryRangePicker] = useState(false)
  const [showChartRangePicker, setShowChartRangePicker] = useState(false)

  const fetchSummaryDashboard = async (selectedRange: RangeOption) => {
    try {
      setIsSummaryLoading(true)
      const { from, to, groupBy } = getDateRange(selectedRange)
      const response = await adminDashboardApi.getDashboard({ from, to, groupBy })
      setSummaryRawData(response.data)
    } catch (fetchError: any) {
      setError(fetchError?.response?.data?.message || 'Failed to load summary data')
      toast.error('Lỗi khi tải dữ liệu tổng quan')
    } finally {
      setIsSummaryLoading(false)
    }
  }

  const fetchChartDashboard = async (selectedRange: RangeOption) => {
    try {
      setIsChartLoading(true)
      const { from, to, groupBy } = getDateRange(selectedRange)
      const response = await adminDashboardApi.getDashboard({ from, to, groupBy })
      setChartRawData(response.data)
    } catch (fetchError: any) {
      setError(fetchError?.response?.data?.message || 'Failed to load chart data')
      toast.error('Lỗi khi tải dữ liệu biểu đồ')
    } finally {
      setIsChartLoading(false)
    }
  }

  useEffect(() => {
    fetchSummaryDashboard(summaryRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryRange])

  useEffect(() => {
    fetchChartDashboard(chartRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartRange])

  const scopedClusterIds = useMemo(
    () => new Set(scopedClusters.map((cluster) => cluster.id)),
    [scopedClusters]
  )

  const summaryRangeLabel = RANGE_OPTIONS.find((o) => o.value === summaryRange)?.label ?? 'Tháng này'
  const chartRangeLabel = RANGE_OPTIONS.find((o) => o.value === chartRange)?.label ?? 'Tuần này'

  const { summaryData, listData } = useMemo(() => {
    if (!summaryRawData) return { summaryData: null, listData: null }

    const scopedPods = summaryRawData.pods.list.filter(
      (pod) => !!pod.cluster_id && scopedClusterIds.has(String(pod.cluster_id))
    )

    const scopedPodIds = new Set(scopedPods.map((pod) => pod.id))
    const scopedBookings = summaryRawData.bookings.list.filter((booking) => scopedPodIds.has(String(booking.pod_id)))
    const scopedIncidents = summaryRawData.incidents.list.filter((incident) => scopedPodIds.has(String(incident.pod_id)))

    const bookingsByStatus = scopedBookings.reduce<Record<string, number>>((acc, booking) => {
      const key = booking.status || 'UNKNOWN'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const podMap = new Map<string, DashboardPod>(scopedPods.map((pod) => [pod.id, pod]))
    const clusterMap = new Map<string, string>(scopedClusters.map((c) => [c.id, c.name]))

    return {
      summaryData: {
        bookings: {
          totalInRange: scopedBookings.length,
          byStatus: bookingsByStatus
        },
        ordersInRange: summaryRawData.summary.ordersInRange ?? 0,
        revenue: {
          totalInRange: summaryRawData.summary.revenueInRange ?? summaryRawData.bookings.revenue?.total ?? 0
        }
      },
      listData: {
        latestBookings: [...scopedBookings]
          .sort((a, b) => new Date(b.start_time ?? 0).getTime() - new Date(a.start_time ?? 0).getTime())
          .slice(0, 5)
          .map((booking) => {
            const pod = podMap.get(booking.pod_id ?? '')
            const clusterName = pod?.cluster_id ? clusterMap.get(String(pod.cluster_id)) : '-'

            return {
              id: booking.id,
              podCode: pod?.code ?? booking.pod_id ?? '-',
              clusterName: clusterName ?? '-',
              userName: (booking.user as { name?: string } | undefined)?.name ?? '-',
              startTime: booking.start_time ?? '',
              endTime: booking.end_time ?? '',
              status: booking.status
            }
          }),
        latestIncidents: [...scopedIncidents]
          .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
          .slice(0, 5)
          .map((incident) => {
            const pod = podMap.get(incident.pod_id ?? '')
            const clusterName = pod?.cluster_id ? clusterMap.get(String(pod.cluster_id)) : '-'
            return {
              id: incident.id,
              podCode: pod?.code ?? incident.pod_id ?? '-',
              clusterName: clusterName ?? '-',
              severity: incident.severity ?? '-',
              status: incident.status,
              created_at: incident.created_at ?? ''
            }
          })
      }
    }
  }, [summaryRawData, scopedClusterIds, scopedClusters])

  const chartData = useMemo(() => {
    if (!chartRawData) return null

    const scopedPods = chartRawData.pods.list.filter(
      (pod) => !!pod.cluster_id && scopedClusterIds.has(String(pod.cluster_id))
    )

    const scopedPodIds = new Set(scopedPods.map((pod) => pod.id))
    const scopedBookings = chartRawData.bookings.list.filter((booking) => scopedPodIds.has(String(booking.pod_id)))

    const bookingsByStatus = scopedBookings.reduce<Record<string, number>>((acc, booking) => {
      const key = booking.status || 'UNKNOWN'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return {
      bookingStatusRates:
        chartRawData.charts?.bookingStatus ??
        Object.entries(bookingsByStatus).map(([status, count]) => ({
          status,
          count,
          rate: Math.round((count / Math.max(scopedBookings.length, 1)) * 100)
        })),
      revenueTrend: chartRawData.charts?.revenueTrend?.points ?? [],
      groupBy: chartRawData.charts?.revenueTrend?.groupBy || 'hour'
    }
  }, [chartRawData, scopedClusterIds])

  const isPageLoading = isSummaryLoading || isChartLoading || isScopeLoading

  const handleRefresh = async () => {
    try {
      await Promise.all([refreshScope(), fetchSummaryDashboard(summaryRange), fetchChartDashboard(chartRange)])
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

  if (!summaryData || !chartData || !listData) {
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
          <h1 className="text-3xl font-bold text-gray-900">Bảng Điều Khiển</h1>
          <p className="text-gray-500 mt-1">Tổng quan hoạt động trong khu vực bạn quản lý.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isPageLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isPageLoading ? 'animate-spin' : ''}`} />
            Làm mới
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


          <div className="flex items-center justify-between mb-3 mt-6">
            <SectionTitle icon={<Package className="w-4 h-4" />}>Tổng Quan Hoạt Động</SectionTitle>
            <div className="relative">
              <button
                onClick={() => setShowSummaryRangePicker((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              >
                {summaryRangeLabel}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showSummaryRangePicker && (
                <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSummaryRange(opt.value)
                        setShowSummaryRangePicker(false)
                      }}
                      className={`w-full px-4 py-2 text-left text-xs hover:bg-gray-50 transition-colors ${summaryRange === opt.value ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SummaryCard
              title={`Tổng Booking`}
              value={summaryData.bookings.totalInRange}
              icon={<Calendar className="w-5 h-5 text-green-600" />}
              iconBg="bg-green-50"
              extra={Object.entries(summaryData.bookings.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <StatusBadge status={status} />
                  <span className="font-semibold text-gray-700">{count}</span>
                </div>
              ))}
            />

            <SummaryCard
              title={`Tổng Đơn Hàng`}
              value={summaryData.ordersInRange}
              icon={<Package className="w-5 h-5 text-blue-600" />}
              iconBg="bg-blue-50"
            />

            <SummaryCard
              title={`Tổng Doanh Thu`}
              value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summaryData.revenue.totalInRange)}
              icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
              iconBg="bg-purple-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">Doanh thu và Đơn hàng</h2>
                <div className="relative">
                  <button
                    onClick={() => setShowChartRangePicker((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    {chartRangeLabel}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showChartRangePicker && (
                    <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                      {RANGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setChartRange(opt.value)
                            setShowChartRangePicker(false)
                          }}
                          className={`w-full px-4 py-2 text-left text-xs hover:bg-gray-50 transition-colors ${chartRange === opt.value ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {chartData.revenueTrend.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8 my-auto">Không có dữ liệu trong thời gian này</p>
              ) : (
                <div className="flex-1">
                  <LineChart
                    labels={chartData.revenueTrend.map((point) => mapDateLabelToVietnamese(point.label, chartData.groupBy))}
                    revenue={chartData.revenueTrend.map((point) => point.amount)}
                    orders={chartData.revenueTrend.map((point) => point.orders ?? 0)}
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Trạng thái Booking</h2>
              {chartData.bookingStatusRates.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Không có dữ liệu booking</p>
              ) : (
                <DoughnutChart
                  labels={chartData.bookingStatusRates.map((item) => item.status)}
                  values={chartData.bookingStatusRates.map((item) => item.count)}
                  colors={chartData.bookingStatusRates.map((item, index) => statusColor(item.status, index))}
                />
              )}
            </div>
          </div>

          <div className="mb-3">
            <SectionTitle icon={<Package className="w-4 h-4" />}>Hoạt động gần đây</SectionTitle>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Booking Mới Nhất</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Pod</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Cụm Pod (Cluster)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Trạng thái</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Bắt đầu lúc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listData.latestBookings.length > 0 ? listData.latestBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">{booking.podCode}</td>
                        <td className="px-6 py-4 text-gray-600">{booking.clusterName}</td>
                        <td className="px-6 py-4"><StatusBadge status={booking.status} /></td>
                        <td className="px-6 py-4 text-gray-600">{booking.startTime ? new Date(booking.startTime).toLocaleTimeString() : '-'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Không có booking trong thời gian này</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Sự Cố Gần Nhất</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Pod</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Cụm Pod (Cluster)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Mức độ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Trạng thái</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listData.latestIncidents.length > 0 ? listData.latestIncidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">{incident.podCode}</td>
                        <td className="px-6 py-4 text-gray-600">{incident.clusterName}</td>
                        <td className="px-6 py-4 text-gray-600">{incident.severity}</td>
                        <td className="px-6 py-4"><StatusBadge status={incident.status} /></td>
                        <td className="px-6 py-4 text-gray-600">{incident.created_at ? new Date(incident.created_at).toLocaleDateString() : '-'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Không có sự cố trong thời gian này</td>
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
