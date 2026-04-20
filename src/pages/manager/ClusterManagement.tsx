import { useEffect, useMemo, useState } from 'react'
import { Boxes, Eye, ImagePlus, MapPin, RefreshCw, Search, SlidersHorizontal, Check, X, Server, LayoutTemplate } from 'lucide-react'
import { toast } from 'react-toastify'
import { podClusterApi, type PodClusterItem } from '../../api/lib/podClusterApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'
import { initUserSocket } from '../../lib/socket'

const formatMoneyModifier = (value?: number | null) => {
  if (value == null) return '—'
  return `${value.toFixed(2)}x`
}

export const ClusterManagement = () => {
  const { clusters: scopedClusters, locationOptions, isLoading: isScopeLoading, refreshScope } = useManagerScope()
  
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<{ locationId: string }>({
    locationId: 'all'
  })

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<PodClusterItem | null>(null)

  const clusters = useMemo(() => {
    if (locationFilter === 'all') return scopedClusters
    return scopedClusters.filter((cluster) => cluster.location_id === locationFilter)
  }, [locationFilter, scopedClusters])

  useEffect(() => {
    if (locationFilter === 'all') return
    if (locationOptions.some((item) => item.id === locationFilter)) return
    setLocationFilter('all')
  }, [locationFilter, locationOptions])

  useEffect(() => {
    const socket = initUserSocket()
    if (!socket) return

    const handleNewData = () => {
      refreshScope()
    }

    socket.on('user:notification', handleNewData)
    socket.on('dashboard:refresh', handleNewData)

    return () => {
      socket.off('user:notification', handleNewData)
      socket.off('dashboard:refresh', handleNewData)
    }
  }, [refreshScope])

  const filteredClusters = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return clusters

    return clusters.filter((cluster) => {
      const locationName = cluster.location?.name ?? cluster.location_id
      return [cluster.name, cluster.description ?? '', locationName]
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

  const openFilterPanel = () => {
    setDraftFilters({ locationId: locationFilter })
    setIsFilterPanelOpen(true)
  }

  const applyFilters = () => {
    setLocationFilter(draftFilters.locationId)
    setIsFilterPanelOpen(false)
  }

  const resetDraftFilters = () => {
    setDraftFilters({ locationId: 'all' })
  }

  const closeDetailModal = () => {
    setIsDetailOpen(false)
    // Small delay to allow transition before unmounting
    setTimeout(() => {
      setSelectedCluster(null)
      setIsDetailLoading(false)
      setDetailLoadingId(null)
    }, 300)
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
          <h1 className="text-3xl font-bold text-gray-900">Pod Cluster Management</h1>
          <p className="text-gray-500 mt-1">View pod clusters in your assigned location scope.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshScope}
            disabled={isScopeLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isScopeLoading ? 'animate-spin' : ''}`} />
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
            <ImagePlus className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalModifiers.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 w-full md:max-w-md">
          {/* We are removing the redundant inner filter container layout logic */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, location..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>
        
        <div>
          <button
            type="button"
            onClick={openFilterPanel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors h-full"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cluster Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Modifier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isScopeLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading pod clusters...</td>
                </tr>
              ) : locationOptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No pod clusters found in your scope</td>
                </tr>
              ) : filteredClusters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No pod clusters found matching criteria</td>
                </tr>
              ) : (
                filteredClusters.map((cluster) => (
                  <tr key={cluster.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <Server className="w-4 h-4 text-indigo-500" />
                        {cluster.name}
                      </div>
                      {cluster.description && (
                        <p className="text-xs text-gray-500 mt-2 max-w-sm line-clamp-2">{cluster.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        {cluster.location?.name ?? 'Unknown Location'}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {formatMoneyModifier(cluster.base_price_modifier)}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600">
                      {cluster.updatedAt ? new Date(cluster.updatedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openDetailModal(cluster.id)}
                          disabled={detailLoadingId === cluster.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-60"
                        >
                          <Eye className="w-4 h-4" />
                          {detailLoadingId === cluster.id ? 'Loading...' : 'Details'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter panel */}
      <div className={`fixed inset-0 z-50 ${isFilterPanelOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isFilterPanelOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isFilterPanelOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsFilterPanelOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-hidden bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl flex flex-col ${isFilterPanelOpen ? 'translate-x-0' : 'translate-x-[110%]'}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <p className="text-xs text-gray-500 mt-1">Filter pod clusters by location.</p>
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
                <label className="block text-sm font-semibold text-gray-900">Location</label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDraftFilters(prev => ({ ...prev, locationId: 'all' }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.locationId === 'all' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {draftFilters.locationId === 'all' && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                  All Locations
                </button>
                {locationOptions.map(location => {
                  const isSelected = draftFilters.locationId === location.id
                  return (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => setDraftFilters(prev => ({ ...prev, locationId: location.id }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {isSelected && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                      {location.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-t border-gray-100 bg-white flex items-center justify-between gap-3 lg:rounded-b-xl">
            <button
              type="button"
              onClick={resetDraftFilters}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className={`fixed inset-0 z-50 ${isDetailOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isDetailOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isDetailOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeDetailModal}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-[960px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl flex flex-col ${isDetailOpen ? 'translate-x-0' : 'translate-x-[110%]'}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cluster Details</h2>
            </div>
            <button
              type="button"
              onClick={closeDetailModal}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isDetailLoading ? (
              <div className="py-8 text-center text-gray-500">Loading cluster details...</div>
            ) : !selectedCluster ? (
              <div className="py-8 text-center text-gray-500">No details found for this cluster.</div>
            ) : (
              <div className="space-y-6">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 flex items-start gap-4">
                  <div className="bg-white text-indigo-600 shadow-sm border border-indigo-50 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-indigo-900 mb-1">{selectedCluster.name}</h3>
                    <p className="text-sm text-indigo-700/80">
                       Located in <span className="font-semibold">{selectedCluster.location?.name ?? 'Unknown'}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 border-t border-gray-100 pt-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <LayoutTemplate className="w-3.5 h-3.5" />
                      Price Modifier
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatMoneyModifier(selectedCluster.base_price_modifier)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <LayoutTemplate className="w-3.5 h-3.5" />
                      Slot Duration
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedCluster.slot_duration_minutes != null
                        ? `${selectedCluster.slot_duration_minutes} minutes`
                        : '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Last Updated
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedCluster.updatedAt ? new Date(selectedCluster.updatedAt).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>

                {selectedCluster.description && (
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Description</h3>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 p-4 rounded-xl">
                      {selectedCluster.description}
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-6 pb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Gallery</h3>
                  {!selectedCluster.images || selectedCluster.images.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                      <ImagePlus className="w-8 h-8 text-gray-300 mb-2" />
                      No images for this cluster.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedCluster.images.map((image) => (
                         <a
                         key={image.id}
                         href={image.image_url}
                         target="_blank"
                         rel="noreferrer"
                         className="group block relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50 aspect-[4/3] focus:outline-none focus:ring-2 focus:ring-blue-500"
                       >
                         <img
                           src={image.image_url}
                           alt={`Cluster image ${image.id}`}
                           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                         />
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                       </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
