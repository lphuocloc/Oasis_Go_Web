import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Search, RefreshCw, Eye, Wrench, FileWarning } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import {
  INCIDENT_STATUSES,
  incidentApi,
  type IncidentItem,
  type IncidentStatus
} from '../../api/lib/incidentApi'
import { maintenanceTaskApi } from '../../api/lib/maintenanceTaskApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'INVESTIGATING':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'CLOSED':
      return 'bg-gray-100 text-gray-700 border border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const severityBadgeClass = (severity: string) => {
  switch (severity) {
    case 'LOW':
      return 'bg-slate-100 text-slate-700'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800'
    case 'CRITICAL':
      return 'bg-rose-100 text-rose-800 font-bold'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export const IncidentManagement = () => {
  const { clusters, isLoading: isScopeLoading, refreshScope } = useManagerScope()
  const [incidents, setIncidents] = useState<IncidentItem[]>([])
  const [pods, setPods] = useState<PodItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clusterFilter, setClusterFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | IncidentStatus>('all')

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailIncident, setDetailIncident] = useState<IncidentItem | null>(null)

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const [statusIncident, setStatusIncident] = useState<IncidentItem | null>(null)
  const [nextStatus, setNextStatus] = useState<IncidentStatus>('PENDING')

  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false)
  const [isEscalateSaving, setIsEscalateSaving] = useState(false)
  const [escalateIncident, setEscalateIncident] = useState<IncidentItem | null>(null)
  const [escalateDescription, setEscalateDescription] = useState('')

  const fetchPrimaryData = async () => {
    try {
      setIsLoading(true)
      const podsRes = await podApi.getAll({ cluster_id: clusterFilter === 'all' ? undefined : clusterFilter })
      const podIdsParam = clusterFilter === 'all' ? undefined : podsRes.data.map(p => p.id).join(',')
      
      const incidentsRes = await incidentApi.getAll({
        pod_ids: podIdsParam,
        status: statusFilter === 'all' ? undefined : statusFilter
      })
      setPods(podsRes.data)
      setIncidents(incidentsRes.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to load incidents data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPrimaryData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterFilter, statusFilter, clusters])

  const podMap = useMemo(() => new Map(pods.map(p => [p.id, p])), [pods])
  const clusterMap = useMemo(() => new Map(clusters.map(c => [c.id, c])), [clusters])

  const filteredIncidents = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return incidents

    return incidents.filter((inc) => {
      const pod = podMap.get(inc.pod_id)
      const clusterName = pod ? clusterMap.get(pod.cluster_id)?.name : ''
      return [inc.id, inc.description, pod?.code, pod?.name, clusterName, inc.severity, inc.status]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [incidents, search, podMap, clusterMap])

  const incidentStats = useMemo(
    () => incidents.reduce<Record<string, number>>((acc, inc) => {
      acc[inc.status] = (acc[inc.status] ?? 0) + 1
      return acc
    }, {}),
    [incidents]
  )

  const handleRefresh = async () => {
    await refreshScope()
    fetchPrimaryData()
  }

  const openDetailModal = async (incident: IncidentItem) => {
    setIsDetailOpen(true)
    setIsDetailLoading(true)
    setDetailIncident(incident)
    try {
      const incRes = await incidentApi.getById(incident.id)
      setDetailIncident(incRes.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to load details')
    } finally {
      setIsDetailLoading(false)
    }
  }

  const closeDetailModal = () => {
    setIsDetailOpen(false)
    setDetailIncident(null)
  }

  const openStatusModal = (incident: IncidentItem) => {
    setStatusIncident(incident)
    setNextStatus(incident.status)
    setIsStatusModalOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!statusIncident) return
    try {
      setIsStatusSaving(true)
      await incidentApi.updateStatus(statusIncident.id, { status: nextStatus })
      toast.success('Incident status updated')
      setIsStatusModalOpen(false)
      fetchPrimaryData()
      if (detailIncident?.id === statusIncident.id) {
        const incRes = await incidentApi.getById(statusIncident.id)
        setDetailIncident(incRes.data)
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to update status')
    } finally {
      setIsStatusSaving(false)
    }
  }

  const openEscalateModal = (incident: IncidentItem) => {
    setEscalateIncident(incident)
    setEscalateDescription(`Escalated from Incident: ${incident.description}`)
    setIsEscalateModalOpen(true)
  }

  const handleEscalate = async () => {
    if (!escalateIncident) return
    try {
      setIsEscalateSaving(true)
      await maintenanceTaskApi.create({
        pod_id: escalateIncident.pod_id,
        incident_id: escalateIncident.id,
        description: escalateDescription
      })
      toast.success('Maintenance task created successfully!')
      setIsEscalateModalOpen(false)
      
      // Auto-update incident status to INVESTIGATING if it's PENDING
      if (escalateIncident.status === 'PENDING') {
        await incidentApi.updateStatus(escalateIncident.id, { status: 'INVESTIGATING' })
        fetchPrimaryData()
        if (detailIncident?.id === escalateIncident.id) {
            setDetailIncident(prev => prev ? { ...prev, status: 'INVESTIGATING' } : null)
        }
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to escalate to maintenance')
    } finally {
      setIsEscalateSaving(false)
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Incident Management</h1>
          <p className="text-gray-500 mt-1">Review damage reports and escalate issues to maintenance.</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Total Incidents</p>
            <FileWarning className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{incidents.length}</p>
        </div>
        {INCIDENT_STATUSES.map((status) => (
          <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500">{status}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{incidentStats[status] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incidents..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            disabled={isScopeLoading}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All clusters</option>
            {clusters.map((cluster) => (
              <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | IncidentStatus)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All statuses</option>
            {INCIDENT_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Incident Info</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Pod Details</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Severity</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Status</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Reported At</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading incidents...</td></tr>
              ) : filteredIncidents.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No incidents found</td></tr>
              ) : (
                filteredIncidents.map((incident) => {
                  const pod = podMap.get(incident.pod_id)
                  const cluster = pod ? clusterMap.get(pod.cluster_id) : null
                  return (
                    <tr key={incident.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-gray-900 line-clamp-2 max-w-xs">{incident.description}</p>
                        <p className="text-xs text-gray-400 mt-1 font-mono">{incident.id.split('-')[0]}...</p>
                        {incident.has_lost_found && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase rounded-full border border-purple-200">Lost & Found</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-gray-900">{pod?.name || 'Unknown Pod'}</p>
                        <p className="text-xs text-gray-500">{cluster?.name || 'Unknown Cluster'}</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex px-2 py-1 rounded-md text-[11px] uppercase tracking-wider ${severityBadgeClass(incident.severity)}`}>
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(incident.status)}`}>
                          {incident.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-gray-500">
                        {new Date(incident.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetailModal(incident)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip-trigger"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
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

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={closeDetailModal} title="Incident Details" size="xl">
        {isDetailLoading || !detailIncident ? (
          <div className="py-12 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Report Status</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeClass(detailIncident.status)}`}>
                    {detailIncident.status}
                  </span>
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${severityBadgeClass(detailIncident.severity)}`}>
                    {detailIncident.severity}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <button
                    onClick={() => { closeDetailModal(); openStatusModal(detailIncident); }}
                    className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    Update Status
                 </button>
                 {detailIncident.status !== 'CLOSED' && detailIncident.status !== 'RESOLVED' && (
                    <button
                      onClick={() => { closeDetailModal(); openEscalateModal(detailIncident); }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      <Wrench className="w-4 h-4" /> Escalate to Maintenance
                    </button>
                 )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pod Information</p>
                <p className="text-sm font-medium text-gray-900">{podMap.get(detailIncident.pod_id)?.name || detailIncident.pod_id}</p>
                <p className="text-xs text-gray-500">{clusterMap.get(podMap.get(detailIncident.pod_id)?.cluster_id || '')?.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reported By</p>
                <p className="text-sm font-medium text-gray-900 font-mono break-all">{detailIncident.reported_by}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date Reported</p>
                <p className="text-sm text-gray-900">{new Date(detailIncident.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Source Context</p>
                {detailIncident.cleaning_task_id && <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">Cleaning Task ID: {detailIncident.cleaning_task_id.split('-')[0]}</p>}
                {detailIncident.booking_id && <p className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded inline-block mt-1">Booking ID: {detailIncident.booking_id.split('-')[0]}</p>}
              </div>
            </div>

            <div>
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</p>
               <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-800 text-sm whitespace-pre-wrap">
                 {detailIncident.description}
               </div>
            </div>

            {detailIncident.photo_urls && detailIncident.photo_urls.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Attached Evidence ({detailIncident.photo_urls.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {detailIncident.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block relative group aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <img src={url} alt={`Evidence ${i+1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        )}
      </Modal>

      {/* Status Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isStatusSaving && setIsStatusModalOpen(false)} title="Update Incident Status" size="sm">
        <div className="space-y-4">
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as IncidentStatus)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              {INCIDENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
           </div>
           <div className="flex gap-3 justify-end pt-4">
             <button disabled={isStatusSaving} onClick={() => setIsStatusModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancel</button>
             <button disabled={isStatusSaving} onClick={handleUpdateStatus} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
               {isStatusSaving ? 'Saving...' : 'Save Status'}
             </button>
           </div>
        </div>
      </Modal>

      {/* Escalate Modal */}
      <Modal isOpen={isEscalateModalOpen} onClose={() => !isEscalateSaving && setIsEscalateModalOpen(false)} title="Escalate to Maintenance" size="md">
        <div className="space-y-4">
           <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex gap-3 text-rose-800 text-sm">
             <AlertTriangle className="w-5 h-5 flex-shrink-0" />
             <p>Escalating will create a new Maintenance Task for the Admins. The incident status will be automatically set to <b>INVESTIGATING</b>.</p>
           </div>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Note (Description)</label>
            <textarea
              value={escalateDescription}
              onChange={(e) => setEscalateDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
           </div>
           <div className="flex gap-3 justify-end pt-4">
             <button disabled={isEscalateSaving} onClick={() => setIsEscalateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancel</button>
             <button disabled={isEscalateSaving} onClick={handleEscalate} className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-medium shadow-sm">
               {isEscalateSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
               Confirm Escalation
             </button>
           </div>
        </div>
      </Modal>

    </div>
  )
}
