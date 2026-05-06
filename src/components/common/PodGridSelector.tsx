import React, { useMemo } from 'react'
import { LayoutTemplate } from 'lucide-react'

export interface PodGridItem {
  id: string
  code: string
  name: string
  status?: string
  clusterName?: string
  scopeLevel?: string
  isSelectable?: boolean
}

interface PodGridSelectorProps {
  pods: PodGridItem[]
  selectedPodId?: string | string[]
  onSelect: (podId: string) => void
  showAllOption?: boolean
  allOptionLabel?: string
}

const getPodStatusColor = (status?: string) => {
  switch (status) {
    case 'AVAILABLE': return 'border-emerald-500 bg-emerald-50 text-emerald-700'
    case 'OCCUPIED': return 'border-blue-500 bg-blue-50 text-blue-700'
    case 'NEEDS_CLEANING': return 'border-amber-500 bg-amber-50 text-amber-700'
    case 'CLEANING': return 'border-violet-500 bg-violet-50 text-violet-700'
    case 'MAINTENANCE': return 'border-rose-500 bg-rose-50 text-rose-700'
    default: return 'border-gray-300 bg-gray-50 text-gray-500'
  }
}

const getLevel = (code: string) => {
  const c = code.toUpperCase()
  if (c.endsWith('U')) return 'U'
  if (c.endsWith('L')) return 'L'
  return '?'
}

export const PodGridSelector: React.FC<PodGridSelectorProps> = ({
  pods,
  selectedPodId,
  onSelect,
  showAllOption = false,
  allOptionLabel = 'Tất cả phòng'
}) => {
  const groupedPods = useMemo(() => {
    // Group by Cluster Name
    const clusters: Record<string, Record<string, PodGridItem[]>> = {}
    
    pods.forEach(pod => {
      const cluster = pod.clusterName || 'Khu vực khác'
      if (!clusters[cluster]) clusters[cluster] = {}
      
      const prefix = pod.code.charAt(0).toUpperCase()
      if (!clusters[cluster][prefix]) clusters[cluster][prefix] = []
      
      clusters[cluster][prefix].push(pod)
    })

    return Object.entries(clusters).sort().map(([clusterName, prefixes]) => ({
      clusterName,
      prefixes: Object.entries(prefixes).sort().map(([prefix, prefixPods]) => {
        const upperRow = prefixPods.filter(p => getLevel(p.code) === 'U').sort((a, b) => a.code.localeCompare(b.code))
        const lowerRow = prefixPods.filter(p => getLevel(p.code) === 'L').sort((a, b) => a.code.localeCompare(b.code))
        const otherRow = prefixPods.filter(p => !['U', 'L'].includes(getLevel(p.code))).sort((a, b) => a.code.localeCompare(b.code))
        return { prefix, upperRow, lowerRow, otherRow }
      })
    }))
  }, [pods])

  const isSelected = React.useCallback((id: string) => {
    if (Array.isArray(selectedPodId)) {
      if (id === 'all') return selectedPodId.length === 0
      return selectedPodId.includes(id)
    }
    return selectedPodId === id
  }, [selectedPodId])

  return (
    <div className="space-y-8">
      {showAllOption && (
        <button
          type="button"
          onClick={() => onSelect('all')}
          className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all border shadow-sm ${
            isSelected('all')
              ? 'bg-blue-600 text-white border-blue-600 shadow-blue-100' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {allOptionLabel}
        </button>
      )}

      {groupedPods.map(cluster => (
        <div key={cluster.clusterName} className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{cluster.clusterName}</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {cluster.prefixes.map(group => (
              <div key={group.prefix} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Dãy {group.prefix}</span>
                  <div className="flex gap-2">
                    {group.upperRow.length > 0 && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase">Tầng trên ({group.upperRow.length})</span>}
                    {group.lowerRow.length > 0 && <span className="text-[9px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">Tầng dưới ({group.lowerRow.length})</span>}
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  {group.upperRow.length > 0 && (
                    <div className="flex flex-wrap gap-4">
                      {group.upperRow.map(pod => (
                        <button
                          key={pod.id}
                          type="button"
                          disabled={pod.isSelectable === false}
                          onClick={() => onSelect(pod.id)}
                          className={`w-24 h-16 rounded-xl border-2 shadow-sm flex flex-col items-center justify-center transition-all group relative ${
                            pod.isSelectable === false 
                              ? 'opacity-40 grayscale cursor-not-allowed border-gray-200 bg-gray-50' 
                              : isSelected(pod.id)
                                ? 'border-blue-600 ring-4 ring-blue-50 bg-blue-50 scale-105 z-10'
                                : `hover:scale-105 ${getPodStatusColor(pod.status)}`
                          }`}
                        >
                          <span className={`text-xs font-bold ${isSelected(pod.id) ? 'text-blue-700' : ''}`}>{pod.code}</span>
                          <span className={`text-[8px] font-bold opacity-60 mt-0.5 truncate px-1 w-full text-center ${isSelected(pod.id) ? 'text-blue-600' : ''}`}>
                            {pod.status || 'AVAILABLE'}
                          </span>
                          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-[8px] font-bold text-gray-400">U</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {group.lowerRow.length > 0 && (
                    <div className="flex flex-wrap gap-4">
                      {group.lowerRow.map(pod => (
                        <button
                          key={pod.id}
                          type="button"
                          disabled={pod.isSelectable === false}
                          onClick={() => onSelect(pod.id)}
                          className={`w-24 h-16 rounded-xl border-2 shadow-sm flex flex-col items-center justify-center transition-all group relative ${
                            pod.isSelectable === false 
                              ? 'opacity-40 grayscale cursor-not-allowed border-gray-200 bg-gray-50' 
                              : isSelected(pod.id)
                                ? 'border-blue-600 ring-4 ring-blue-50 bg-blue-50 scale-105 z-10'
                                : `hover:scale-105 ${getPodStatusColor(pod.status)}`
                          }`}
                        >
                          <span className={`text-xs font-bold ${isSelected(pod.id) ? 'text-blue-700' : ''}`}>{pod.code}</span>
                          <span className={`text-[8px] font-bold opacity-60 mt-0.5 truncate px-1 w-full text-center ${isSelected(pod.id) ? 'text-blue-600' : ''}`}>
                            {pod.status || 'AVAILABLE'}
                          </span>
                          <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-[8px] font-bold text-gray-400">L</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {group.otherRow.length > 0 && (
                    <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-50">
                      {group.otherRow.map(pod => (
                        <button
                          key={pod.id}
                          type="button"
                          disabled={pod.isSelectable === false}
                          onClick={() => onSelect(pod.id)}
                          className={`w-24 h-16 rounded-xl border-2 shadow-sm flex flex-col items-center justify-center transition-all group relative ${
                            pod.isSelectable === false 
                              ? 'opacity-40 grayscale cursor-not-allowed border-gray-200 bg-gray-50' 
                              : isSelected(pod.id)
                                ? 'border-blue-600 ring-4 ring-blue-50 bg-blue-50 scale-105 z-10'
                                : `hover:scale-105 ${getPodStatusColor(pod.status)}`
                          }`}
                        >
                          <span className={`text-xs font-bold ${isSelected(pod.id) ? 'text-blue-700' : ''}`}>{pod.code}</span>
                          <span className={`text-[8px] font-bold opacity-60 mt-0.5 truncate px-1 w-full text-center ${isSelected(pod.id) ? 'text-blue-600' : ''}`}>
                            {pod.status || 'AVAILABLE'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {groupedPods.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400 italic">
          Không tìm thấy phòng nào khả dụng.
        </div>
      )}
    </div>
  )
}
