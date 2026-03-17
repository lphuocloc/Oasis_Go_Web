
import { useEffect, useMemo, useState } from 'react'
import { Boxes, MapPin, RefreshCw, Search } from 'lucide-react'
import { toast } from 'react-toastify'
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">Loading pod clusters...</td>
                </tr>
              ) : filteredClusters.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">No pod clusters found in your scope</td>
                </tr>
              ) : (
                filteredClusters.map((cluster) => (
                  <tr key={cluster.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="font-semibold text-gray-900">{cluster.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{cluster.id}</div>
                      {cluster.description && (
                        <p className="text-xs text-gray-500 mt-2 max-w-md">{cluster.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600">{cluster.location?.name ?? cluster.location_id}</td>
                    <td className="px-6 py-4 align-top text-gray-700 font-medium">{formatMoneyModifier(cluster.base_price_modifier)}</td>
                    <td className="px-6 py-4 align-top text-gray-600">{cluster.updatedAt ? new Date(cluster.updatedAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
