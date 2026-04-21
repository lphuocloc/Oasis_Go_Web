import React, { useEffect, useState, useMemo, useRef } from 'react'
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  type ChartData,
  type ChartOptions,
  Legend,
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
import { adminStatsApi, type AdminStatsResponse } from '../../api/lib/statsApi'
import { initUserSocket } from '../../lib/socket'
import {
  TrendingUp, AlertCircle, Calendar, Package,
  RefreshCw, ChevronDown, DollarSign,
  Star, Tag, MapPin, ShieldCheck, Clock, ShoppingCart,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { toast } from 'react-toastify'
import { DatePicker, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

ChartJS.register(
  BarController,
  DoughnutController,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineController,
  LineElement,
  Tooltip,
  Legend
)

// ── Constants ─────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

type RangeOption = 'today' | 'week' | 'month' | 'custom'

const RANGE_OPTIONS: { label: string; value: RangeOption }[] = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Tuần này', value: 'week' },
  { label: 'Tháng này', value: 'month' },
  { label: 'Tùy chọn', value: 'custom' }
]

const getDateRange = (range: RangeOption): { from: Date; to: Date; groupBy: DashboardFilters['groupBy'] } => {
  const now = new Date()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  if (range === 'today') {
    return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0), to: endOfDay, groupBy: 'day' }
  } else if (range === 'week') {
    const d = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (d === 0 ? 6 : d - 1))
    monday.setHours(0, 0, 0, 0)
    return { from: monday, to: endOfDay, groupBy: 'day' }
  } else {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), to: endOfDay, groupBy: 'day' }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  INACTIVE: 'bg-gray-100 text-gray-800',
  AUTHORIZED: 'bg-green-100 text-green-800',
  INITIATED: 'bg-blue-100 text-blue-800',
  FAILED: 'bg-red-100 text-red-800',
  CHARGE: 'bg-blue-100 text-blue-800',
  REFUND: 'bg-orange-100 text-orange-800',
  DISCOUNT: 'bg-purple-100 text-purple-800',
  PENALTY: 'bg-red-100 text-red-800',
}

const TX_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

const StatusBadge: React.FC<{ status: string; colorMap?: Record<string, string> }> = ({ status, colorMap = STATUS_COLORS }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colorMap[status] ?? 'bg-gray-100 text-gray-700'}`}>
    {status}
  </span>
)

const StarRating: React.FC<{ rating: number; max?: number }> = ({ rating, max = 5 }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ))}
    <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
  </div>
)

const TrendBadge: React.FC<{ value?: number; label?: string }> = ({ value, label }) => {
  if (value === undefined || value === 0) return null;
  const isPositive = value > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const colorClass = isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';

  return (
    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${colorClass} mb-1 shadow-sm border border-current border-opacity-10`} title={label}>
      <Icon className="w-3 h-3" />
      <span>{Math.abs(value)}%</span>
    </div>
  );
};

