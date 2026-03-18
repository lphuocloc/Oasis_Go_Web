
import { useEffect, useMemo, useState } from 'react'
import { Boxes, Eye, MapPin, RefreshCw, Search } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import { podClusterApi, type PodClusterItem } from '../../api/lib/podClusterApi'

const formatMoneyModifier = (value?: number | null) => {
  if (value == null) return '-'
  return `${value.toFixed(2)}x`
}

export const ClusterManagement = () => {
  const [clusters, setClusters] = useState<PodClusterItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<PodClusterItem | null>(null)

  const fetchClusters = async () => {
    try {
      setIsLoading(true)
      const response = await podClusterApi.getAll(locationFilter === 'all' ? undefined : locationFilter)
      setClusters(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load pod clusters')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClusters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationFilter])

  const locationOptions = useMemo(() => {
    const map = new Map<string, string>()
    clusters.forEach((cluster) => {
      const id = cluster.location_id
      const name = cluster.location?.name ?? id
      if (id && !map.has(id)) {
        map.set(id, name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [clusters])

  const filteredClusters = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return clusters

    return clusters.filter((cluster) => {
      const locationName = cluster.location?.name ?? cluster.location_id
      return [cluster.name, cluster.id, cluster.description ?? '', locationName]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [clusters, search])

  const totalModifiers = useMemo(
    () => clusters.reduce((sum, cluster) => sum + (cluster.base_price_modifier ?? 0), 0),
    [clusters]
  )

  const totalLocations = useMemo(
    () => new Set(clusters.map((cluster) => cluster.location_id)).size,
    [clusters]
  )

  const closeDetailModal = () => {
    setIsDetailOpen(false)
    setSelectedCluster(null)
    setIsDetailLoading(false)
    setDetailLoadingId(null)
  }

  const openDetailModal = async (clusterId: string) => {
    setIsDetailOpen(true)
    setIsDetailLoading(true)
    setDetailLoadingId(clusterId)

    try {
      const response = await podClusterApi.getById(clusterId)
      setSelectedCluster(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load pod cluster detail')
      closeDetailModal()
    } finally {
      setIsDetailLoading(false)
      setDetailLoadingId(null)
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cluster Management</h1>
          <p className="text-gray-500 mt-1">View pod clusters in your assigned location scope.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchClusters}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Total Clusters</span>
            <Boxes className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{clusters.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Locations Covered</span>
            <MapPin className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalLocations}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Total Modifier</span>
            <MapPin className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalModifiers.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, id or location..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All assigned locations</option>
            {locationOptions.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Pod Clusters</h2>
          <span className="text-sm text-gray-500">{filteredClusters.length} item(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cluster</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Modifier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading pod clusters...</td>
                </tr>
              ) : filteredClusters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No pod clusters found in your scope</td>
                </tr>
              ) : (
                filteredClusters.map((cluster) => (
                  <tr key={cluster.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="font-semibold text-gray-900">{cluster.name}</div>
                      {cluster.description && (
                        <p className="text-xs text-gray-500 mt-2 max-w-md">{cluster.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600">{cluster.location?.name ?? cluster.location_id}</td>
                    <td className="px-6 py-4 align-top text-gray-700 font-medium">{formatMoneyModifier(cluster.base_price_modifier)}</td>
                    <td className="px-6 py-4 align-top text-gray-600">{cluster.updatedAt ? new Date(cluster.updatedAt).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => openDetailModal(cluster.id)}
                        disabled={detailLoadingId === cluster.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-100 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-60"
                      >
                        <Eye className="w-4 h-4" />
                        {detailLoadingId === cluster.id ? 'Loading...' : 'Details'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isDetailOpen}
        onClose={closeDetailModal}
        title="Pod Cluster Details"
        size="xl"
      >
        {isDetailLoading ? (
          <div className="py-8 text-center text-gray-500">Loading cluster details...</div>
        ) : !selectedCluster ? (
          <div className="py-8 text-center text-gray-500">No detail found for this pod cluster.</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Cluster ID</p>
                <p className="font-medium text-gray-900 break-all">{selectedCluster.id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Location</p>
                <p className="font-medium text-gray-900">{selectedCluster.location?.name ?? selectedCluster.location_id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Cluster Name</p>
                <p className="font-medium text-gray-900">{selectedCluster.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Price Modifier</p>
                <p className="font-medium text-gray-900">{formatMoneyModifier(selectedCluster.base_price_modifier)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Slot Duration</p>
                <p className="font-medium text-gray-900">
                  {selectedCluster.slot_duration_minutes != null
                    ? `${selectedCluster.slot_duration_minutes} minutes`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Updated At</p>
                <p className="font-medium text-gray-900">
                  {selectedCluster.updatedAt ? new Date(selectedCluster.updatedAt).toLocaleString() : '-'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Description</p>
              <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-3">
                {selectedCluster.description || 'No description'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Images</p>
              {!selectedCluster.images || selectedCluster.images.length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4">
                  No images for this cluster.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedCluster.images.map((image) => (
                    <a
                      key={image.id}
                      href={image.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block border border-gray-200 rounded-lg overflow-hidden bg-gray-50 hover:shadow-sm transition-shadow"
                    >
                      <img
                        src={image.image_url}
                        alt={`Cluster image ${image.id}`}
                        className="w-full h-28 object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
