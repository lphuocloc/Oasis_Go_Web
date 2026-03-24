import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { podClusterApi, type PodClusterItem } from '../api/lib/podClusterApi'
import { staffShiftAssignmentApi } from '../api/lib/staffShiftAssignmentApi'
import { locationApi } from '../api/lib/locationApi'

interface ScopeLocationOption {
  id: string
  name: string
}

interface ManagerScopeContextType {
  clusters: PodClusterItem[]
  locationOptions: ScopeLocationOption[]
  isLoading: boolean
  refreshScope: () => Promise<void>
}

const ManagerScopeContext = createContext<ManagerScopeContextType | undefined>(undefined)

const getTodayDateString = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const ManagerScopeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clusters, setClusters] = useState<PodClusterItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshScope = useCallback(async () => {
    try {
      setIsLoading(true)
      const assignmentsResponse = await staffShiftAssignmentApi.getMyAssignments({
        work_date: getTodayDateString(),
        status: 'ASSIGNED'
      })

      const assignmentLocationIds = Array.from(new Set(assignmentsResponse.data
        .map((assignment) => assignment.location?.id)
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

  return (
    <ManagerScopeContext.Provider value={{ clusters, locationOptions, isLoading, refreshScope }}>
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
