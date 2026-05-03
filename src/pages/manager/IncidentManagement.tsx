import { useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, Eye, RefreshCw, Search, XCircle, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  INCIDENT_STATUSES,
  incidentApi,
  type DamageReportItem,
  type IncidentItem,
  type IncidentSeverity,
  type IncidentStatus,
} from '../../api/lib/incidentApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { bookingApi } from '../../api/lib/bookingApi'
import { bookingOrderApi, type OrderIncidentItem, type BookingOrderDetail } from '../../api/lib/bookingOrderApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'
import { useCheckinContext } from '../../components/common/ManagerCheckinGate'
import { initUserSocket } from '../../lib/socket'

const statusBadgeClass = (status: IncidentStatus) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'DISMISSED':
      return 'bg-rose-50 text-rose-700 border border-rose-200'
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200'
  }
}

const statusDotClass = (status: IncidentStatus) => {
  switch (status) {
    case 'PENDING': return 'bg-amber-500'
    case 'RESOLVED': return 'bg-emerald-500'
    case 'DISMISSED': return 'bg-rose-500'
    default: return 'bg-gray-400'
  }
}

export interface IncidentListFilters {
  statuses: IncidentStatus[]
  clusterIds: string[]
  dateRange: [Date | null, Date | null]
}

const defaultFilters: IncidentListFilters = {
  statuses: [],
  clusterIds: [],
  dateRange: [null, null]
}

const translateStatus = (status: IncidentStatus) => {
  switch (status) {
    case 'PENDING': return 'Chờ xử lý'
    case 'RESOLVED': return 'Đã giải quyết'
    case 'DISMISSED': return 'Đã từ chối'
    default: return status
  }
}

const translateSeverity = (severity: IncidentSeverity) => {
  switch (severity) {
    case 'LOW': return 'Thấp'
    case 'MEDIUM': return 'Trung bình'
    case 'HIGH': return 'Cao'
    case 'CRITICAL': return 'Nghiêm trọng'
    default: return severity
  }
}

