/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, PencilLine, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import type { PricingRuleItem } from '../../api/lib/pricingRuleApi'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../../components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../../components/ui/table'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
    clearLocationsError,
    selectLocations,
    selectLocationsError,
    selectLocationsLoading
} from '../../store/slices/locationsSlice'
import {
    clearPricingRulesError,
    selectPricingRules,
    selectPricingRulesError,
    selectPricingRulesLoading,
    selectPricingRulesPagination,
    selectPricingRulesSaving
} from '../../store/slices/pricingRulesSlice'
import { fetchLocations } from '../../store/thunks/locationsThunks'
import {
    createPricingRule,
    deactivatePricingRule,
    fetchPricingRules,
    updatePricingRule
} from '../../store/thunks/pricingRulesThunks'

const DAYS_OF_WEEK = [
    { value: 'MON', label: 'T2' },
    { value: 'TUE', label: 'T3' },
    { value: 'WED', label: 'T4' },
    { value: 'THU', label: 'T5' },
    { value: 'FRI', label: 'T6' },
    { value: 'SAT', label: 'T7' },
    { value: 'SUN', label: 'CN' }
]

const formatTime = (value?: string | null) => {
    if (!value) return '—'
    return value.length >= 5 ? value.slice(0, 5) : value
}

const toTimeInputValue = (value?: string | null) => {
    if (!value) return ''
    return value.length >= 5 ? value.slice(0, 5) : value
}

const formatDays = (days: string[]) => {
    if (!days.length) return '—'
    const labelMap = new Map(DAYS_OF_WEEK.map((day) => [day.value, day.label]))
    return days.map((day) => labelMap.get(day) ?? day).join(', ')
}

const statusClassMap = (isActive: boolean) =>
    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'

type PricingRuleFormState = {
    location_id: string
    start_time: string
    end_time: string
    days_of_week: string[]
    multiplier: string
    is_active: 'true' | 'false'
}

const buildDefaultForm = (): PricingRuleFormState => ({
    location_id: '',
    start_time: '',
    end_time: '',
    days_of_week: [],
    multiplier: '',
    is_active: 'true'
})

