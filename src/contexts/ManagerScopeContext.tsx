import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { podClusterApi, type PodClusterItem } from '../api/lib/podClusterApi'
import { locationShiftApi, type LocationShiftItem } from '../api/lib/locationShiftApi'
import { locationApi } from '../api/lib/locationApi'

interface ScopeLocationOption {
  id: string
  name: string
}

interface ManagerScopeContextType {
  clusters: PodClusterItem[]
  locationOptions: ScopeLocationOption[]
  isLoading: boolean
  locationId: string | null
  selectedLocationId: string | null
  setSelectedLocationId: (id: string | null) => void
  refreshScope: () => Promise<void>
}

const ManagerScopeContext = createContext<ManagerScopeContextType | undefined>(undefined)

export const ManagerScopeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clusters, setClusters] = useState<PodClusterItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  const refreshScope = useCallback(async () => {
    try {
      setIsLoading(true)
      const locationShiftsResponse = await locationShiftApi.getAll()

      const assignmentLocationIds = Array.from(new Set(locationShiftsResponse.data
        .map((ls: LocationShiftItem) => ls.location_id)
        .filter((id): id is string => Boolean(id))))

      if (assignmentLocationIds.length === 0) {
        setClusters([])
        return
      }

      const descendantResponses = await Promise.all(
        assignmentLocationIds.map((locationId) => locationApi.getDescendants(locationId))
      )

      const descendantLocationIds = descendantResponses
        .flatMap((response) => response.data)
        .map((location) => location.id)

      const scopedLocationIds = Array.from(new Set([...assignmentLocationIds, ...descendantLocationIds]))

      const clusterResponses = await Promise.all(
        scopedLocationIds.map((locationId) => podClusterApi.getAll(locationId))
      )

      const scopedClusters = clusterResponses.flatMap((response) => response.data)
      const uniqueClusters = Array.from(new Map(scopedClusters.map((cluster) => [cluster.id, cluster])).values())

      setClusters(uniqueClusters)
    } catch {
      setClusters([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshScope()
  }, [refreshScope])

  const locationOptions = useMemo(() => {
    const map = new Map<string, string>()
    clusters.forEach((cluster) => {
      const id = cluster.location_id
      if (!id) return
      map.set(id, cluster.location?.name ?? id)
    })

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [clusters])

  useEffect(() => {
    if (locationOptions.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locationOptions[0].id)
    }
  }, [locationOptions, selectedLocationId])

  return (
    <ManagerScopeContext.Provider value={{ 
      clusters, 
      locationOptions, 
      isLoading, 
      locationId: selectedLocationId,
      selectedLocationId, 
      setSelectedLocationId,
      refreshScope 
    }}>
      {children}
    </ManagerScopeContext.Provider>
  )
}

export const useManagerScope = () => {
  const context = useContext(ManagerScopeContext)
  if (!context) {
    throw new Error('useManagerScope must be used within a ManagerScopeProvider')
  }
  return context
}
