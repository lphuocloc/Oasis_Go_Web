import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Eye, RefreshCw, Search, XCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  incidentApi,
  type DamageReportItem,
  type IncidentItem,
  type IncidentSeverity,
  type IncidentStatus,
} from '../../api/lib/incidentApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'
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

export const IncidentManagement = () => {
  const { clusters, isLoading: isScopeLoading, refreshScope } = useManagerScope()

  const [reports, setReports] = useState<DamageReportItem[]>([])
  const [pods, setPods] = useState<PodItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [clusterFilter, setClusterFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | IncidentStatus>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | IncidentSeverity>('all')
  const [pendingOnly, setPendingOnly] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailReport, setDetailReport] = useState<DamageReportItem | null>(null)
  const [detailIncident, setDetailIncident] = useState<IncidentItem | null>(null)

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isReviewSaving, setIsReviewSaving] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<DamageReportItem | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED')

  const fetchPrimaryData = async () => {
    try {
      setIsLoading(true)

      const podsResponse = await podApi.getAll({
        cluster_id: clusterFilter === 'all' ? undefined : clusterFilter,
      })

      const podIdsParam = podsResponse.data.map((pod) => pod.id).join(',')
      const listFilters = {
        pod_ids: podIdsParam || undefined,
        status: pendingOnly ? undefined : statusFilter === 'all' ? undefined : statusFilter,
        severity: severityFilter === 'all' ? undefined : severityFilter,
      }

      const reportsResponse = pendingOnly
        ? await incidentApi.getMyPendingReviews({
            pod_ids: listFilters.pod_ids,
            severity: listFilters.severity,
          })
        : await incidentApi.getDamageReports(listFilters)

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
  }, [clusterFilter, statusFilter, severityFilter, pendingOnly, clusters, refreshTrigger])

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
  const clusterMap = useMemo(() => new Map(clusters.map((cluster) => [cluster.id, cluster])), [clusters])

  const incidentStats = useMemo(() => {
    return reports.reduce<Record<IncidentStatus, number>>(
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
  }, [reports])

  const filteredReports = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return reports

    return reports.filter((report) => {
      const pod = report.context.pod_id ? podMap.get(report.context.pod_id) : null
      const clusterName = pod ? clusterMap.get(pod.cluster_id)?.name : ''
      return [
        report.report_id,
        report.description,
        report.context.cleaner_name,
        report.context.user_name,
        report.context.pod_name,
        pod?.code,
        pod?.name,
        clusterName,
        report.severity,
        report.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [reports, search, podMap, clusterMap])

  const openDetailModal = async (report: DamageReportItem) => {
    setDetailReport(report)
    setDetailIncident(null)
    setIsDetailOpen(true)
    setIsDetailLoading(true)

    try {
      const response = await incidentApi.getById(report.report_id)
      setDetailIncident(response.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to load incident details')
    } finally {
      setIsDetailLoading(false)
    }
  }

  const closeDetailModal = () => {
    setIsDetailOpen(false)
    setDetailReport(null)
    setDetailIncident(null)
  }

  const openReviewModal = (report: DamageReportItem) => {
    setReviewTarget(report)
    setReviewStatus('RESOLVED')
    setIsReviewModalOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!reviewTarget) return

    try {
      setIsReviewSaving(true)
      await incidentApi.updateStatus(reviewTarget.report_id, { status: reviewStatus })
      toast.success(reviewStatus === 'RESOLVED' ? 'Incident marked as RESOLVED' : 'Incident marked as DISMISSED')

      setIsReviewModalOpen(false)
      await fetchPrimaryData()

      if (detailIncident?.id === reviewTarget.report_id) {
        const refreshed = await incidentApi.getById(reviewTarget.report_id)
        setDetailIncident(refreshed.data)
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to review incident')
    } finally {
      setIsReviewSaving(false)
    }
  }

  const detailStatus = detailIncident?.status ?? detailReport?.status ?? 'PENDING'
  const detailSeverity = detailIncident?.severity ?? detailReport?.severity ?? 'MEDIUM'
  const detailDescription = detailIncident?.description ?? detailReport?.description ?? '-'
  const detailPhotos = detailIncident?.photo_urls ?? detailReport?.photo_urls ?? []
  const detailLines = detailIncident?.details ?? detailReport?.details ?? []

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Incident Review</h1>
          <p className="mt-1 text-gray-500">Manager review flow for DAMAGE_REPORT incidents in your management scope.</p>
        </div>

        <button
          onClick={async () => {
            await refreshScope()
            await fetchPrimaryData()
          }}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 border-l-4 border-l-amber-500 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Reports</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{reports.length}</p>
        </div>
        {INCIDENT_STATUSES.map((status) => (
          <div key={status} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{status}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{incidentStats[status]}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setPendingOnly(true)
              setStatusFilter('all')
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              pendingOnly ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            My Pending Reviews
          </button>
          <button
            onClick={() => setPendingOnly(false)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !pendingOnly ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            All Damage Reports
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by report, pod, cleaner, status..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={clusterFilter}
            onChange={(event) => setClusterFilter(event.target.value)}
            disabled={isScopeLoading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All clusters</option>
            {clusters.map((cluster) => (
              <option key={cluster.id} value={cluster.id}>
                {cluster.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={pendingOnly ? 'all' : statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | IncidentStatus)}
              disabled={pendingOnly}
              className="rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="all">All status</option>
              {INCIDENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as 'all' | IncidentSeverity)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All severity</option>
              {INCIDENT_SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Report</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Pod</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Cleaner</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Severity</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Status</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Estimated Value</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Created At</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    Loading damage reports...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No reports found
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const pod = report.context.pod_id ? podMap.get(report.context.pod_id) : null
                  const cluster = pod ? clusterMap.get(pod.cluster_id) : null

                  return (
                    <tr key={report.report_id} className="transition-colors hover:bg-gray-50/70">
                      <td className="px-6 py-4 align-top">
                        <p className="line-clamp-2 max-w-xs font-medium text-gray-900">{report.description}</p>
                        <p className="mt-1 font-mono text-xs text-gray-400">{report.report_id.slice(0, 8)}...</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-gray-900">{report.context.pod_name || pod?.name || '-'}</p>
                        <p className="text-xs text-gray-500">{cluster?.name || '-'}</p>
                      </td>
                      <td className="px-6 py-4 align-top text-gray-700">{report.context.cleaner_name || report.context.user_name || '-'}</td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex rounded-md px-2 py-1 text-[11px] uppercase tracking-wider ${severityBadgeClass(report.severity)}`}>
                          {report.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top font-medium text-gray-800">{formatCurrency(report.pricing.estimated_total_value)}</td>
                      <td className="px-6 py-4 align-top text-gray-500">{formatDateTime(report.created_at)}</td>
                      <td className="px-6 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetailModal(report)}
                            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="View details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          {report.status === 'PENDING' && (
                            <button
                              onClick={() => openReviewModal(report)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                            >
                              Review
                            </button>
                          )}
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

      <Modal isOpen={isDetailOpen} onClose={closeDetailModal} title="Damage Report Details" size="xl">
        {isDetailLoading || !detailReport ? (
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
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(detailStatus)}`}>{detailStatus}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${severityBadgeClass(detailSeverity)}`}>{detailSeverity}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pod</p>
                <p className="text-sm font-medium text-gray-900">{detailReport.context.pod_name || detailReport.context.pod_id || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cleaner</p>
                <p className="text-sm font-medium text-gray-900">{detailReport.context.cleaner_name || detailReport.context.user_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Booking</p>
                <p className="font-mono text-xs text-gray-800">{detailReport.context.booking_id || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cleaning Task</p>
                <p className="font-mono text-xs text-gray-800">{detailReport.context.cleaning_task_id || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Created At</p>
                <p className="text-sm text-gray-900">{formatDateTime(detailIncident?.created_at || detailReport.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Reported By</p>
                <p className="font-mono text-xs text-gray-800">{detailReport.context.reported_by || detailIncident?.reported_by || '-'}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Damage Details</p>
              {detailLines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">No detail lines.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Name</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Unit</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Total</th>
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
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Estimated Item Value</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(detailReport.pricing.estimated_item_value)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Estimated Service Fee</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(detailReport.pricing.estimated_service_fee)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Estimated Total</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(detailReport.pricing.estimated_total_value)}</p>
              </div>
            </div>

            {/* escalation_note và resolution_note không tồn tại trên backend nên đã loại bỏ hiển thị ở đây */}

            {detailPhotos.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Evidence Photos ({detailPhotos.length})</p>
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

            {detailStatus === 'PENDING' && (
              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  onClick={() => {
                    if (detailReport) openReviewModal(detailReport)
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Review This Report
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
        title="Review Incident"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
            Manager can only review incidents in PENDING status and set to RESOLVED or DISMISSED.
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Selected Report</p>
            <p className="font-mono text-xs text-gray-700">{reviewTarget?.report_id || '-'}</p>
            <p className="mt-1 text-sm text-gray-800">{reviewTarget?.description || '-'}</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setReviewStatus('RESOLVED')}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                reviewStatus === 'RESOLVED'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark as RESOLVED
            </button>

            <button
              onClick={() => setReviewStatus('DISMISSED')}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                reviewStatus === 'DISMISSED'
                  ? 'border-rose-600 bg-rose-50 text-rose-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <XCircle className="h-4 w-4" />
              Mark as DISMISSED
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              disabled={isReviewSaving}
              onClick={() => setIsReviewModalOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              disabled={isReviewSaving}
              onClick={handleSubmitReview}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {isReviewSaving ? 'Saving...' : 'Confirm Review'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