export const PricingRuleManagement: React.FC = () => {
    const dispatch = useAppDispatch()
    const locations = useAppSelector(selectLocations)
    const locationsLoading = useAppSelector(selectLocationsLoading)
    const locationsError = useAppSelector(selectLocationsError)
    const pricingRules = useAppSelector(selectPricingRules)
    const pricingRulesError = useAppSelector(selectPricingRulesError)
    const pricingRulesLoading = useAppSelector(selectPricingRulesLoading)
    const pricingRulesSaving = useAppSelector(selectPricingRulesSaving)
    const pagination = useAppSelector(selectPricingRulesPagination)

    const [locationFilter, setLocationFilter] = useState<string>('all')
    const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
    const [page, setPage] = useState(1)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<PricingRuleItem | null>(null)
    const [formState, setFormState] = useState<PricingRuleFormState>(() => buildDefaultForm())
    const [formError, setFormError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const limit = 20

    useEffect(() => {
        void dispatch(fetchLocations())
    }, [dispatch])

    useEffect(() => {
        void dispatch(
            fetchPricingRules({
                page,
                limit,
                location_id: locationFilter === 'all' ? undefined : locationFilter,
                is_active: activeFilter === 'all' ? undefined : activeFilter === 'true'
            })
        )
    }, [dispatch, page, limit, locationFilter, activeFilter])

    useEffect(() => {
        if (!locationsError) return
        toast.error(locationsError)
        dispatch(clearLocationsError())
    }, [locationsError, dispatch])

    useEffect(() => {
        if (!pricingRulesError) return
        toast.error(pricingRulesError)
        dispatch(clearPricingRulesError())
    }, [pricingRulesError, dispatch])

    const childLocations = useMemo(
        () => locations.filter((location) => Boolean(location.parent_id)),
        [locations]
    )

    const locationMap = useMemo(
        () => new Map(locations.map((location) => [location.id, location])),
        [locations]
    )

    const totalPages = pagination.totalPages ?? pagination.total_pages ?? 1
    const currentPage = pagination.page ?? pagination.current_page ?? page

    useEffect(() => {
        if (!totalPages || totalPages < 1) return
        if (page > totalPages) setPage(totalPages)
    }, [page, totalPages])

    const openCreateForm = () => {
        setEditingRule(null)
        setFormState(buildDefaultForm())
        setFormError(null)
        setIsFormOpen(true)
    }

    const openEditForm = (rule: PricingRuleItem) => {
        setEditingRule(rule)
        setFormState({
            location_id: rule.location_id,
            start_time: toTimeInputValue(rule.start_time),
            end_time: toTimeInputValue(rule.end_time),
            days_of_week: rule.days_of_week ?? [],
            multiplier: String(rule.multiplier),
            is_active: rule.is_active ? 'true' : 'false'
        })
        setFormError(null)
        setIsFormOpen(true)
    }

    const handleFormClose = (open: boolean) => {
        setIsFormOpen(open)
        if (!open) setFormError(null)
    }

    const updateForm = <K extends keyof PricingRuleFormState>(
        key: K,
        value: PricingRuleFormState[K]
    ) => {
        setFormState((prev) => ({
            ...prev,
            [key]: value
        }))
    }

    const toggleDay = (day: string) => {
        setFormState((prev) => {
            const exists = prev.days_of_week.includes(day)
            return {
                ...prev,
                days_of_week: exists
                    ? prev.days_of_week.filter((value) => value !== day)
                    : [...prev.days_of_week, day]
            }
        })
    }

    const validateForm = () => {
        if (!formState.location_id) return 'Vui lòng chọn vị trí con.'
        if (!formState.start_time || !formState.end_time) return 'Vui lòng chọn khung giờ.'
        if (formState.days_of_week.length === 0) return 'Vui lòng chọn ngày áp dụng.'

        const multiplier = Number(formState.multiplier)
        if (!formState.multiplier.trim() || Number.isNaN(multiplier) || multiplier <= 0) {
            return 'Hệ số giá phải lớn hơn 0.'
        }

        return null
    }

    const handleSubmit = async () => {
        const validationError = validateForm()
        if (validationError) {
            setFormError(validationError)
            toast.error(validationError)
            return
        }

        const payload = {
            location_id: formState.location_id,
            start_time: formState.start_time,
            end_time: formState.end_time,
            days_of_week: formState.days_of_week,
            multiplier: Number(formState.multiplier),
            is_active: formState.is_active === 'true'
        }

        try {
            if (editingRule) {
                await dispatch(updatePricingRule({ id: editingRule.id, payload })).unwrap()
                toast.success('Cập nhật pricing rule thành công.')
            } else {
                await dispatch(createPricingRule(payload)).unwrap()
                toast.success('Tạo pricing rule thành công.')
            }

            setIsFormOpen(false)
            await dispatch(
                fetchPricingRules({
                    page,
                    limit,
                    location_id: locationFilter === 'all' ? undefined : locationFilter,
                    is_active: activeFilter === 'all' ? undefined : activeFilter === 'true'
                })
            ).unwrap()
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Không thể lưu pricing rule')
        }
    }

    const handleDeactivate = async (rule: PricingRuleItem) => {
        const confirmed = window.confirm('Bạn có chắc muốn vô hiệu hóa pricing rule này?')
        if (!confirmed) return

        try {
            setDeletingId(rule.id)
            await dispatch(deactivatePricingRule(rule.id)).unwrap()
            toast.success('Đã vô hiệu hóa pricing rule.')
            await dispatch(
                fetchPricingRules({
                    page,
                    limit,
                    location_id: locationFilter === 'all' ? undefined : locationFilter,
                    is_active: activeFilter === 'all' ? undefined : activeFilter === 'true'
                })
            ).unwrap()
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Không thể vô hiệu hóa pricing rule')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pricing Rules</h1>
                    <p className="text-gray-500 mt-1">Thiết lập hệ số giá theo vị trí con và khung giờ.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => {
                            void dispatch(
                                fetchPricingRules({
                                    page,
                                    limit,
                                    location_id: locationFilter === 'all' ? undefined : locationFilter,
                                    is_active: activeFilter === 'all' ? undefined : activeFilter === 'true'
                                })
                            )
                        }}
                        disabled={pricingRulesLoading}
                        variant="outline"
                    >
                        <RefreshCw className={`w-4 h-4 ${pricingRulesLoading ? 'animate-spin' : ''}`} />
                        Tải lại
                    </Button>

                    <Button onClick={openCreateForm}>
                        <Plus className="w-4 h-4" />
                        Tạo pricing rule
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-500">Tổng quy luật</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{pricingRules.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-500">Đang áp dụng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">
                            {pricingRules.filter((rule) => rule.is_active).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-gray-500">Vị trí con</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-indigo-600">{childLocations.length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_0.7fr] gap-4">
                    <Select
                        value={locationFilter}
                        onValueChange={(value) => {
                            setLocationFilter(value)
                            setPage(1)
                        }}
                    >
                        <SelectTrigger className="px-4 py-2.5">
                            <SelectValue placeholder="Chọn vị trí con" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả vị trí con</SelectItem>
                            {childLocations.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                    {location.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={activeFilter}
                        onValueChange={(value) => {
                            setActiveFilter(value as 'all' | 'true' | 'false')
                            setPage(1)
                        }}
                    >
                        <SelectTrigger className="px-4 py-2.5">
                            <SelectValue placeholder="Trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả trạng thái</SelectItem>
                            <SelectItem value="true">Đang áp dụng</SelectItem>
                            <SelectItem value="false">Đã vô hiệu</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
                        Trang {currentPage} / {totalPages}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">Danh sách pricing rules</h2>
                    <span className="text-sm text-gray-500">{pricingRules.length} item(s)</span>
                </div>

                <div className="overflow-x-auto">
                    <Table className="w-full text-sm">
                        <TableHeader className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                            <TableRow>
                                <TableHead className="px-6 py-3 font-medium">Vị trí con</TableHead>
                                <TableHead className="px-6 py-3 font-medium">Khung giờ</TableHead>
                                <TableHead className="px-6 py-3 font-medium">Ngày áp dụng</TableHead>
                                <TableHead className="px-6 py-3 font-medium">Hệ số</TableHead>
                                <TableHead className="px-6 py-3 font-medium">Trạng thái</TableHead>
                                <TableHead className="px-6 py-3 text-right font-medium">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100">
                            {pricingRulesLoading ? (
                                Array.from({ length: 6 }).map((_, index) => (
                                    <TableRow key={`pricing-rule-skeleton-${index}`} className="animate-pulse">
                                        {Array.from({ length: 6 }).map((__, cellIndex) => (
                                            <TableCell key={cellIndex} className="px-6 py-4">
                                                <div className="h-4 w-full max-w-[12rem] rounded bg-slate-200" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : pricingRules.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        Chưa có pricing rule nào.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pricingRules.map((rule) => (
                                    <TableRow key={rule.id} className="hover:bg-gray-50 transition-colors">
                                        <TableCell className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">
                                                {locationMap.get(rule.location_id)?.name ?? rule.location_id}
                                            </div>
                                            <div className="text-xs text-gray-400">{rule.location_id}</div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-gray-700">
                                            {formatTime(rule.start_time)} - {formatTime(rule.end_time)}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-gray-600">
                                            {formatDays(rule.days_of_week)}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-gray-900 font-semibold">
                                            {rule.multiplier}
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClassMap(rule.is_active)}`}>
                                                {rule.is_active ? 'Đang áp dụng' : 'Đã vô hiệu'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    onClick={() => openEditForm(rule)}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <PencilLine className="w-4 h-4" />
                                                    Điều chỉnh
                                                </Button>
                                                <Button
                                                    onClick={() => handleDeactivate(rule)}
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={deletingId === rule.id || !rule.is_active}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    {rule.is_active ? 'Vô hiệu' : 'Đã vô hiệu'}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Trang {currentPage} / {totalPages}</span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1}
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        >
                            Trước
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages}
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        >
                            Sau
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
                <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingRule ? 'Chỉnh sửa pricing rule' : 'Tạo pricing rule'}</DialogTitle>
                        <DialogDescription className="sr-only">
                            Form để {editingRule ? 'chỉnh sửa' : 'tạo'} pricing rule.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 px-6 pb-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Vị trí con</label>
                                <Select
                                    value={formState.location_id}
                                    onValueChange={(value) => updateForm('location_id', value)}
                                    disabled={locationsLoading}
                                >
                                    <SelectTrigger className="w-full px-4 py-2.5">
                                        <SelectValue placeholder="Chọn vị trí con" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {childLocations.map((location) => (
                                            <SelectItem key={location.id} value={location.id}>
                                                {location.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Hệ số giá</label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formState.multiplier}
                                    onChange={(e) => updateForm('multiplier', e.target.value)}
                                    placeholder="1.2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Giờ bắt đầu</label>
                                <Input
                                    type="time"
                                    value={formState.start_time}
                                    onChange={(e) => updateForm('start_time', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Giờ kết thúc</label>
                                <Input
                                    type="time"
                                    value={formState.end_time}
                                    onChange={(e) => updateForm('end_time', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                                <Select
                                    value={formState.is_active}
                                    onValueChange={(value) => updateForm('is_active', value as 'true' | 'false')}
                                >
                                    <SelectTrigger className="w-full px-4 py-2.5">
                                        <SelectValue placeholder="Chọn trạng thái" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Đang áp dụng</SelectItem>
                                        <SelectItem value="false">Đã vô hiệu</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Ngày áp dụng</label>
                            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                                {DAYS_OF_WEEK.map((day) => (
                                    <label
                                        key={day.value}
                                        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${formState.days_of_week.includes(day.value)
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={formState.days_of_week.includes(day.value)}
                                            onChange={() => toggleDay(day.value)}
                                        />
                                        {day.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {formError && (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {formError}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={() => setIsFormOpen(false)}
                            disabled={pricingRulesSaving}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={pricingRulesSaving}
                        >
                            {pricingRulesSaving ? 'Saving...' : editingRule ? 'Lưu thay đổi' : 'Tạo quy tắc'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
