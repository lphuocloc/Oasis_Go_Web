import React, { useEffect, useMemo, useState } from 'react'
import { Link2, Package, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { locationApi, type LocationItem } from '../../api/lib/locationApi'
import { itemApi, type CreateItemPayload, type InventoryItem, type ItemType, type UpdateItemPayload } from '../../api/lib/itemApi'
import {
  warehouseApi,
  type WarehouseItem
} from '../../api/lib/warehouseApi'
import {
  locationWarehouseApi,
  type EffectiveLocationWarehouseItem,
  type EffectiveLocationWarehouseTraceItem,
  type LocationWarehouseItem
} from '../../api/lib/locationWarehouseApi'
import {
  inventoryStockApi,
  type InventoryStockItem
} from '../../api/lib/inventoryStockApi'
import {
  inventoryCheckoutLogApi,
  INVENTORY_ACTION_TYPES,
  type InventoryActionType,
  type InventoryCheckoutLogItem
} from '../../api/lib/inventoryCheckoutLogApi'

type InventoryTab = 'warehouseSetup' | 'items' | 'stocks' | 'checkoutLogs'

const TABS: Array<{ key: InventoryTab; label: string }> = [
  { key: 'warehouseSetup', label: 'Warehouse & Location Mapping' },
  { key: 'items', label: 'Items' },
  { key: 'stocks', label: 'Inventory Stocks' },
  { key: 'checkoutLogs', label: 'Checkout Logs' }
]

const getItemName = (item: InventoryItem) => item.name || item.item_name || item.code || item.sku || item.id

const getItemType = (item: InventoryItem): ItemType | null => {
  const candidate = item.item_type || item.type
  if (candidate === 'CONSUMABLE' || candidate === 'REUSABLE') return candidate
  return null
}

const shortId = (value?: string | null) => {
  if (!value) return '—'
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value
}

const SectionCard: React.FC<{
  title: string
  description?: string
  children: React.ReactNode
}> = ({ title, description, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
    <div className="p-4">{children}</div>
  </div>
)

const StatCard: React.FC<{
  label: string
  value: string | number
}> = ({ label, value }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <p className="text-xs font-medium text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
  </div>
)

export const InventoryWarehouseManagement: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<InventoryTab>('warehouseSetup')
  const [isLoading, setIsLoading] = useState(false)

  const [locations, setLocations] = useState<LocationItem[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [locationWarehouses, setLocationWarehouses] = useState<LocationWarehouseItem[]>([])
  const [stocks, setStocks] = useState<InventoryStockItem[]>([])
  const [checkoutLogs, setCheckoutLogs] = useState<InventoryCheckoutLogItem[]>([])

  const [warehouseNameFilter, setWarehouseNameFilter] = useState('')
  const [newWarehouseName, setNewWarehouseName] = useState('')
  const [newWarehouseAddress, setNewWarehouseAddress] = useState('')
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null)
  const [editWarehouseName, setEditWarehouseName] = useState('')
  const [editWarehouseAddress, setEditWarehouseAddress] = useState('')
  const [isSavingWarehouseEdit, setIsSavingWarehouseEdit] = useState(false)

  const [mappingLocationFilter, setMappingLocationFilter] = useState('all')
  const [mappingWarehouseFilter, setMappingWarehouseFilter] = useState('all')
  const [newMappingLocationId, setNewMappingLocationId] = useState('')
  const [newMappingWarehouseId, setNewMappingWarehouseId] = useState('')
  const [editingMapping, setEditingMapping] = useState<LocationWarehouseItem | null>(null)
  const [editMappingLocationId, setEditMappingLocationId] = useState('')
  const [editMappingWarehouseId, setEditMappingWarehouseId] = useState('')
  const [isSavingMappingEdit, setIsSavingMappingEdit] = useState(false)
  const [effectiveLocationId, setEffectiveLocationId] = useState('')
  const [effectiveMappings, setEffectiveMappings] = useState<EffectiveLocationWarehouseItem[]>([])
  const [effectiveTrace, setEffectiveTrace] = useState<EffectiveLocationWarehouseTraceItem[]>([])
  const [isEffectiveDebugMode, setIsEffectiveDebugMode] = useState(false)

  const [stockWarehouseFilter, setStockWarehouseFilter] = useState('all')
  const [stockItemFilter, setStockItemFilter] = useState('all')
  const [newStockWarehouseId, setNewStockWarehouseId] = useState('')
  const [newStockItemId, setNewStockItemId] = useState('')
  const [newStockQuantity, setNewStockQuantity] = useState('0')
  const [itemSearch, setItemSearch] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState<ItemType>('CONSUMABLE')
  const [newItemUnitCost, setNewItemUnitCost] = useState('0')
  const [isCreatingItem, setIsCreatingItem] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemType, setEditItemType] = useState<ItemType>('CONSUMABLE')
  const [editItemUnitCost, setEditItemUnitCost] = useState('0')
  const [isSavingItemEdit, setIsSavingItemEdit] = useState(false)
  const [editingStock, setEditingStock] = useState<InventoryStockItem | null>(null)
  const [editStockQuantity, setEditStockQuantity] = useState('0')
  const [isSavingStockEdit, setIsSavingStockEdit] = useState(false)

  const [logStockFilter, setLogStockFilter] = useState('all')
  const [logStaffFilter, setLogStaffFilter] = useState('')
  const [logActionFilter, setLogActionFilter] = useState<'all' | InventoryActionType>('all')
  const [logFromFilter, setLogFromFilter] = useState('')
  const [logToFilter, setLogToFilter] = useState('')

  const [editingCheckoutLog, setEditingCheckoutLog] = useState<InventoryCheckoutLogItem | null>(null)
  const [editLogStaffId, setEditLogStaffId] = useState('')
  const [editLogQuantity, setEditLogQuantity] = useState('1')
  const [editLogActionType, setEditLogActionType] = useState<InventoryActionType>('CHECKOUT')
  const [editLogReason, setEditLogReason] = useState('')
  const [isSavingCheckoutLogEdit, setIsSavingCheckoutLogEdit] = useState(false)

  const locationMap = useMemo(() => new Map(locations.map((x) => [x.id, x])), [locations])
  const warehouseMap = useMemo(() => new Map(warehouses.map((x) => [x.id, x])), [warehouses])
  const itemMap = useMemo(() => new Map(items.map((x) => [x.id, x])), [items])
  const stockMap = useMemo(() => new Map(stocks.map((x) => [x.id, x])), [stocks])

  const formatStockLabel = (stockId: string) => {
    const stock = stockMap.get(stockId)
    if (!stock) return `Unknown stock (${shortId(stockId)})`

    const warehouseName = warehouseMap.get(stock.warehouse_id)?.name || shortId(stock.warehouse_id)
    const itemName = getItemName(itemMap.get(stock.item_id) || { id: stock.item_id })
    return `${warehouseName} - ${itemName} (Qty: ${stock.quantity_available})`
  }

  const formatStaffLabel = (staffId?: string | null) => {
    if (!staffId) return '—'

    if (user && user.id === staffId) {
      return user.name || user.email || staffId
    }

    const id = shortId(staffId)
    return id === staffId ? `Staff ${staffId}` : `Staff ${id} (${staffId})`
  }

  const formatTaskLabel = (taskId?: string | null, taskType?: 'Cleaning' | 'Maintenance') => {
    if (!taskId) return '—'
    const id = shortId(taskId)
    const prefix = taskType || 'Task'
    return id === taskId ? `${prefix} ${taskId}` : `${prefix} ${id} (${taskId})`
  }

  const knownStaffIds = useMemo(
    () => Array.from(new Set(checkoutLogs.map((log) => log.staff_id).filter(Boolean))).sort(),
    [checkoutLogs]
  )

  const getItemUnitCost = (item: InventoryItem): number | null => {
    const candidate = item.unit_cost ?? item.unitCost
    if (candidate == null) return null
    const num = Number(candidate)
    return Number.isFinite(num) ? num : null
  }

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase()
    if (!q) return items

    return items.filter((item) => {
      const name = getItemName(item)
      return [name, item.code, item.sku, item.id].filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [items, itemSearch])

  const setDefaultCreateValues = (nextWarehouses?: WarehouseItem[], nextLocations?: LocationItem[], nextItems?: InventoryItem[]) => {
    const ws = nextWarehouses ?? warehouses
    const ls = nextLocations ?? locations
    const it = nextItems ?? items

    if (!newMappingLocationId && ls[0]?.id) setNewMappingLocationId(ls[0].id)
    if (!newMappingWarehouseId && ws[0]?.id) setNewMappingWarehouseId(ws[0].id)
    if (!effectiveLocationId && ls[0]?.id) setEffectiveLocationId(ls[0].id)
    if (!newStockWarehouseId && ws[0]?.id) setNewStockWarehouseId(ws[0].id)
    if (!newStockItemId && it[0]?.id) setNewStockItemId(it[0].id)
  }

  const loadDependencies = async () => {
    try {
      const [locationRes, itemRes, warehouseRes, stockRes] = await Promise.all([
        locationApi.getAll(),
        itemApi.getAll(),
        warehouseApi.getAll(),
        inventoryStockApi.getAll()
      ])

      setLocations(locationRes.data)
      setItems(itemRes.data || [])
      setWarehouses(warehouseRes.data)
      setStocks(stockRes.data)
      setDefaultCreateValues(warehouseRes.data, locationRes.data, itemRes.data || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load dependencies')
    }
  }

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true)
      const response = await warehouseApi.getAll({ name: warehouseNameFilter.trim() || undefined })
      setWarehouses(response.data)
      setDefaultCreateValues(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load warehouses')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLocationWarehouses = async () => {
    try {
      setIsLoading(true)
      const response = await locationWarehouseApi.getAll({
        location_id: mappingLocationFilter === 'all' ? undefined : mappingLocationFilter,
        warehouse_id: mappingWarehouseFilter === 'all' ? undefined : mappingWarehouseFilter
      })
      setLocationWarehouses(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load location-warehouse mappings')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStocks = async () => {
    try {
      setIsLoading(true)
      const response = await inventoryStockApi.getAll({
        warehouse_id: stockWarehouseFilter === 'all' ? undefined : stockWarehouseFilter,
        item_id: stockItemFilter === 'all' ? undefined : stockItemFilter
      })
      setStocks(response.data)
      setDefaultCreateValues(undefined, undefined, undefined)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load inventory stocks')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchItems = async () => {
    try {
      setIsLoading(true)
      const response = await itemApi.getAll()
      setItems(response.data || [])
      setDefaultCreateValues(undefined, undefined, response.data || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load items')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCheckoutLogs = async () => {
    try {
      setIsLoading(true)
      const response = await inventoryCheckoutLogApi.getAll({
        inventory_stock_id: logStockFilter === 'all' ? undefined : logStockFilter,
        staff_id: logStaffFilter.trim() || undefined,
        action_type: logActionFilter === 'all' ? undefined : logActionFilter,
        from: logFromFilter ? new Date(logFromFilter).toISOString() : undefined,
        to: logToFilter ? new Date(logToFilter).toISOString() : undefined
      })
      setCheckoutLogs(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load inventory checkout logs')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshActiveTab = async () => {
    if (activeTab === 'warehouseSetup') return Promise.all([fetchWarehouses(), fetchLocationWarehouses()])
    if (activeTab === 'items') return fetchItems()
    if (activeTab === 'stocks') return fetchStocks()
    return fetchCheckoutLogs()
  }

  useEffect(() => {
    loadDependencies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    refreshActiveTab()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'warehouseSetup') fetchWarehouses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseNameFilter])

  useEffect(() => {
    if (activeTab === 'warehouseSetup') fetchLocationWarehouses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappingLocationFilter, mappingWarehouseFilter])

  useEffect(() => {
    if (activeTab === 'items') fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'stocks') fetchStocks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockWarehouseFilter, stockItemFilter])

  useEffect(() => {
    if (activeTab === 'checkoutLogs') fetchCheckoutLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logStockFilter, logStaffFilter, logActionFilter, logFromFilter, logToFilter])

  const handleCreateWarehouse = async () => {
    if (!newWarehouseName.trim()) {
      toast.error('Warehouse name is required')
      return
    }
    try {
      await warehouseApi.create({
        name: newWarehouseName.trim(),
        address: newWarehouseAddress.trim() || undefined
      })
      setNewWarehouseName('')
      setNewWarehouseAddress('')
      toast.success('Warehouse created successfully')
      await Promise.all([fetchWarehouses(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create warehouse')
    }
  }

  const openEditWarehouseModal = (warehouse: WarehouseItem) => {
    setEditingWarehouse(warehouse)
    setEditWarehouseName(warehouse.name)
    setEditWarehouseAddress(warehouse.address || '')
  }

  const closeEditWarehouseModal = () => {
    if (isSavingWarehouseEdit) return
    setEditingWarehouse(null)
    setEditWarehouseName('')
    setEditWarehouseAddress('')
  }

  const handleUpdateWarehouse = async () => {
    if (!editingWarehouse) return
    if (!editWarehouseName.trim()) {
      toast.error('Warehouse name is required')
      return
    }

    try {
      setIsSavingWarehouseEdit(true)
      await warehouseApi.update(editingWarehouse.id, {
        name: editWarehouseName.trim(),
        address: editWarehouseAddress.trim() || undefined
      })
      toast.success('Warehouse updated successfully')
      closeEditWarehouseModal()
      await Promise.all([fetchWarehouses(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update warehouse')
    } finally {
      setIsSavingWarehouseEdit(false)
    }
  }

  const handleDeleteWarehouse = async (warehouse: WarehouseItem) => {
    if (!window.confirm(`Delete warehouse "${warehouse.name}"?`)) return
    try {
      await warehouseApi.delete(warehouse.id)
      toast.success('Warehouse deleted successfully')
      await Promise.all([fetchWarehouses(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete warehouse')
    }
  }

  const handleCreateMapping = async () => {
    if (!newMappingLocationId || !newMappingWarehouseId) {
      toast.error('location_id and warehouse_id are required')
      return
    }
    try {
      await locationWarehouseApi.create({
        location_id: newMappingLocationId,
        warehouse_id: newMappingWarehouseId
      })
      toast.success('Location-warehouse mapping created successfully')
      await fetchLocationWarehouses()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create mapping')
    }
  }

  const openEditMappingModal = (mapping: LocationWarehouseItem) => {
    setEditingMapping(mapping)
    setEditMappingLocationId(mapping.location_id)
    setEditMappingWarehouseId(mapping.warehouse_id)
  }

  const closeEditMappingModal = () => {
    if (isSavingMappingEdit) return
    setEditingMapping(null)
    setEditMappingLocationId('')
    setEditMappingWarehouseId('')
  }

  const handleEditMapping = async () => {
    if (!editingMapping) return
    if (!editMappingLocationId || !editMappingWarehouseId) {
      toast.error('location_id and warehouse_id are required')
      return
    }

    try {
      setIsSavingMappingEdit(true)
      await locationWarehouseApi.update(editingMapping.id, {
        location_id: editMappingLocationId.trim(),
        warehouse_id: editMappingWarehouseId.trim()
      })
      toast.success('Mapping updated successfully')
      closeEditMappingModal()
      await fetchLocationWarehouses()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update mapping')
    } finally {
      setIsSavingMappingEdit(false)
    }
  }

  const handleDeleteMapping = async (mapping: LocationWarehouseItem) => {
    if (!window.confirm('Delete this location-warehouse mapping?')) return
    try {
      await locationWarehouseApi.delete(mapping.id)
      toast.success('Mapping deleted successfully')
      await fetchLocationWarehouses()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete mapping')
    }
  }

  const handleResolveEffectiveMappings = async (debug: boolean) => {
    if (!effectiveLocationId) {
      toast.error('Please select a location to resolve effective mappings')
      return
    }
    try {
      setIsLoading(true)
      if (debug) {
        const response = await locationWarehouseApi.getEffectiveDebug(effectiveLocationId)
        setEffectiveMappings(response.data)
        setEffectiveTrace(response.trace || [])
      } else {
        const response = await locationWarehouseApi.getEffective(effectiveLocationId)
        setEffectiveMappings(response.data)
        setEffectiveTrace([])
      }
      setIsEffectiveDebugMode(debug)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to resolve effective location-warehouse mappings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateStock = async () => {
    if (!newStockWarehouseId || !newStockItemId) {
      toast.error('warehouse_id and item_id are required')
      return
    }
    const quantity = Number(newStockQuantity)
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error('quantity_available cannot be negative')
      return
    }

    try {
      await inventoryStockApi.create({
        warehouse_id: newStockWarehouseId,
        item_id: newStockItemId,
        quantity_available: Math.floor(quantity)
      })
      toast.success('Inventory stock created successfully')
      setNewStockQuantity('0')
      await Promise.all([fetchStocks(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create inventory stock')
    }
  }

  const handleCreateItem = async () => {
    const trimmedName = newItemName.trim()
    if (!trimmedName) {
      toast.error('Item name is required')
      return
    }

    const unitCost = Number(newItemUnitCost)
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      toast.error('Unit cost must be a number >= 0')
      return
    }

    const payload: CreateItemPayload = {
      name: trimmedName,
      item_type: newItemType,
      unit_cost: unitCost
    }

    try {
      setIsCreatingItem(true)
      const response = await itemApi.create(payload)
      const createdItem = response.data

      await loadDependencies()
      if (createdItem?.id) {
        setNewStockItemId(createdItem.id)
      }

      setNewItemName('')
      setNewItemType('CONSUMABLE')
      setNewItemUnitCost('0')
      toast.success('Item created successfully')
    } catch (error: any) {
      const status = error?.response?.status
      const message = error?.response?.data?.message
      if (status === 404) {
        toast.error('Item API route is missing on backend (POST /items or POST /item).')
      } else if (status === 409) {
        toast.error(message || 'Item already exists')
      } else if (status === 400) {
        toast.error(message || 'Invalid item data')
      } else {
        toast.error(message || 'Failed to create item')
      }
    } finally {
      setIsCreatingItem(false)
    }
  }

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItem(item)
    setEditItemName(getItemName(item))
    setEditItemType(getItemType(item) || 'CONSUMABLE')
    const unitCost = getItemUnitCost(item)
    setEditItemUnitCost(unitCost == null ? '0' : String(unitCost))
  }

  const closeEditItemModal = () => {
    if (isSavingItemEdit) return
    setEditingItem(null)
    setEditItemName('')
    setEditItemType('CONSUMABLE')
    setEditItemUnitCost('0')
  }

  const handleEditItem = async () => {
    if (!editingItem) return

    const trimmedName = editItemName.trim()
    if (!trimmedName) {
      toast.error('Item name is required')
      return
    }

    const unitCost = Number(editItemUnitCost)
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      toast.error('Unit cost must be a number >= 0')
      return
    }

    const payload: UpdateItemPayload = {
      name: trimmedName,
      item_type: editItemType,
      unit_cost: unitCost
    }

    try {
      setIsSavingItemEdit(true)
      await itemApi.update(editingItem.id, payload)
      toast.success('Item updated successfully')
      closeEditItemModal()
      await Promise.all([fetchItems(), loadDependencies()])
    } catch (error: any) {
      const message = error?.response?.data?.message
      toast.error(message || 'Failed to update item')
    } finally {
      setIsSavingItemEdit(false)
    }
  }

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!window.confirm(`Delete item "${getItemName(item)}"?`)) return

    try {
      await itemApi.delete(item.id)
      toast.success('Item deleted successfully')
      await Promise.all([fetchItems(), loadDependencies()])
    } catch (error: any) {
      const message = error?.response?.data?.message
      toast.error(message || 'Failed to delete item')
    }
  }

  const openEditStockModal = (stock: InventoryStockItem) => {
    setEditingStock(stock)
    setEditStockQuantity(String(stock.quantity_available))
  }

  const closeEditStockModal = () => {
    if (isSavingStockEdit) return
    setEditingStock(null)
    setEditStockQuantity('0')
  }

  const handleEditStock = async () => {
    if (!editingStock) return
    const quantity = Number(editStockQuantity)
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error('quantity_available cannot be negative')
      return
    }

    try {
      setIsSavingStockEdit(true)
      await inventoryStockApi.update(editingStock.id, { quantity_available: Math.floor(quantity) })
      toast.success('Inventory stock updated successfully')
      closeEditStockModal()
      await Promise.all([fetchStocks(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update inventory stock')
    } finally {
      setIsSavingStockEdit(false)
    }
  }

  const handleDeleteStock = async (stock: InventoryStockItem) => {
    if (!window.confirm('Delete this inventory stock?')) return
    try {
      await inventoryStockApi.delete(stock.id)
      toast.success('Inventory stock deleted successfully')
      await Promise.all([fetchStocks(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete inventory stock')
    }
  }

  const closeEditCheckoutLogModal = () => {
    if (isSavingCheckoutLogEdit) return
    setEditingCheckoutLog(null)
    setEditLogStaffId('')
    setEditLogQuantity('1')
    setEditLogActionType('CHECKOUT')
    setEditLogReason('')
  }

  const handleEditCheckoutLog = async () => {
    if (!editingCheckoutLog) return

    const quantity = Number(editLogQuantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('quantity must be a positive number')
      return
    }

    if (!editLogStaffId.trim()) {
      toast.error('staff_id is required')
      return
    }

    try {
      setIsSavingCheckoutLogEdit(true)
      await inventoryCheckoutLogApi.update(editingCheckoutLog.id, {
        staff_id: editLogStaffId.trim(),
        quantity: Math.floor(quantity),
        action_type: editLogActionType,
        reason: editLogReason.trim() || null
      })
      toast.success('Checkout log updated successfully')
      closeEditCheckoutLogModal()
      await Promise.all([fetchCheckoutLogs(), fetchStocks(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update checkout log')
    } finally {
      setIsSavingCheckoutLogEdit(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory & Warehouse Management</h1>
            <p className="text-sm text-gray-500 mt-1">CRUD for warehouses, mappings, stocks and checkout logs.</p>
          </div>
          <button
            onClick={refreshActiveTab}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'warehouseSetup' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard label="Total Warehouses" value={warehouses.length} />
              <StatCard label="Total Mappings" value={locationWarehouses.length} />
              <StatCard label="Filtered Name" value={warehouseNameFilter.trim() || 'All'} />
              <StatCard label="Locations Loaded" value={locations.length} />
            </div>

            <SectionCard title="Create Warehouse" description="Create a new warehouse before linking it to locations or stocks.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse Name</label>
                  <input
                    value={newWarehouseName}
                    onChange={(e) => setNewWarehouseName(e.target.value)}
                    placeholder="e.g. Kho Tan Binh"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <input
                    value={newWarehouseAddress}
                    onChange={(e) => setNewWarehouseAddress(e.target.value)}
                    placeholder="Warehouse address"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              <button onClick={handleCreateWarehouse} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Create Warehouse
              </button>
            </SectionCard>

            <SectionCard title="Warehouse List" description="Review, edit, or delete existing warehouses.">
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Name</label>
                <input
                  value={warehouseNameFilter}
                  onChange={(e) => setWarehouseNameFilter(e.target.value)}
                  placeholder="Search warehouse name..."
                  className="w-full md:max-w-md px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Warehouse</th>
                    <th className="px-4 py-3 text-left">Address</th>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No warehouses</td></tr>
                  ) : warehouses.map((warehouse) => (
                    <tr key={warehouse.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{warehouse.name}</div>
                        <div className="text-xs text-gray-500">{warehouse.id}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{warehouse.address || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{warehouse.created_at ? new Date(warehouse.created_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button onClick={() => openEditWarehouseModal(warehouse)} className="px-2.5 py-1.5 border border-gray-200 rounded">Edit</button>
                          <button onClick={() => handleDeleteWarehouse(warehouse)} className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </SectionCard>
            <SectionCard title="Location-Warehouse Setup" description="Create and maintain mappings after warehouse creation.">
              <p className="text-xs text-gray-500">Use this section right after creating warehouses to assign each location to the correct warehouse.</p>
            </SectionCard>

            <SectionCard title="Create Mapping" description="Link one location to one warehouse. Duplicate pairs will be rejected by backend.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <select value={newMappingLocationId} onChange={(e) => setNewMappingLocationId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse</label>
                  <select value={newMappingWarehouseId} onChange={(e) => setNewMappingWarehouseId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="">Select warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={handleCreateMapping} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                <Link2 className="w-4 h-4" />
                Create Mapping
              </button>
            </SectionCard>

            <SectionCard title="Resolve Effective Warehouses" description="Resolve inherited warehouse mappings from location hierarchy (direct + inherited).">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Requested Location</label>
                  <select
                    value={effectiveLocationId}
                    onChange={(e) => setEffectiveLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 flex items-end gap-2">
                  <button
                    onClick={() => handleResolveEffectiveMappings(false)}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Resolve Effective
                  </button>
                  <button
                    onClick={() => handleResolveEffectiveMappings(true)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Resolve + Debug Trace
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Source Type</th>
                      <th className="px-3 py-2 text-left">Requested Location</th>
                      <th className="px-3 py-2 text-left">Source Location</th>
                      <th className="px-3 py-2 text-left">Warehouse</th>
                      <th className="px-3 py-2 text-left">Depth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveMappings.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No effective mappings resolved yet</td></tr>
                    ) : effectiveMappings.map((mapping) => (
                      <tr key={`${mapping.id}-${mapping.source_location_id}`} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${mapping.source_type === 'direct' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {mapping.source_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{locationMap.get(mapping.requested_location_id)?.name || mapping.requested_location_id}</td>
                        <td className="px-3 py-2 text-gray-700">{locationMap.get(mapping.source_location_id)?.name || mapping.source_location_id}</td>
                        <td className="px-3 py-2 text-gray-700">{warehouseMap.get(mapping.warehouse_id)?.name || mapping.warehouse_id}</td>
                        <td className="px-3 py-2 text-gray-700">{mapping.resolution_depth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isEffectiveDebugMode && (
                <div className="mt-4 overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Trace Location</th>
                        <th className="px-3 py-2 text-left">Depth</th>
                        <th className="px-3 py-2 text-left">Mapping Count</th>
                        <th className="px-3 py-2 text-left">Matched</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveTrace.length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">No trace data</td></tr>
                      ) : effectiveTrace.map((trace) => (
                        <tr key={`${trace.location_id}-${trace.depth}`} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-700">{locationMap.get(trace.location_id)?.name || trace.location_id}</td>
                          <td className="px-3 py-2 text-gray-700">{trace.depth}</td>
                          <td className="px-3 py-2 text-gray-700">{trace.mapping_count}</td>
                          <td className="px-3 py-2 text-gray-700">{trace.matched ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Mapping List" description="Review current location-warehouse relations and update or remove them.">
              <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location Filter</label>
                  <select value={mappingLocationFilter} onChange={(e) => setMappingLocationFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="all">All locations</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse Filter</label>
                  <select value={mappingWarehouseFilter} onChange={(e) => setMappingWarehouseFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="all">All warehouses</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-left">Warehouse</th>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locationWarehouses.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No mappings</td></tr>
                  ) : locationWarehouses.map((mapping) => (
                    <tr key={mapping.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <div className="text-gray-800">{locationMap.get(mapping.location_id)?.name || mapping.location_id}</div>
                        <div className="text-xs text-gray-500">{mapping.location_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800">{warehouseMap.get(mapping.warehouse_id)?.name || mapping.warehouse_id}</div>
                        <div className="text-xs text-gray-500">{mapping.warehouse_id}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{mapping.created_at ? new Date(mapping.created_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button onClick={() => openEditMappingModal(mapping)} className="px-2.5 py-1.5 border border-gray-200 rounded">Edit</button>
                          <button onClick={() => handleDeleteMapping(mapping)} className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'stocks' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Stock Rows" value={stocks.length} />
              <StatCard label="Warehouses with Stocks" value={new Set(stocks.map((stock) => stock.warehouse_id)).size} />
              <StatCard label="Total Available Quantity" value={stocks.reduce((sum, stock) => sum + stock.quantity_available, 0)} />
            </div>

            <SectionCard title="Create Inventory Stock" description="Create the first stock row for a warehouse-item pair. Duplicate pairs will be rejected.">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse</label>
                  <select value={newStockWarehouseId} onChange={(e) => setNewStockWarehouseId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="">Select warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item</label>
                  <select value={newStockItemId} onChange={(e) => setNewStockItemId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="">Select item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>{getItemName(item)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity Available</label>
                  <input value={newStockQuantity} onChange={(e) => setNewStockQuantity(e.target.value)} type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
              </div>
              <button onClick={handleCreateStock} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                <Package className="w-4 h-4" />
                Create Stock
              </button>
            </SectionCard>

            <SectionCard title="Inventory Stock List" description="Review stock availability per warehouse and item.">
              <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse Filter</label>
                  <select value={stockWarehouseFilter} onChange={(e) => setStockWarehouseFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="all">All warehouses</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item Filter</label>
                  <select value={stockItemFilter} onChange={(e) => setStockItemFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="all">All items</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>{getItemName(item)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Warehouse</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Quantity</th>
                    <th className="px-4 py-3 text-left">Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No stocks</td></tr>
                  ) : stocks.map((stock) => (
                    <tr key={stock.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <div className="text-gray-800">{warehouseMap.get(stock.warehouse_id)?.name || stock.warehouse_id}</div>
                        <div className="text-xs text-gray-500">{stock.warehouse_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800">{getItemName(itemMap.get(stock.item_id) || { id: stock.item_id })}</div>
                        <div className="text-xs text-gray-500">{stock.item_id}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{stock.quantity_available}</td>
                      <td className="px-4 py-3 text-gray-700">{stock.updated_at ? new Date(stock.updated_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button onClick={() => openEditStockModal(stock)} className="px-2.5 py-1.5 border border-gray-200 rounded">Edit</button>
                          <button onClick={() => handleDeleteStock(stock)} className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'items' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Total Items" value={items.length} />
              <StatCard label="Filtered Items" value={filteredItems.length} />
              <StatCard label="Ready for Stock" value={items.length} />
            </div>

            <SectionCard title="Create Item" description="Create inventory item records used by Inventory Stock and Checkout Logs.">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item Name</label>
                  <input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Tissue Box"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item Type</label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as ItemType)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="CONSUMABLE">CONSUMABLE</option>
                    <option value="REUSABLE">REUSABLE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItemUnitCost}
                    onChange={(e) => setNewItemUnitCost(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateItem}
                disabled={isCreatingItem}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {isCreatingItem ? 'Creating...' : 'Create Item'}
              </button>
            </SectionCard>

            <SectionCard title="Item List" description="View and search created items used for stock operations.">
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Search Items</label>
                <input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search by name, code, sku, id..."
                  className="w-full md:max-w-md px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-left">Item Type</th>
                      <th className="px-4 py-3 text-left">Unit Cost</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No items found</td></tr>
                    ) : filteredItems.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{getItemName(item)}</div>
                          <div className="text-xs text-gray-500">{item.id}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{getItemType(item) || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{getItemUnitCost(item) == null ? 'N/A' : getItemUnitCost(item)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <button onClick={() => openEditItemModal(item)} className="px-2.5 py-1.5 border border-gray-200 rounded">Edit</button>
                            <button onClick={() => handleDeleteItem(item)} className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        <Modal
          isOpen={Boolean(editingItem)}
          onClose={closeEditItemModal}
          title="Edit Item"
          size="sm"
          footer={(
            <>
              <button
                onClick={closeEditItemModal}
                disabled={isSavingItemEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleEditItem}
                disabled={isSavingItemEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSavingItemEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Item Name</label>
              <input
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                placeholder="Item name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Item Type</label>
              <select
                value={editItemType}
                onChange={(e) => setEditItemType(e.target.value as ItemType)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="CONSUMABLE">CONSUMABLE</option>
                <option value="REUSABLE">REUSABLE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editItemUnitCost}
                onChange={(e) => setEditItemUnitCost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </Modal>

        {activeTab === 'checkoutLogs' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard label="Total Logs" value={checkoutLogs.length} />
              <StatCard label="Checkouts" value={checkoutLogs.filter((log) => log.action_type === 'CHECKOUT').length} />
              <StatCard label="Returns" value={checkoutLogs.filter((log) => log.action_type === 'RETURN').length} />
              <StatCard label="Waste Logs" value={checkoutLogs.filter((log) => log.action_type === 'WASTE').length} />
            </div>

            <SectionCard title="Checkout Log List" description="Audit stock movement history (edit/delete actions are temporarily hidden).">
              <div className="mb-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <select value={logStockFilter} onChange={(e) => setLogStockFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white">
                  <option value="all">All stocks</option>
                  {stocks.map((stock) => (
                    <option key={stock.id} value={stock.id}>{formatStockLabel(stock.id)}</option>
                  ))}
                </select>
                <input
                  value={logStaffFilter}
                  onChange={(e) => setLogStaffFilter(e.target.value)}
                  placeholder="Filter by staff"
                  list="staff-filter-options"
                  className="px-3 py-2 border border-gray-200 rounded-lg"
                />
                <datalist id="staff-filter-options">
                  {knownStaffIds.map((staffId) => (
                    <option key={staffId} value={staffId}>{formatStaffLabel(staffId)}</option>
                  ))}
                </datalist>
                <select value={logActionFilter} onChange={(e) => setLogActionFilter(e.target.value as 'all' | InventoryActionType)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white">
                  <option value="all">All action types</option>
                  {INVENTORY_ACTION_TYPES.map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
                <input type="datetime-local" value={logFromFilter} onChange={(e) => setLogFromFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg" />
                <input type="datetime-local" value={logToFilter} onChange={(e) => setLogToFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Stock</th>
                    <th className="px-4 py-3 text-left">Staff</th>
                    <th className="px-4 py-3 text-left">Cleaning Task</th>
                    <th className="px-4 py-3 text-left">Maintenance Task</th>
                    <th className="px-4 py-3 text-left">Quantity</th>
                    <th className="px-4 py-3 text-left">Reason</th>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {checkoutLogs.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No checkout logs</td></tr>
                  ) : checkoutLogs.map((log) => (
                    <tr key={log.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${log.action_type === 'RETURN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatStockLabel(log.inventory_stock_id)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatStaffLabel(log.staff_id)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatTaskLabel(log.cleaning_task_id, 'Cleaning')}</td>
                      <td className="px-4 py-3 text-gray-700">{formatTaskLabel(log.maintenance_task_id, 'Maintenance')}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{log.quantity}</td>
                      <td className="px-4 py-3 text-gray-700">{log.reason || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-gray-400">Temporarily hidden</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </SectionCard>
          </div>
        )}

        <Modal
          isOpen={Boolean(editingWarehouse)}
          onClose={closeEditWarehouseModal}
          title="Edit Warehouse"
          size="md"
          footer={(
            <>
              <button
                onClick={closeEditWarehouseModal}
                disabled={isSavingWarehouseEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateWarehouse}
                disabled={isSavingWarehouseEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSavingWarehouseEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse Name</label>
              <input
                value={editWarehouseName}
                onChange={(e) => setEditWarehouseName(e.target.value)}
                placeholder="Warehouse name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <input
                value={editWarehouseAddress}
                onChange={(e) => setEditWarehouseAddress(e.target.value)}
                placeholder="Warehouse address"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={Boolean(editingMapping)}
          onClose={closeEditMappingModal}
          title="Edit Location-Warehouse Mapping"
          size="md"
          footer={(
            <>
              <button
                onClick={closeEditMappingModal}
                disabled={isSavingMappingEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleEditMapping}
                disabled={isSavingMappingEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSavingMappingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <select
                value={editMappingLocationId}
                onChange={(e) => setEditMappingLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse</label>
              <select
                value={editMappingWarehouseId}
                onChange={(e) => setEditMappingWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={Boolean(editingCheckoutLog)}
          onClose={closeEditCheckoutLogModal}
          title="Edit Checkout Log"
          size="md"
          footer={(
            <>
              <button
                onClick={closeEditCheckoutLogModal}
                disabled={isSavingCheckoutLogEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleEditCheckoutLog}
                disabled={isSavingCheckoutLogEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSavingCheckoutLogEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Staff</label>
              <select
                value={editLogStaffId}
                onChange={(e) => setEditLogStaffId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Select staff</option>
                {knownStaffIds.map((staffId) => (
                  <option key={staffId} value={staffId}>{formatStaffLabel(staffId)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={editLogQuantity}
                  onChange={(e) => setEditLogQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
                <select
                  value={editLogActionType}
                  onChange={(e) => setEditLogActionType(e.target.value as InventoryActionType)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                >
                  {INVENTORY_ACTION_TYPES.map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
              <input
                value={editLogReason}
                onChange={(e) => setEditLogReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={Boolean(editingStock)}
          onClose={closeEditStockModal}
          title="Edit Inventory Stock"
          size="md"
          footer={(
            <>
              <button
                onClick={closeEditStockModal}
                disabled={isSavingStockEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleEditStock}
                disabled={isSavingStockEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSavingStockEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Warehouse</label>
                <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                  {editingStock ? (warehouseMap.get(editingStock.warehouse_id)?.name || editingStock.warehouse_id) : '—'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Item</label>
                <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                  {editingStock ? getItemName(itemMap.get(editingStock.item_id) || { id: editingStock.item_id }) : '—'}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity Available</label>
              <input
                type="number"
                min="0"
                value={editStockQuantity}
                onChange={(e) => setEditStockQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
