import React, { useMemo } from 'react'

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

export const PodGridSelector: React.FC<PodGridSelectorProps> = ({
  pods,
  selectedPodId,
  onSelect,
  showAllOption = false,
  allOptionLabel = 'Tất cả phòng'
}) => {
  const groupedPods = useMemo(() => {
    const areasMap: Record<string, Record<string, { upper?: PodGridItem; lower?: PodGridItem; others: PodGridItem[], scopeLevel?: string }>> = {}
    
    pods.forEach(pod => {
      const code = (pod.code || '').trim()
      let area = 'Khác'
      let base = code
      let tier = ''
      
      const baseMatch = code.match(/^(.*?)(U|L)$/i)
      
      if (baseMatch) {
         base = baseMatch[1]
         tier = baseMatch[2].toUpperCase()
         const areaCodeMatch = base.match(/^([a-zA-Z]+)/)
         area = areaCodeMatch ? areaCodeMatch[1].toUpperCase() : 'Khác'
      } else {
         const areaCodeMatch = code.match(/^([a-zA-Z]+)/)
         area = areaCodeMatch ? areaCodeMatch[1].toUpperCase() : 'Khác'
      }
      
      area = pod.clusterName || `Khu ${area}`

      if (!areasMap[area]) areasMap[area] = {}
      if (!areasMap[area][base]) areasMap[area][base] = { others: [], scopeLevel: pod.scopeLevel }
      
      if (tier === 'U') {
         areasMap[area][base].upper = pod
      } else if (tier === 'L') {
         areasMap[area][base].lower = pod
      } else {
         areasMap[area][base].others.push(pod)
      }
    })

    const sortedAreas = Object.keys(areasMap).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }))
    
    return sortedAreas.map(area => {
      const basesObj = areasMap[area]
      const sortedBaseKeys = Object.keys(basesObj).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))
      const bases = sortedBaseKeys.map(bk => ({ baseCode: bk, ...basesObj[bk] }))
      return {
        area,
        bases
      }
    })
  }, [pods])

  const isSelected = React.useCallback((id: string) => {
    if (Array.isArray(selectedPodId)) {
      if (id === 'all') return selectedPodId.length === 0
      return selectedPodId.includes(id)
    }
    return selectedPodId === id
  }, [selectedPodId])

  return (
    <div className="flex flex-col gap-3">
      {showAllOption && (
        <button
          type="button"
          onClick={() => onSelect('all')}
          className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
            isSelected('all')
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {allOptionLabel}
        </button>
      )}
      
      <div className="flex flex-col gap-4">
        {groupedPods.map(group => (
          <div key={group.area} className="bg-gray-50 rounded-xl border border-gray-200 p-3 flex flex-col gap-3">
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200/80 pb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{group.area}</span>
                {group.bases[0]?.scopeLevel === 'SAME_CLUSTER' && (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-semibold normal-case">
                    (Cùng nhóm - Gần nhất)
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-row overflow-x-auto custom-scrollbar gap-3 pb-3">
              {group.bases.map(b => (
                <div key={b.baseCode} className="flex flex-col gap-2 min-w-[110px] shrink-0">
                  <div className="text-[10px] text-center font-semibold text-gray-400 mb-[-4px]">{b.baseCode}</div>
                  {(b.upper || b.lower) ? (
                    <>
                      {b.upper ? (
                        <button
                          type="button"
                          onClick={() => b.upper!.isSelectable !== false && onSelect(b.upper!.id)}
                          disabled={b.upper!.isSelectable === false}
                          title={b.upper!.name}
                          className={`w-full py-3 px-2 text-center rounded-lg text-sm font-bold transition-all border shadow-sm flex-1 ${
                            b.upper!.isSelectable === false
                              ? 'bg-gray-100/50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                              : isSelected(b.upper!.id)
                                ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20' 
                                : 'bg-white text-gray-800 border-gray-200 hover:border-blue-400 hover:text-blue-700 hover:shadow-md'
                          }`}
                        >
                          <span className="block">{b.upper!.code}</span>
                        </button>
                      ) : <div className="min-h-[46px] flex-1 border border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50"><span className="text-[10px] text-gray-400">Trống</span></div>}
                      
                      {b.lower ? (
                        <button
                          type="button"
                          onClick={() => b.lower!.isSelectable !== false && onSelect(b.lower!.id)}
                          disabled={b.lower!.isSelectable === false}
                          title={b.lower!.name}
                          className={`w-full py-3 px-2 text-center rounded-lg text-sm font-bold transition-all border shadow-sm flex-1 ${
                            b.lower!.isSelectable === false
                              ? 'bg-gray-100/50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                              : isSelected(b.lower!.id)
                                ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20' 
                                : 'bg-white text-gray-800 border-gray-200 hover:border-blue-400 hover:text-blue-700 hover:shadow-md'
                          }`}
                        >
                          <span className="block">{b.lower!.code}</span>
                        </button>
                      ) : <div className="min-h-[46px] flex-1 border border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50"><span className="text-[10px] text-gray-400">Trống</span></div>}
                    </>
                  ) : null}

                  {b.others.map(pod => (
                    <button
                      key={pod.id}
                      type="button"
                      onClick={() => pod.isSelectable !== false && onSelect(pod.id)}
                      disabled={pod.isSelectable === false}
                      title={pod.name}
                      className={`w-full py-3 px-2 text-center rounded-lg text-sm font-bold transition-all border shadow-sm ${
                        pod.isSelectable === false
                          ? 'bg-gray-100/50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                          : isSelected(pod.id)
                            ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20' 
                            : 'bg-white text-gray-800 border-gray-200 hover:border-blue-400 hover:text-blue-700 hover:shadow-md'
                      }`}
                    >
                      <span className="block">{pod.code}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}

        {groupedPods.length === 0 && (
          <div className="col-span-full py-4 text-center text-sm text-gray-500">
            Không tìm thấy phòng nào.
          </div>
        )}
      </div>
    </div>
  )
}