const severityBadgeClass = (severity: IncidentSeverity) => {
  switch (severity) {
    case 'LOW':
      return 'bg-slate-100 text-slate-700'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800'
    case 'CRITICAL':
      return 'bg-rose-100 text-rose-800 font-semibold'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('vi-VN')
}

export interface OrderIncidentGroup {
  type: 'ORDER' | 'SINGLE'
  id: string
  orderId?: string
  podId?: string | null
  podName?: string | null
  items: DamageReportItem[]
  totalEstimatedValue: number
  statusSet: Set<IncidentStatus>
  severitySet: Set<IncidentSeverity>
  latestCreatedAt: string
  cleanerName?: string | null
}

export const IncidentManagement = () => {
  const { clusters, refreshScope } = useManagerScope()
  const { isReadOnly } = useCheckinContext()

  const [reports, setReports] = useState<DamageReportItem[]>([])
  const [pods, setPods] = useState<PodItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'USER' | 'CLEANER'>('CLEANER')
  const [filters, setFilters] = useState<IncidentListFilters>(defaultFilters)
  const [draftFilters, setDraftFilters] = useState<IncidentListFilters>(defaultFilters)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailReport, setDetailReport] = useState<DamageReportItem | null>(null)
  const [detailIncident, setDetailIncident] = useState<IncidentItem | null>(null)

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isReviewSaving, setIsReviewSaving] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<DamageReportItem | OrderIncidentItem | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED')

  const [orderIncidents, setOrderIncidents] = useState<OrderIncidentItem[]>([])
  const [isOrderIncidentsLoading, setIsOrderIncidentsLoading] = useState(false)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [orderDetail, setOrderDetail] = useState<BookingOrderDetail | null>(null)
  const [isCreatingDamageBill, setIsCreatingDamageBill] = useState(false)

  const [detailGroup, setDetailGroup] = useState<OrderIncidentGroup | null>(null)
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null)
  const [expandedIncidentDetails, setExpandedIncidentDetails] = useState<IncidentItem | null>(null)
  const [isExpandedLoading, setIsExpandedLoading] = useState(false)

  const fetchPrimaryData = async () => {
    try {
      setIsLoading(true)

      const podsResponse = await podApi.getAll()

      const reportsResponse = await incidentApi.getDamageReports()

      setPods(podsResponse.data)
      setReports(reportsResponse.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to load damage reports')
      setReports([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPrimaryData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, refreshTrigger])

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

  const podMap = useMemo(() => new Map(pods.map((pod) => [pod.id, pod])), [pods])
  const clusterMap = useMemo(() => new Map(clusters.map((c) => [c.id, c])), [clusters])

  const tabReports = useMemo(() => {
    return reports.filter(report => {
      const isUser = report.incident_type === 'REPLENISHMENT_REQUEST'
      if (activeTab === 'USER') return isUser
      return !isUser
    })
  }, [reports, activeTab])

  const incidentStats = useMemo(() => {
    return tabReports.reduce<Record<IncidentStatus, number>>(
      (acc, report) => {
        acc[report.status] = (acc[report.status] ?? 0) + 1
        return acc
      },
      {
        PENDING: 0,
        RESOLVED: 0,
        DISMISSED: 0,
      }
    )
  }, [tabReports])

  const statusSummary = useMemo(() => {
    return INCIDENT_STATUSES.map((status) => {
      const count = incidentStats[status] || 0
      const percent = tabReports.length > 0 ? (count / tabReports.length) * 100 : 0
      return { status, count, percent }
    })
  }, [incidentStats, tabReports.length])

  const filteredReports = useMemo(() => {
    return tabReports.filter((report) => {
      // 1. Lọc theo text (search)
      const normalized = search.trim().toLowerCase()
      if (normalized) {
        const pod = report.context.pod_id ? podMap.get(report.context.pod_id) : null
        const clusterName = pod ? clusterMap.get(pod.cluster_id)?.name : ''
        const searchStr = [
          report.report_id,
          report.context.booking_id,
          report.description,
          report.context.cleaner_name,
          report.context.user_name,
          report.context.pod_name,
          pod?.code,
          pod?.name,
          clusterName,
          report.severity,
          report.status,
        ].join(' ').toLowerCase()
        if (!searchStr.includes(normalized)) return false
      }

      // 2. Lọc theo trạng thái
      if (filters.statuses.length > 0 && !filters.statuses.includes(report.status)) {
        return false
      }

      // 3. Lọc theo khu vực (Cluster)
      if (filters.clusterIds.length > 0) {
        const pod = report.context.pod_id ? podMap.get(report.context.pod_id) : null
        if (!pod || !filters.clusterIds.includes(pod.cluster_id)) {
          return false
        }
      }

      // 5. Lọc theo ngày tạo
      if (filters.dateRange[0]) {
        const reportDate = new Date(report.created_at)
        const start = new Date(filters.dateRange[0])
        start.setHours(0, 0, 0, 0)

        const end = filters.dateRange[1] ? new Date(filters.dateRange[1]) : new Date(filters.dateRange[0])
        end.setHours(23, 59, 59, 999)

        if (reportDate.getTime() < start.getTime() || reportDate.getTime() > end.getTime()) {
          return false
        }
      }

      return true
    })
  }, [tabReports, search, podMap, clusterMap, filters])

  const groupedReports = useMemo(() => {
    const groups = new Map<string, OrderIncidentGroup>()
    const singles: OrderIncidentGroup[] = []

    for (const report of filteredReports) {
      const orderId = report.context.booking_order_id || report.context.booking_id
      if (orderId) {
        if (!groups.has(orderId)) {
          groups.set(orderId, {
            type: 'ORDER',
            id: orderId,
            orderId: orderId,
            podId: report.context.pod_id,
            podName: report.context.pod_name,
            items: [],
            totalEstimatedValue: 0,
            statusSet: new Set(),
            severitySet: new Set(),
            latestCreatedAt: report.created_at,
            cleanerName: report.context.cleaner_name || report.context.user_name
          })
        }
        const group = groups.get(orderId)!
        group.items.push(report)
        group.totalEstimatedValue += report.pricing.estimated_total_value || 0
        group.statusSet.add(report.status)
        group.severitySet.add(report.severity)
        if (new Date(report.created_at) > new Date(group.latestCreatedAt)) {
          group.latestCreatedAt = report.created_at
        }
      } else {
        singles.push({
          type: 'SINGLE',
          id: report.report_id,
          items: [report],
          podId: report.context.pod_id,
          podName: report.context.pod_name,
          totalEstimatedValue: report.pricing.estimated_total_value || 0,
          statusSet: new Set([report.status]),
          severitySet: new Set([report.severity]),
          latestCreatedAt: report.created_at,
          cleanerName: report.context.cleaner_name || report.context.user_name
        })
      }
    }

    const result = [...Array.from(groups.values()), ...singles]
    result.sort((a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime())
    return result
  }, [filteredReports])

  const openGroupDetailModal = async (group: OrderIncidentGroup) => {
    setDetailGroup(group)
    setIsDetailOpen(true)
    setIsDetailLoading(true)
    setExpandedIncidentId(null)
    setExpandedIncidentDetails(null)

    try {
      if (group.type === 'ORDER' && group.orderId) {
        setIsOrderIncidentsLoading(true)

        let actualOrderId = group.orderId
        let incidentsData: OrderIncidentItem[] = []
        let orderDataResult: BookingOrderDetail | null = null

        // Try to fetch order data first
        try {
          orderDataResult = await bookingOrderApi.getById(actualOrderId)
        } catch (err) {
          // If 404, the provided ID might be a booking_id instead of booking_order_id
          try {
            const bookingData = await bookingApi.getById(actualOrderId)
            if (bookingData?.order_id) {
              actualOrderId = bookingData.order_id
              orderDataResult = await bookingOrderApi.getById(actualOrderId).catch(() => null)
            }
          } catch (err2) {
            console.error('Failed to resolve booking ID to order ID', err2)
          }
        }

        // Fetch incidents using the resolved actualOrderId
        try {
          incidentsData = await bookingOrderApi.getOrderIncidents(actualOrderId)
        } catch (err) {
          console.error('Failed to fetch order incidents', err)
        }

        setCurrentOrderId(actualOrderId)
        setOrderIncidents(incidentsData)
        setOrderDetail(orderDataResult)
        setDetailIncident(null)
        setDetailReport(null)
      } else {
        setCurrentOrderId(null)
        setOrderIncidents([])
        setDetailReport(group.items[0])
        const response = await incidentApi.getById(group.items[0].report_id)
        setDetailIncident(response.data)
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to load details')
    } finally {
      setIsDetailLoading(false)
      setIsOrderIncidentsLoading(false)
    }
  }

  const handleExpandIncident = async (incidentId: string) => {
    if (expandedIncidentId === incidentId) {
      setExpandedIncidentId(null)
      setExpandedIncidentDetails(null)
      return
    }
    setExpandedIncidentId(incidentId)
    setIsExpandedLoading(true)
    try {
      const res = await incidentApi.getById(incidentId)
      setExpandedIncidentDetails(res.data)
    } catch (err) {
      toast.error('Failed to load incident details')
    } finally {
      setIsExpandedLoading(false)
    }
  }

  const closeDetailModal = () => {
    setIsDetailOpen(false)
    setDetailGroup(null)
    setDetailReport(null)
    setDetailIncident(null)
    setCurrentOrderId(null)
    setOrderDetail(null)
    setOrderIncidents([])
    setExpandedIncidentId(null)
    setExpandedIncidentDetails(null)
  }

  const openReviewModal = (report: DamageReportItem | OrderIncidentItem) => {
    setReviewTarget(report)
    setReviewStatus('RESOLVED')
    setIsReviewModalOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!reviewTarget) return

    const targetId = 'report_id' in reviewTarget ? reviewTarget.report_id : reviewTarget.id

    try {
      setIsReviewSaving(true)
      await incidentApi.updateStatus(targetId, { status: reviewStatus })
      toast.success(reviewStatus === 'RESOLVED' ? 'Incident marked as RESOLVED' : 'Incident marked as DISMISSED')

      setIsReviewModalOpen(false)
      await fetchPrimaryData()

      if (detailIncident?.id === targetId) {
        const refreshed = await incidentApi.getById(targetId)
        setDetailIncident(refreshed.data)
      }

      if (currentOrderId) {
        const refreshedIncidents = await bookingOrderApi.getOrderIncidents(currentOrderId)
        setOrderIncidents(refreshedIncidents)
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to review incident')
    } finally {
      setIsReviewSaving(false)
    }
  }

  const handleCreateDamageBill = async () => {
    if (!currentOrderId) return
    try {
      setIsCreatingDamageBill(true)
      await bookingOrderApi.createOrderDamageBill(currentOrderId)
      toast.success('Damage Bill created successfully for the order')

      const refreshedIncidents = await bookingOrderApi.getOrderIncidents(currentOrderId)
      setOrderIncidents(refreshedIncidents)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to create damage bill')
    } finally {
      setIsCreatingDamageBill(false)
    }
  }

  const applyFilters = () => {
    setFilters(draftFilters)
    setIsFilterPanelOpen(false)
  }

  const resetDraftFilters = () => {
    setDraftFilters(defaultFilters)
    setFilters(defaultFilters)
  }

  const openFilterPanel = () => {
    setDraftFilters(filters)
    setIsFilterPanelOpen(true)
  }

  const detailStatus = detailIncident?.status ?? detailReport?.status ?? 'PENDING'
  const detailSeverity = detailIncident?.severity ?? detailReport?.severity ?? 'MEDIUM'
  const detailDescription = detailIncident?.description ?? detailReport?.description ?? '-'
  const detailPhotos = detailIncident?.photo_urls ?? detailReport?.photo_urls ?? []
  const detailLines = detailIncident?.details ?? detailReport?.details ?? []

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Quản lý Sự cố (Đền bù)</h1>
          <p className="text-gray-500 mt-1">Quản lý và xử lý các báo cáo hư hại tài sản trong phạm vi của bạn.</p>
        </div>

        <button
          onClick={async () => {
            await refreshScope()
            await fetchPrimaryData()
          }}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      <div className="flex gap-6 border-b border-gray-200 mb-6">
        <button
          className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'CLEANER'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          onClick={() => setActiveTab('CLEANER')}
        >
          Nhân viên dọn dẹp gửi
        </button>
        <button
          className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'USER'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          onClick={() => setActiveTab('USER')}
        >
          Khách hàng gửi
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-5 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-[220px] pr-4 xl:border-r xl:border-gray-200">
              <p className="text-xs uppercase font-semibold tracking-wide text-gray-500">Tổng số sự cố</p>
              <p className="text-[34px] leading-tight font-bold text-gray-900 mt-1">{tabReports.length}</p>
            </div>

            <div className="min-w-[500px] flex-1 py-1">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{tabReports.length} báo cáo</p>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-1.5">
                {statusSummary.map((item) => (
                  <div
                    key={item.status}
                    className={statusDotClass(item.status)}
                    style={{ width: `${item.percent}%` }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {statusSummary.filter((item) => item.count > 0).map((item) => (
                  <span key={item.status} className="inline-flex items-center gap-1 text-xs text-gray-600">
                    <span className={`w-2 h-2 rounded-full ${statusDotClass(item.status)}`} />
                    {translateStatus(item.status)}: {item.count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm kiếm mã, phòng, nhân viên..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>

            <button
              type="button"
              onClick={openFilterPanel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Mã báo cáo / SL</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Đơn đặt / Phòng</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Người báo cáo</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Độ nghiêm trọng</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Trạng thái</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Giá trị ước tính</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Ngày tạo</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    Đang tải danh sách sự cố...
                  </td>
                </tr>
              ) : groupedReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    Không tìm thấy sự cố nào
                  </td>
                </tr>
              ) : (
                groupedReports.map((group) => {
                  const pod = group.podId ? podMap.get(group.podId) : null
                  const isOrder = group.type === 'ORDER'

                  return (
                    <tr key={group.id} className="transition-colors hover:bg-gray-50/70">
                      <td className="px-6 py-4 align-top">
                        <p className="line-clamp-2 max-w-xs font-medium text-gray-900">{isOrder ? 'Sự cố theo Đơn hàng' : group.items[0]?.description}</p>
                        <p className="mt-1 font-mono text-xs text-gray-400">{isOrder ? `${group.items.length} sự cố` : group.id.slice(0, 8) + '...'}</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="font-mono text-xs font-semibold text-gray-900">{group.orderId ? `${group.orderId.slice(0, 8)}...${group.orderId.slice(-6)}` : '-'}</p>
                        <p className="text-xs text-gray-500 mt-1">{group.podName || pod?.name || '-'}</p>
                      </td>
                      <td className="px-6 py-4 align-top text-gray-700">{group.cleanerName || '-'}</td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(group.severitySet).map(sev => (
                            <span key={sev} className={`inline-flex rounded-md px-2 py-1 text-[11px] uppercase tracking-wider ${severityBadgeClass(sev)}`}>
                              {translateSeverity(sev)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(group.statusSet).map(st => (
                            <span key={st} className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusBadgeClass(st)}`}>
                              {translateStatus(st)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top font-medium text-gray-800">{formatCurrency(group.totalEstimatedValue)}</td>
                      <td className="px-6 py-4 align-top text-gray-500">{formatDateTime(group.latestCreatedAt)}</td>
                      <td className="px-6 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openGroupDetailModal(group)}
                            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isDetailOpen} onClose={closeDetailModal} title="Chi tiết Báo cáo sự cố" size="xl">
        {detailGroup?.type === 'ORDER' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <p className="font-mono text-xs text-gray-500">{detailGroup.orderId}</p>
                <h3 className="text-lg font-bold text-gray-900">Chi tiết Sự cố theo Đơn hàng</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-2">
              {orderDetail?.order && (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Khách hàng</p>
                    <p className="text-sm font-medium text-gray-900">
                      {orderDetail.order.user?.name || orderDetail.order.user?.email || orderDetail.order.user_id || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Trạng thái đơn hàng</p>
                    <p className="text-sm font-medium text-gray-900">{orderDetail.order.status}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Thời gian tạo đơn</p>
                    <p className="text-sm text-gray-900">{formatDateTime(orderDetail.order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tổng tiền đơn hàng</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(orderDetail.order.final_total_price)}</p>
                  </div>
                </>
              )}
              <div className={orderDetail?.order ? "col-span-1 md:col-span-2 border-t border-gray-200 mt-2 pt-4" : ""}>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Thống kê sự cố</p>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-gray-500">Phòng:</p>
                    <p className="text-sm font-medium text-gray-900">{detailGroup.podName || detailGroup.podId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tổng sự cố:</p>
                    <p className="text-sm font-medium text-gray-900">{detailGroup.items.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tổng ước tính:</p>
                    <p className="text-sm font-bold text-rose-600">{formatCurrency(detailGroup.totalEstimatedValue)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Danh sách sự cố
                </h4>
                <button
                  onClick={handleCreateDamageBill}
                  disabled={isCreatingDamageBill || orderIncidents.filter(i => i.incident_type !== 'REPLENISHMENT_REQUEST').some(i => !['RESOLVED', 'DISMISSED'].includes(i.status)) || orderIncidents.filter(i => i.incident_type !== 'REPLENISHMENT_REQUEST' && i.status === 'RESOLVED').length === 0 || isReadOnly}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreatingDamageBill ? 'Đang tạo Hóa đơn...' : 'Tạo hóa đơn đền bù'}
                </button>
              </div>

              {isOrderIncidentsLoading ? (
                <div className="flex justify-center py-4 text-gray-400">Đang tải sự cố...</div>
              ) : orderIncidents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Không có sự cố nào khác trong đơn hàng này.</div>
              ) : (
                <div className="space-y-3">
                  {orderIncidents.map(inc => (
                    <div key={inc.id} className="rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
                      <div
                        onClick={() => handleExpandIncident(inc.id)}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{inc.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span className="font-mono bg-white px-2 py-1 rounded border border-gray-200">ID: {inc.id.slice(0, 8)}...</span>
                            {inc.items && inc.items.length > 0 && (
                              <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded border border-rose-100">
                                {inc.items.join(', ')}
                              </span>
                            )}
                          </div>
                          {inc.resolution_note && (
                            <p className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded">Ghi chú: {inc.resolution_note}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusBadgeClass(inc.status)}`}>{translateStatus(inc.status)}</span>
                            <span className={`inline-flex rounded-md px-2 py-1 text-[10px] uppercase tracking-wider ${severityBadgeClass(inc.severity)}`}>{translateSeverity(inc.severity)}</span>
                          </div>
                          {inc.total_amount_value !== undefined && (
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(inc.total_amount_value)}</span>
                          )}
                          {(inc.status === 'PENDING' && inc.incident_type !== 'REPLENISHMENT_REQUEST') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openReviewModal(inc as any)
                              }}
                              disabled={isReadOnly}
                              className="mt-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 w-full md:w-auto"
                            >
                              Tiến hành Duyệt
                            </button>
                          )}
                        </div>
                      </div>

                      {expandedIncidentId === inc.id && (
                        <div className="border-t border-gray-200 bg-white p-4">
                          {isExpandedLoading ? (
                            <div className="flex justify-center py-6">
                              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                          ) : expandedIncidentDetails ? (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Người báo cáo</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {(() => {
                                      const originalReport = detailGroup?.items.find(r => r.report_id === expandedIncidentId)
                                      return originalReport?.context?.cleaner_name || originalReport?.context?.user_name || expandedIncidentDetails.reported_by || '-'
                                    })()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Thời gian tạo</p>
                                  <p className="text-sm text-gray-900">{new Date(expandedIncidentDetails.created_at).toLocaleString('vi-VN')}</p>
                                </div>
                              </div>
                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Chi tiết hư hại</p>
                                {!expandedIncidentDetails.details || expandedIncidentDetails.details.length === 0 ? (
                                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Không có thông tin chi tiết.</div>
                                ) : (
                                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Loại</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Tên vật phẩm</th>
                                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">SL</th>
                                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Đơn giá</th>
                                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Thành tiền</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50">
                                        {expandedIncidentDetails.details.map((line, index) => (
                                          <tr key={`${line.type}-${index}`}>
                                            <td className="px-3 py-2 text-xs font-semibold text-gray-700">{line.type}</td>
                                            <td className="px-3 py-2 text-gray-800">{line.name_snapshot || line.item_id || line.service_catalog_id || '-'}</td>
                                            <td className="px-3 py-2 text-right text-gray-700">{line.quantity || 0}</td>
                                            <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(line.unit_cost_snapshot)}</td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(line.total_cost)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-white p-4 md:grid-cols-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Phí dịch vụ ước tính</p>
                                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(expandedIncidentDetails.estimated_service_fee || 0)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tổng ước tính</p>
                                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(expandedIncidentDetails.estimated_total_value || 0)}</p>
                                </div>
                              </div>

                              {expandedIncidentDetails.photo_urls && expandedIncidentDetails.photo_urls.length > 0 && (
                                <div>
                                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Hình ảnh bằng chứng ({expandedIncidentDetails.photo_urls.length})</p>
                                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {expandedIncidentDetails.photo_urls.map((url, index) => (
                                      <a
                                        key={url}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group relative block aspect-video overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                                      >
                                        <img src={url} alt={`Evidence ${index + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : isDetailLoading || !detailReport ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <p className="font-mono text-xs text-gray-500">{detailReport.report_id}</p>
                <h3 className="text-lg font-bold text-gray-900">{detailDescription}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(detailStatus)}`}>{translateStatus(detailStatus)}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${severityBadgeClass(detailSeverity)}`}>{translateSeverity(detailSeverity)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Phòng</p>
                <p className="text-sm font-medium text-gray-900">{detailReport.context.pod_name || detailReport.context.pod_id || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Người báo cáo</p>
                <p className="text-sm font-medium text-gray-900">{detailReport.context.cleaner_name || detailReport.context.user_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Đơn đặt (Booking)</p>
                <p className="font-mono text-xs text-gray-800">{detailReport.context.booking_id || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nhiệm vụ dọn dẹp</p>
                <p className="font-mono text-xs text-gray-800">{detailReport.context.cleaning_task_id || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ngày tạo</p>
                <p className="text-sm text-gray-900">{formatDateTime(detailIncident?.created_at || detailReport.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Báo cáo bởi</p>
                <p className="font-mono text-xs text-gray-800">{detailReport.context.reported_by || detailIncident?.reported_by || '-'}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Chi tiết hư hại</p>
              {detailLines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">Không có thông tin chi tiết.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Loại</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Tên vật phẩm</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">SL</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Đơn giá</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {detailLines.map((line, index) => (
                        <tr key={`${line.type}-${index}`}>
                          <td className="px-3 py-2 text-xs font-semibold text-gray-700">{line.type}</td>
                          <td className="px-3 py-2 text-gray-800">{line.name_snapshot || line.item_id || line.service_catalog_id || '-'}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{line.quantity || 0}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(line.unit_cost_snapshot)}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(line.total_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-white p-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tổng vật phẩm</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(detailReport.pricing.estimated_item_value)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Phí dịch vụ</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(detailReport.pricing.estimated_service_fee)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tổng ước tính</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(detailReport.pricing.estimated_total_value)}</p>
              </div>
            </div>

            {/* escalation_note và resolution_note không tồn tại trên backend nên đã loại bỏ hiển thị ở đây */}

            {detailPhotos.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Hình ảnh bằng chứng ({detailPhotos.length})</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {detailPhotos.map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative block aspect-video overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                    >
                      <img src={url} alt={`Evidence ${index + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {(detailStatus === 'PENDING' && detailReport?.incident_type !== 'REPLENISHMENT_REQUEST') && (
              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  onClick={() => {
                    if (detailReport) openReviewModal(detailReport)
                  }}
                  disabled={isReadOnly}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  Tiến hành duyệt sự cố này
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => {
          if (!isReviewSaving) setIsReviewModalOpen(false)
        }}
        title="Duyệt Sự cố"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
            Quản lý chỉ có thể duyệt sự cố ở trạng thái CHỜ XỬ LÝ thành ĐÃ GIẢI QUYẾT hoặc ĐÃ TỪ CHỐI.
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Báo cáo đang chọn</p>
            <p className="font-mono text-xs text-gray-700">{reviewTarget ? ('report_id' in reviewTarget ? reviewTarget.report_id : reviewTarget.id) : '-'}</p>
            <p className="mt-1 text-sm text-gray-800">{reviewTarget?.description || '-'}</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setReviewStatus('RESOLVED')}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${reviewStatus === 'RESOLVED'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Đánh dấu ĐÃ GIẢI QUYẾT
            </button>

            <button
              onClick={() => setReviewStatus('DISMISSED')}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${reviewStatus === 'DISMISSED'
                ? 'border-rose-600 bg-rose-50 text-rose-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <XCircle className="h-4 w-4" />
              Đánh dấu ĐÃ TỪ CHỐI
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              disabled={isReviewSaving}
              onClick={() => setIsReviewModalOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              Hủy bỏ
            </button>
            <button
              disabled={isReviewSaving || isReadOnly}
              onClick={handleSubmitReview}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {isReviewSaving ? 'Đang lưu...' : 'Xác nhận duyệt'}
            </button>
          </div>
        </div>
      </Modal>

      {/* FILTER PANEL */}
      <div className={`fixed inset-0 z-50 ${isFilterPanelOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isFilterPanelOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isFilterPanelOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsFilterPanelOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-hidden bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl ${isFilterPanelOpen ? 'translate-x-0' : 'translate-x-[110%]'}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bộ lọc sự cố</h2>
                <p className="text-xs text-gray-500 mt-1">Lọc theo trạng thái, người gửi, khu vực và ngày.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900">Trạng thái</label>
                  <span className="text-xs text-gray-500 whitespace-nowrap">Đã chọn {draftFilters.statuses.length || 'Tất cả'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftFilters(prev => ({ ...prev, statuses: [] }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.statuses.length === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {draftFilters.statuses.length === 0 && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                    Tất cả
                  </button>
                  {INCIDENT_STATUSES.map(status => {
                    const isSelected = draftFilters.statuses.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setDraftFilters(prev => {
                            if (isSelected) {
                              return { ...prev, statuses: prev.statuses.filter(s => s !== status) }
                            }
                            const nextStatuses = [...prev.statuses, status]
                            if (nextStatuses.length === INCIDENT_STATUSES.length) {
                              return { ...prev, statuses: [] }
                            }
                            return { ...prev, statuses: nextStatuses }
                          })
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        {isSelected && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                        {translateStatus(status)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900">Khu vực (Cluster)</label>
                  <span className="text-xs text-gray-500 whitespace-nowrap">Đã chọn {draftFilters.clusterIds.length || 'Tất cả'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftFilters(prev => ({ ...prev, clusterIds: [] }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.clusterIds.length === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {draftFilters.clusterIds.length === 0 && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                    Tất cả
                  </button>
                  {clusters.map(cluster => {
                    const isSelected = draftFilters.clusterIds.includes(cluster.id);
                    return (
                      <button
                        key={cluster.id}
                        type="button"
                        onClick={() => {
                          setDraftFilters(prev => {
                            if (isSelected) {
                              return { ...prev, clusterIds: prev.clusterIds.filter(id => id !== cluster.id) }
                            }
                            const nextIds = [...prev.clusterIds, cluster.id]
                            if (nextIds.length === clusters.length) {
                              return { ...prev, clusterIds: [] }
                            }
                            return { ...prev, clusterIds: nextIds }
                          })
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        {isSelected && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                        {cluster.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <style>{`
                  .custom-calendar .react-datepicker { border: none; font-family: inherit; width: 100%; display: flex; flex-direction: column; }
                  .custom-calendar .react-datepicker__month-container { width: 100%; display: flex; flex-direction: column; }
                  .custom-calendar .react-datepicker__header { background: white; border-bottom: none; padding-top: 16px; width: 100%; }
                  .custom-calendar .react-datepicker__current-month { font-weight: 500; font-size: 16px; color: #111827; margin-bottom: 12px; }
                  .custom-calendar .react-datepicker__day-names { display: flex; justify-content: center; gap: 20px; margin-bottom: 8px; }
                  .custom-calendar .react-datepicker__week { display: flex; justify-content: center; gap: 25px; margin-bottom: 4px; }
                  .custom-calendar .react-datepicker__day-name { color: #6b7280; font-weight: 500; font-size: 13px; flex: 1; display: flex; align-items: center; justify-content: center; width: auto; max-width: 48px; }
                  .custom-calendar .react-datepicker__day { font-weight: 400; font-size: 14px; color: #374151; border-radius: 9999px; outline: none; margin: 0; flex: 1; display: flex; align-items: center; justify-content: center; aspect-ratio: 1/1; max-width: 48px; max-height: 48px; width: auto; }
                  .custom-calendar .react-datepicker__day:hover { background-color: #f3f4f6; border-radius: 9999px; }
                  .custom-calendar .react-datepicker__day--in-range, .custom-calendar .react-datepicker__day--in-selecting-range { background-color: #f3f4f6; color: #111827; border-radius: 0; }
                  .custom-calendar .react-datepicker__day--range-start,
                  .custom-calendar .react-datepicker__day--range-end,
                  .custom-calendar .react-datepicker__day--selecting-range-start,
                  .custom-calendar .react-datepicker__day--selecting-range-end { background-color: #111827 !important; color: #fff !important; border-radius: 9999px !important; font-weight: 500; }
                  .custom-calendar .react-datepicker__navigation { top: 16px; }
                  .custom-calendar .react-datepicker__navigation-icon::before { border-color: #6b7280; border-width: 2px 2px 0 0; height: 8px; width: 8px; top: 1px; }
                `}</style>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900">Khoảng thời gian</label>
                </div>
                <div className="border border-gray-200 rounded-xl shadow-sm bg-white custom-calendar w-full overflow-hidden">
                  <div className="w-full p-4">
                    <DatePicker
                      selected={draftFilters.dateRange[0]}
                      onChange={(update: [Date | null, Date | null]) => setDraftFilters(prev => ({ ...prev, dateRange: update }))}
                      startDate={draftFilters.dateRange[0] || undefined}
                      endDate={draftFilters.dateRange[1] || undefined}
                      selectsRange
                      inline
                      monthsShown={1}
                    />
                  </div>
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                    <button
                      type="button"
                      onClick={() => setDraftFilters(prev => ({ ...prev, dateRange: [null, null] }))}
                      className="text-sm font-semibold text-gray-900 underline hover:text-gray-700 transition"
                    >
                      Xóa
                    </button>
                    <button
                      type="button"
                      onClick={applyFilters}
                      className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 bg-white flex items-center justify-between gap-3 lg:rounded-b-xl">
              <button
                type="button"
                onClick={resetDraftFilters}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Đặt lại
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