const SummaryCard: React.FC<{
  title: string
  value: React.ReactNode
  icon: React.ReactNode
  iconBg: string
  extra?: React.ReactNode
  badge?: React.ReactNode
}> = ({ title, value, icon, iconBg, extra, badge }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
    </div>
    <div className="flex items-end justify-between gap-2">
      <p className="text-3xl font-bold text-gray-900 leading-none">{value}</p>
      {badge}
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

const DoughnutCountChart: React.FC<{ labels: string[]; values: number[] }> = ({ labels, values }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const data: ChartData<'doughnut'> = {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, idx) => TX_COLORS[idx % TX_COLORS.length]),
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 6
        }
      ]
    }

    const options: ChartOptions<'doughnut'> = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 14,
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

    const chart = new ChartJS(chartRef.current, { type: 'doughnut', data, options })
    return () => chart.destroy()
  }, [labels, values])

  return (
    <div className="h-72">
      <canvas ref={chartRef} />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────


const mapDateLabelToVietnamese = (label: string, groupBy: string) => {
  if (groupBy === 'day') {
    const date = new Date(label)
    if (!Number.isNaN(date.getTime())) {
      return `${date.getDate()}/${date.getMonth() + 1}`
    }
  }
  return label
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

export const AdminDashboard = () => {
  const [kpiDashData, setKpiDashData] = useState<AdminDashboardResponse['data'] | null>(null)
  const [kpiStatsData, setKpiStatsData] = useState<AdminStatsResponse['data'] | null>(null)
  const [analyticsDashData, setAnalyticsDashData] = useState<AdminDashboardResponse['data'] | null>(null)
  const [analyticsStatsData, setAnalyticsStatsData] = useState<AdminStatsResponse['data'] | null>(null)
  const [isKpiLoading, setIsKpiLoading] = useState(true)
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true)
  const [kpiRange, setKpiRange] = useState<RangeOption>('month')
  const [analyticsRange, setAnalyticsRange] = useState<RangeOption>('week')
  const [kpiCustomRange, setKpiCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().startOf('month'), dayjs()])
  const [analyticsCustomRange, setAnalyticsCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().startOf('week'), dayjs()])
  const [showKpiRangePicker, setShowKpiRangePicker] = useState(false)
  const [showAnalyticsRangePicker, setShowAnalyticsRangePicker] = useState(false)
  const [isKpiPickerOpen, setIsKpiPickerOpen] = useState(false)
  const [isAnalyticsPickerOpen, setIsAnalyticsPickerOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Sync custom range when preset changes (if not 'custom')
  useEffect(() => {
    if (kpiRange !== 'custom') {
      const { from, to } = getDateRange(kpiRange)
      setKpiCustomRange([dayjs(from), dayjs(to)])
    }
  }, [kpiRange])

  useEffect(() => {
    if (analyticsRange !== 'custom') {
      const { from, to } = getDateRange(analyticsRange)
      setAnalyticsCustomRange([dayjs(from), dayjs(to)])
    }
  }, [analyticsRange])

  const fetchKpiData = async (selectedRange: RangeOption, customDates?: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    setIsKpiLoading(true)
    let rangeQuery: { from: Date; to: Date; groupBy: DashboardFilters['groupBy'] }
    
    if (selectedRange === 'custom' && customDates) {
      rangeQuery = {
        from: customDates[0].startOf('day').toDate(),
        to: customDates[1].endOf('day').toDate(),
        groupBy: 'day'
      }
    } else {
      rangeQuery = getDateRange(selectedRange === 'custom' ? 'month' : selectedRange)
    }
    
    const { from, to, groupBy } = rangeQuery

    const [dashResult, statsResult] = await Promise.allSettled([
      adminDashboardApi.getDashboard({ from, to, groupBy }),
      adminStatsApi.getStats({ from, to })
    ])

    if (dashResult.status === 'fulfilled') {
      setKpiDashData(dashResult.value.data)
    } else {
      toast.error('Failed to load operations data')
    }

    if (statsResult.status === 'fulfilled') {
      setKpiStatsData(statsResult.value.data)
    }

    setIsKpiLoading(false)
  }

  const fetchAnalyticsData = async (selectedRange: RangeOption, customDates?: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    setIsAnalyticsLoading(true)
    let rangeQuery: { from: Date; to: Date; groupBy: DashboardFilters['groupBy'] }
    
    if (selectedRange === 'custom' && customDates) {
      rangeQuery = {
        from: customDates[0].startOf('day').toDate(),
        to: customDates[1].endOf('day').toDate(),
        groupBy: 'day'
      }
    } else {
      rangeQuery = getDateRange(selectedRange === 'custom' ? 'month' : selectedRange)
    }
    
    const { from, to, groupBy } = rangeQuery

    const [dashResult, statsResult] = await Promise.allSettled([
      adminDashboardApi.getDashboard({ from, to, groupBy }),
      adminStatsApi.getStats({ from, to })
    ])

    if (dashResult.status === 'fulfilled') {
      setAnalyticsDashData(dashResult.value.data)
    } else {
      toast.error('Failed to load analytics data')
    }

    if (statsResult.status === 'fulfilled') {
      setAnalyticsStatsData(statsResult.value.data)
    }

    setIsAnalyticsLoading(false)
  }

  useEffect(() => {
    fetchKpiData(kpiRange, kpiCustomRange)
  }, [kpiRange, kpiCustomRange, refreshTrigger])

  useEffect(() => {
    fetchAnalyticsData(analyticsRange, analyticsCustomRange)
  }, [analyticsRange, analyticsCustomRange, refreshTrigger])

  useEffect(() => {
    const socket = initUserSocket()
    if (!socket) return

    const handleNewData = () => {
      setRefreshTrigger(prev => prev + 1)
    }

    socket.on('user:notification', handleNewData)
    socket.on('dashboard:refresh', handleNewData)

    return () => {
      socket.off('user:notification', handleNewData)
      socket.off('dashboard:refresh', handleNewData)
    }
  }, [])

  const isLoading = isKpiLoading || isAnalyticsLoading

  const kpiRangeLabel = useMemo(() => {
    if (kpiRange === 'custom' && kpiCustomRange) {
      return `${kpiCustomRange[0].format('DD/MM')} - ${kpiCustomRange[1].format('DD/MM')}`
    }
    return RANGE_OPTIONS.find(o => o.value === kpiRange)?.label ?? 'Tháng này'
  }, [kpiRange, kpiCustomRange])

  const analyticsRangeLabel = useMemo(() => {
    if (analyticsRange === 'custom' && analyticsCustomRange) {
      return `${analyticsCustomRange[0].format('DD/MM')} - ${analyticsCustomRange[1].format('DD/MM')}`
    }
    return RANGE_OPTIONS.find(o => o.value === analyticsRange)?.label ?? 'Tuần này'
  }, [analyticsRange, analyticsCustomRange])

  const locations = useMemo(() => analyticsStatsData?.locations ?? [], [analyticsStatsData])
  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => b.totalRevenue - a.totalRevenue),
    [locations]
  )
  const revenueByMethod = useMemo(() => analyticsStatsData?.revenue.byMethod ?? [], [analyticsStatsData])
  const recentTransactions = useMemo(() => analyticsStatsData?.revenue.recentTransactions ?? [], [analyticsStatsData])
  const latestReviews = useMemo(() => analyticsStatsData?.reviews.latest ?? [], [analyticsStatsData])
  const ratingDistribution = useMemo(() => analyticsStatsData?.reviews.ratingDistribution ?? [], [analyticsStatsData])
  const topVouchers = useMemo(() => analyticsStatsData?.vouchers.topVouchers ?? [], [analyticsStatsData])

  // ── Derived values — computed FE-side from raw BE lists ───────────────────
  // BE /dashboard returns raw lists; byStatus, charts & latest entries are derived here.

  const bookingsByStatus = useMemo(
    () => analyticsDashData?.bookings.list.reduce<Record<string, number>>((acc, b) => {
      const k = b.status || 'UNKNOWN'; acc[k] = (acc[k] || 0) + 1; return acc
    }, {}) ?? {},
    [analyticsDashData]
  )

  const incidentsByStatus = useMemo(
    () => analyticsDashData?.incidents.list.reduce<Record<string, number>>((acc, i) => {
      const k = i.status || 'UNKNOWN'; acc[k] = (acc[k] || 0) + 1; return acc
    }, {}) ?? {},
    [analyticsDashData]
  )

  /** id → pod — used to resolve podCode in booking/incident rows */
  const podMap = useMemo(
    () => new Map<string, DashboardPod>(analyticsDashData?.pods.list.map(p => [p.id, p]) ?? []),
    [analyticsDashData]
  )

  const bookingsStatusPie = useMemo(
    () => Object.entries(bookingsByStatus).map(([status, count]) => ({ status, count })),
    [bookingsByStatus]
  )

  const incidentsStatusPie = useMemo(
    () => Object.entries(incidentsByStatus).map(([status, count]) => ({ status, count })),
    [incidentsByStatus]
  )

  const latestBookings = useMemo(() => {
    if (!analyticsDashData) return []
    return [...analyticsDashData.bookings.list]
      .sort((a, b) => new Date(b.start_time ?? 0).getTime() - new Date(a.start_time ?? 0).getTime())
      .slice(0, 5)
      .map(b => ({
        id: b.id,
        podCode: podMap.get(b.pod_id ?? '')?.code ?? b.pod_id ?? '—',
        userName: (b.user as { name?: string } | undefined)?.name ?? '—',
        startTime: b.start_time ?? '',
        status: b.status
      }))
  }, [analyticsDashData, podMap])


  const revenueTrend = useMemo(() => analyticsDashData?.charts?.revenueTrend?.points ?? [], [analyticsDashData])
  const groupBy = analyticsDashData?.charts?.revenueTrend?.groupBy || 'hour'

  const latestIncidents = useMemo(() => {
    if (!analyticsDashData) return []
    return [...analyticsDashData.incidents.list]
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        podCode: podMap.get(i.pod_id ?? '')?.code ?? i.pod_id ?? '—',
        severity: i.severity ?? '—',
        status: i.status,
        created_at: i.created_at ?? ''
      }))
  }, [analyticsDashData, podMap])

  return (
    <div className="p-8 bg-gray-50 min-h-screen">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bảng Điều Khiển</h1>
          <p className="text-gray-500 mt-1">Tổng quan hoạt động trên toàn hệ thống Oasis Go.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              void fetchKpiData(kpiRange)
              void fetchAnalyticsData(analyticsRange)
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Loading Skeleton ─────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── Section 1: Overview KPIs ───────────────────────────────── */}
          <div className="flex items-center justify-between mb-3 mt-6">
            <SectionTitle icon={<Package className="w-4 h-4" />}>Tổng Quan Hoạt Động {"&"} Doanh Thu</SectionTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {kpiRange === 'custom' || isKpiPickerOpen ? (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <ConfigProvider locale={viVN}>
                      <RangePicker
                        open={isKpiPickerOpen}
                        onOpenChange={setIsKpiPickerOpen}
                        value={kpiCustomRange}
                        onChange={(dates) => { 
                          setKpiCustomRange(dates as [dayjs.Dayjs, dayjs.Dayjs]); 
                          if (dates) setKpiRange('custom');
                        }}
                        className="h-8 shadow-sm transition-all hover:border-blue-300"
                        placeholder={['Bắt đầu', 'Kết thúc']}
                      />
                    </ConfigProvider>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsKpiPickerOpen(true)}
                    className="flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm animate-in fade-in zoom-in duration-200"
                    title="Chọn khoảng ngày tùy chỉnh"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowKpiRangePicker(v => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-xs font-medium shadow-sm transition-all ${
                    kpiRange !== 'custom' ? 'border-blue-200 text-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw className="w-3 h-3 text-gray-400 group-hover:rotate-180 transition-transform" />
                  {RANGE_OPTIONS.find(o => o.value === kpiRange)?.label ?? 'Tháng này'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showKpiRangePicker ? 'rotate-180' : ''}`} />
                </button>
                {showKpiRangePicker && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowKpiRangePicker(false)} />
                    <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in duration-100">
                      {RANGE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setKpiRange(opt.value); setShowKpiRangePicker(false) }}
                          className={`w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 transition-colors ${kpiRange === opt.value ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <SummaryCard
              title={`Doanh thu`}
              value={kpiStatsData ? formatCurrency(kpiStatsData.revenue.periodRevenue) : '—'}
              icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
              iconBg="bg-emerald-50"
              badge={<TrendBadge value={kpiStatsData?.revenue.comparison?.revenueChange} label="So với kỳ trước" />}
            />

            <SummaryCard
              title={`Tổng Booking`}
              value={kpiDashData?.summary.bookingsInRange ?? '—'}
              icon={<Calendar className="w-5 h-5 text-blue-600" />}
              iconBg="bg-blue-50"
              badge={<TrendBadge value={kpiDashData?.summary.comparison?.bookingsChange} label="So với kỳ trước" />}
            />

            <SummaryCard
              title="Tổng Order"
              value={kpiDashData?.summary.ordersInRange ?? 0}
              icon={<ShoppingCart className="w-5 h-5 text-sky-600" />}
              iconBg="bg-sky-50"
              badge={<TrendBadge value={kpiDashData?.summary.comparison?.ordersChange} label="So với kỳ trước" />}
            />

          </div>

          <div className="flex items-center justify-between mb-3">
            <SectionTitle icon={<TrendingUp className="w-4 h-4" />}>Biểu đồ Thống kê</SectionTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {analyticsRange === 'custom' || isAnalyticsPickerOpen ? (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <ConfigProvider locale={viVN}>
                      <RangePicker
                        open={isAnalyticsPickerOpen}
                        onOpenChange={setIsAnalyticsPickerOpen}
                        value={analyticsCustomRange}
                        onChange={(dates) => { 
                          setAnalyticsCustomRange(dates as [dayjs.Dayjs, dayjs.Dayjs]); 
                          if (dates) setAnalyticsRange('custom');
                        }}
                        className="h-8 shadow-sm transition-all hover:border-blue-300"
                        placeholder={['Bắt đầu', 'Kết thúc']}
                      />
                    </ConfigProvider>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAnalyticsPickerOpen(true)}
                    className="flex items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm animate-in fade-in zoom-in duration-200"
                    title="Chọn khoảng ngày tùy chỉnh"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowAnalyticsRangePicker(v => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-xs font-medium shadow-sm transition-all ${
                    analyticsRange !== 'custom' ? 'border-blue-200 text-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw className="w-3 h-3 text-gray-400 group-hover:rotate-180 transition-transform" />
                  {RANGE_OPTIONS.find(o => o.value === analyticsRange)?.label ?? 'Tuần này'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAnalyticsRangePicker ? 'rotate-180' : ''}`} />
                </button>
                {showAnalyticsRangePicker && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowAnalyticsRangePicker(false)} />
                    <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-100 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in duration-100">
                      {RANGE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setAnalyticsRange(opt.value); setShowAnalyticsRangePicker(false) }}
                          className={`w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 transition-colors ${analyticsRange === opt.value ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Revenue Trend Chart - span 2 columns */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-900">Doanh thu và Đơn hàng ({analyticsRangeLabel})</h2>
              </div>
              {revenueTrend.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8 my-auto">Không có dữ liệu trong thời gian này</p>
              ) : (
                <div className="flex-1">
                  <LineChart
                    labels={revenueTrend.map((point) => mapDateLabelToVietnamese(point.label, groupBy))}
                    revenue={revenueTrend.map((point) => point.amount)}
                    orders={revenueTrend.map((point) => point.orders ?? 0)}
                  />
                </div>
              )}
            </div>

            {/* Booking Status Distribution */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Trạng thái Booking</h2>
              {bookingsStatusPie.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8 my-auto">Không có dữ liệu booking</p>
              ) : (
                <div className="flex-1 max-h-72">
                  <DoughnutCountChart
                    labels={bookingsStatusPie.map(item => item.status)}
                    values={bookingsStatusPie.map(item => item.count)}
                  />
                </div>
              )}
            </div>

            {/* Payment Method Distribution */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h2 className="text-base font-semibold text-gray-900 mb-5">PT Thanh toán ({analyticsRangeLabel})</h2>
              {revenueByMethod.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8 my-auto">Không có dữ liệu thanh toán</p>
              ) : (
                <div className="flex-1 max-h-72">
                  <DoughnutCountChart
                    labels={revenueByMethod.map(item => item.method)}
                    values={revenueByMethod.map(item => item.count)}
                  />
                </div>
              )}
            </div>

            {/* Incident Status Distribution */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Trạng thái Sự cố</h2>
              {incidentsStatusPie.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8 my-auto">Không có dữ liệu sự cố</p>
              ) : (
                <div className="flex-1 max-h-72">
                  <DoughnutCountChart
                    labels={incidentsStatusPie.map(item => item.status)}
                    values={incidentsStatusPie.map(item => item.count)}
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Phân bố Đánh giá</h2>
              {ratingDistribution.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8 my-auto">Không có dữ liệu đánh giá</p>
              ) : (
                <div className="flex-1 max-h-72">
                  <DoughnutCountChart
                    labels={ratingDistribution.map(item => `${item.rating} sao`)}
                    values={ratingDistribution.map(item => item.count)}
                  />
                </div>
              )}
            </div>

          </div>

          {/* ── Section 4: Latest Bookings & Incidents ────────────────────── */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Booking Mới Nhất</h2>
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pod</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người Dùng</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bắt đầu lúc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {latestBookings.length ? (
                      latestBookings.map(b => (
                        <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-gray-900">{b.podCode}</td>
                          <td className="px-6 py-3 text-gray-600">{b.userName}</td>
                          <td className="px-6 py-3"><StatusBadge status={b.status} /></td>
                          <td className="px-6 py-3 text-gray-500">
                            {b.startTime ? new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">Không có booking trong khoảng thời gian này</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Sự Cố Gần Nhất</h2>
                <AlertCircle className="w-4 h-4 text-gray-400" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pod</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mức độ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {latestIncidents.length ? (
                      latestIncidents.map(i => (
                        <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-gray-900">{i.podCode}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${i.severity === 'HIGH' || i.severity === 'CRITICAL' ? 'bg-red-100 text-red-800'
                              : i.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-700'
                              }`}>{i.severity}</span>
                          </td>
                          <td className="px-6 py-3"><StatusBadge status={i.status} /></td>
                          <td className="px-6 py-3 text-gray-500">
                            {i.created_at ? new Date(i.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">Không có sự cố trong khoảng thời gian này</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Section 5: Location Performance ──────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Hiệu suất hoạt động theo Khu vực</h2>
              <MapPin className="w-4 h-4 text-gray-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khu vực</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Pod</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pod Hoạt động</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Lượt Booking</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedLocations.length ? (
                    sortedLocations.map(loc => (
                      <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-gray-900">{loc.name}</td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs capitalize">{loc.type}</span>
                        </td>
                        <td className="px-6 py-3 text-right text-gray-700">{loc.totalPods}</td>
                        <td className="px-6 py-3 text-right">
                          <span className="text-emerald-600 font-semibold">{loc.activePods}</span>
                        </td>
                        <td className="px-6 py-3 text-right text-gray-700">{loc.totalBookings}</td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-900">{formatCurrency(loc.totalRevenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Không có dữ liệu khu vực</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Section 7: Recent Transactions & Pending Reviews ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Giao dịch gần đây</h2>
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentTransactions.length ? (
                      recentTransactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3"><StatusBadge status={tx.type} /></td>
                          <td className={`px-6 py-3 text-right font-semibold ${tx.type === 'REFUND' ? 'text-orange-600' : 'text-gray-900'}`}>
                            {tx.type === 'REFUND' ? '-' : ''}{formatCurrency(tx.amount)}
                          </td>
                          <td className="px-6 py-3"><StatusBadge status={tx.status} /></td>
                          <td className="px-6 py-3 text-gray-500">
                            {new Date(tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">Không có giao dịch trong khoảng thời gian này</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reviews Moderation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Đánh giá chờ duyệt</h2>
                <div className="flex items-center gap-2">
                  {analyticsStatsData && analyticsStatsData.reviews.pendingModeration > 0 && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold">
                      {analyticsStatsData.reviews.pendingModeration} pending
                    </span>
                  )}
                  <ShieldCheck className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người Dùng</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pod</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đánh giá</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bình luận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {latestReviews.length ? (
                      latestReviews.map(review => (
                        <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{review.userName}</td>
                          <td className="px-6 py-3 text-gray-600">{review.podCode}</td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <StarRating rating={review.rating} />
                          </td>
                          <td className="px-6 py-3 text-gray-500 max-w-xs truncate">{review.comment ?? '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">Không có đánh giá nào chờ duyệt</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Section 8: Top Vouchers ───────────────────────────────────── */}
          {analyticsStatsData && topVouchers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Voucher sử dụng nhiều nhất</h2>
                <Tag className="w-4 h-4 text-gray-400" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mô tả</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượt dùng</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng giảm giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topVouchers.map(v => (
                      <tr key={v.code} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 font-mono font-bold text-gray-900 text-xs">{v.code}</td>
                        <td className="px-6 py-3 text-gray-600">{v.description}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v.discountType === 'PERCENT' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {v.discountType}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-700">{v.usageCount}</td>
                        <td className="px-6 py-3 text-right font-semibold text-orange-600">{formatCurrency(v.totalDiscount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}



