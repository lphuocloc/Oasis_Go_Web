import React, { useMemo } from 'react'

export interface PodGridItem {
  id: string
  code: string
  name: string
  status?: string
}

interface PodGridSelectorProps {
  pods: PodGridItem[]
  selectedPodId?: string
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
    const areasMap: Record<string, Record<string, { upper?: PodGridItem; lower?: PodGridItem; others: PodGridItem[] }>> = {}
    
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
      
      if (!areasMap[area]) areasMap[area] = {}
      if (!areasMap[area][base]) areasMap[area][base] = { others: [] }
      
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

  return (
    <div className="flex flex-col gap-3">
      {showAllOption && (
        <button
          type="button"
          onClick={() => onSelect('all')}
          className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
            selectedPodId === 'all' 
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
              <span>Khu {group.area}</span>
              <span className="text-[10px] text-gray-400 font-normal normal-case">Cuộn ngang để xem thêm</span>
            </div>
            
            <div className="flex gap-2.5 overflow-x-auto pb-2 content-start custom-scrollbar">
              {group.bases.map(b => (
                <div key={b.baseCode} className="flex flex-col gap-2 min-w-[100px] flex-shrink-0">
                  <div className="text-[10px] text-center font-semibold text-gray-400 mb-[-4px]">{b.baseCode}</div>
                  {(b.upper || b.lower) ? (
                    <>
                      {b.upper ? (
                        <button
                          type="button"
                          onClick={() => onSelect(b.upper!.id)}
                          title={b.upper!.name}
                          className={`w-full py-2 px-2 text-center rounded-lg text-sm font-bold transition-all border shadow-sm flex-1 ${
                            selectedPodId === b.upper!.id 
                              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20' 
                              : 'bg-white text-gray-800 border-gray-200 hover:border-blue-400 hover:text-blue-700 hover:shadow-md'
                          }`}
                        >
                          <span className={`text-[10px] uppercase font-semibold block mb-0.5 ${selectedPodId === b.upper!.id ? 'text-blue-200' : 'text-gray-500'}`}>
                            Tầng Trên {b.upper!.status ? ` • ${b.upper!.status}` : ''}
                          </span>
                          {b.upper!.code}
                        </button>
                      ) : <div className="min-h-[56px] flex-1 border border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50"><span className="text-[10px] text-gray-400">Trống</span></div>}
                      
                      {b.lower ? (
                        <button
                          type="button"
                          onClick={() => onSelect(b.lower!.id)}
                          title={b.lower!.name}
                          className={`w-full py-2 px-2 text-center rounded-lg text-sm font-bold transition-all border shadow-sm flex-1 ${
                            selectedPodId === b.lower!.id 
                              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20' 
                              : 'bg-white text-gray-800 border-gray-200 hover:border-blue-400 hover:text-blue-700 hover:shadow-md'
                          }`}
                        >
                          <span className={`text-[10px] uppercase font-semibold block mb-0.5 ${selectedPodId === b.lower!.id ? 'text-blue-200' : 'text-gray-500'}`}>
                            Tầng Dưới {b.lower!.status ? ` • ${b.lower!.status}` : ''}
                          </span>
                          {b.lower!.code}
                        </button>
                      ) : <div className="min-h-[56px] flex-1 border border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50/50"><span className="text-[10px] text-gray-400">Trống</span></div>}
                    </>
                  ) : null}

                  {b.others.map(pod => (
                    <button
                      key={pod.id}
                      type="button"
                      onClick={() => onSelect(pod.id)}
                      title={pod.name}
                      className={`w-full py-2 px-2 text-center rounded-lg text-sm font-bold transition-all border shadow-sm ${
                        selectedPodId === pod.id 
                          ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20' 
                          : 'bg-white text-gray-800 border-gray-200 hover:border-blue-400 hover:text-blue-700 hover:shadow-md'
                      }`}
                    >
                      <span className={`text-[10px] uppercase font-semibold block mb-0.5 ${selectedPodId === pod.id ? 'text-blue-200' : 'text-gray-500'}`}>
                        {pod.status || 'Phòng'}
                      </span>
                      {pod.code}
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
