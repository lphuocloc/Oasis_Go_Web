import React, { useEffect, useMemo, useState } from 'react'
import {
    CheckCircle2,
    Eye,
    PencilLine,
    Plus,
    Search,
    XCircle,
} from 'lucide-react'
import { toast } from 'react-toastify'
import type {
    VoucherCreatePayload,
    VoucherDiscountType,
    VoucherItem,
    VoucherUpdatePayload,
} from '../../api/lib/voucherApi'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog'
import SlidePanel from '../../components/common/SlidePanel'
import { Input } from '../../components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
    clearVoucherDetail,
    selectVoucherDetail,
    selectVoucherDetailLoading,
    selectVouchers,
    selectVouchersError,
    selectVouchersLoading,
    selectVouchersPagination,
    selectVouchersSaving,
} from '../../store/slices/vouchersSlice'
import {
    activateVoucher,
    createVoucher,
    deactivateVoucher,
    fetchVoucherDetail,
    fetchVouchers,
    updateVoucher,
} from '../../store/thunks/vouchersThunks'

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

const formatDateTime = (value?: string | null) => {
    if (!value) return '—'
    return new Date(value).toLocaleString('vi-VN')
}

const toLocalInputValue = (value?: string | null) => {
    if (!value) return ''
    const date = new Date(value)
    const pad = (num: number) => String(num).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const toIsoString = (value: string) => {
    if (!value) return ''
    return new Date(value).toISOString()
}

const formatNumberInput = (value: string) => {
    const digits = value.replace(/[^\d]/g, '')
    if (!digits) return ''
    return new Intl.NumberFormat('vi-VN').format(Number(digits))
}

const formatNumberDisplay = (value?: number | null) => {
    if (value === null || value === undefined) return ''
    return new Intl.NumberFormat('vi-VN').format(value)
}

const parseNumberInput = (value: string) => {
    const digits = value.replace(/[^\d]/g, '')
    if (!digits) return Number.NaN
    return Number(digits)
}

const numberOrUndefined = (value: string) => {
    const parsed = parseNumberInput(value)
    if (Number.isNaN(parsed)) return undefined
    return parsed
}

const statusClassMap = (isActive: boolean) =>
    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'

const voucherTypeLabel: Record<VoucherDiscountType, string> = {
    PERCENT: 'Phần trăm',
    FIXED: 'Số tiền cố định',
}

const voucherTypeClassMap: Record<VoucherDiscountType, string> = {
    PERCENT: 'bg-indigo-100 text-indigo-700',
    FIXED: 'bg-amber-100 text-amber-700',
}

const buildDefaultForm = (): VoucherFormState => ({
    code: '',
    description: '',
    discount_type: 'PERCENT',
    discount_value: '',
    max_discount: '',
    min_booking_value: '',
    usage_limit: '',
    valid_from: '',
    valid_to: '',
    is_active: 'true',
})

type VoucherFormState = {
    code: string
    description: string
    discount_type: VoucherDiscountType
    discount_value: string
    max_discount: string
    min_booking_value: string
    usage_limit: string
    valid_from: string
    valid_to: string
    is_active: 'true' | 'false'
}

export const VoucherManagement: React.FC = () => {
    const dispatch = useAppDispatch()
    const vouchers = useAppSelector(selectVouchers)
    const isLoading = useAppSelector(selectVouchersLoading)
    const isSaving = useAppSelector(selectVouchersSaving)
    const error = useAppSelector(selectVouchersError)
    const pagination = useAppSelector(selectVouchersPagination)
    const voucherDetail = useAppSelector(selectVoucherDetail)
    const voucherDetailLoading = useAppSelector(selectVoucherDetailLoading)

    const [searchCode, setSearchCode] = useState('')
    const [discountType, setDiscountType] = useState<'all' | VoucherDiscountType>('all')
    const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
    const [page, setPage] = useState(1)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingVoucher, setEditingVoucher] = useState<VoucherItem | null>(null)
    const [formState, setFormState] = useState<VoucherFormState>(() => buildDefaultForm())
    const [formError, setFormError] = useState<string | null>(null)

    const [detailId, setDetailId] = useState<string | null>(null)

    const limit = 20

    useEffect(() => {
        void dispatch(
            fetchVouchers({
                page,
                limit,
                code: searchCode.trim() ? searchCode.trim() : undefined,
                discount_type: discountType === 'all' ? undefined : discountType,
                is_active:
                    activeFilter === 'all' ? undefined : activeFilter === 'true',
            }),
        )
    }, [dispatch, page, limit, searchCode, discountType, activeFilter])

    useEffect(() => {
        const totalPages = pagination.totalPages ?? pagination.total_pages ?? 1
        if (!totalPages || totalPages < 1) return

        if (page > totalPages) {
            setPage(totalPages)
        }
    }, [page, pagination.totalPages, pagination.total_pages])

    useEffect(() => {
        if (detailId) {
            void dispatch(fetchVoucherDetail(detailId))
        } else {
            dispatch(clearVoucherDetail())
        }
    }, [detailId, dispatch])

    useEffect(() => {
        if (!error) return
        toast.error(error)
    }, [error])

    const totalPages = pagination.totalPages ?? pagination.total_pages ?? 1
    const currentPage = pagination.page ?? pagination.current_page ?? page

    const openCreateForm = () => {
        setEditingVoucher(null)
        setFormState(buildDefaultForm())
        setFormError(null)
        setIsFormOpen(true)
    }

    const openEditForm = (voucher: VoucherItem) => {
        setEditingVoucher(voucher)
        setFormState({
            code: voucher.code ?? '',
            description: voucher.description ?? '',
            discount_type: voucher.discount_type,
            discount_value: formatNumberDisplay(voucher.discount_value),
            max_discount: formatNumberDisplay(voucher.max_discount),
            min_booking_value: formatNumberDisplay(voucher.min_booking_value),
            usage_limit: formatNumberDisplay(voucher.usage_limit),
            valid_from: toLocalInputValue(voucher.valid_from),
            valid_to: toLocalInputValue(voucher.valid_to),
            is_active: voucher.is_active ? 'true' : 'false',
        })
        setFormError(null)
        setIsFormOpen(true)
    }

    const handleFormClose = (open: boolean) => {
        setIsFormOpen(open)
        if (!open) {
            setFormError(null)
        }
    }

    const validateForm = () => {
        if (!formState.discount_value.trim()) {
            return 'Vui lòng nhập giá trị giảm.'
        }

        const discountValue = parseNumberInput(formState.discount_value)
        if (Number.isNaN(discountValue) || discountValue < 0) {
            return 'Giá trị giảm không hợp lệ.'
        }

        if (formState.discount_type === 'PERCENT' && discountValue > 100) {
            return 'Giảm theo phần trăm không vượt quá 100%.'
        }

        if (!formState.valid_from || !formState.valid_to) {
            return 'Vui lòng nhập thời gian hiệu lực.'
        }

        const from = new Date(formState.valid_from)
        const to = new Date(formState.valid_to)
        if (to.getTime() < from.getTime()) {
            return 'Ngày kết thúc phải lớn hơn ngày bắt đầu.'
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

        const payloadBase: VoucherCreatePayload = {
            description: formState.description.trim() ? formState.description.trim() : undefined,
            discount_type: formState.discount_type,
            discount_value: parseNumberInput(formState.discount_value),
            max_discount:
                formState.discount_type === 'PERCENT'
                    ? numberOrUndefined(formState.max_discount)
                    : undefined,
            min_booking_value: numberOrUndefined(formState.min_booking_value),
            usage_limit: numberOrUndefined(formState.usage_limit),
            is_active: formState.is_active === 'true',
            valid_from: toIsoString(formState.valid_from),
            valid_to: toIsoString(formState.valid_to),
        }

        try {
            if (editingVoucher) {
                const updatePayload: VoucherUpdatePayload = {
                    ...payloadBase,
                }
                await dispatch(updateVoucher({ id: editingVoucher.id, payload: updatePayload })).unwrap()
                toast.success('Cập nhật voucher thành công.')
            } else {
                await dispatch(createVoucher(payloadBase)).unwrap()
                toast.success('Tạo voucher thành công.')
            }

            setIsFormOpen(false)
        } catch (err) {
            const message = typeof err === 'string' ? err : 'Không thể lưu voucher.'
            setFormError(message)
            toast.error(message)
        }
    }

    const handleToggleStatus = async (voucher: VoucherItem) => {
        try {
            setTogglingId(voucher.id)
            if (voucher.is_active) {
                await dispatch(deactivateVoucher(voucher.id)).unwrap()
                toast.success('Voucher đã được vô hiệu hóa.')
            } else {
                await dispatch(activateVoucher(voucher.id)).unwrap()
                toast.success('Voucher đã được kích hoạt.')
            }
        } catch (err) {
            toast.error(typeof err === 'string' ? err : 'Không thể thay đổi trạng thái voucher.')
        } finally {
            setTogglingId(null)
        }
    }

    const detailFields = useMemo(() => {
        if (!voucherDetail) return []

        return [
            { label: 'Mã voucher', value: voucherDetail.code },
            { label: 'Mô tả', value: voucherDetail.description || '—' },
            { label: 'Loại', value: voucherTypeLabel[voucherDetail.discount_type] },
            {
                label: 'Giá trị giảm',
                value:
                    voucherDetail.discount_type === 'PERCENT'
                        ? `${voucherDetail.discount_value}%`
                        : formatCurrency(voucherDetail.discount_value),
            },
            {
                label: 'Giảm tối đa',
                value:
                    voucherDetail.discount_type === 'PERCENT'
                        ? voucherDetail.max_discount
                            ? formatCurrency(voucherDetail.max_discount)
                            : '—'
                        : '—',
            },
            {
                label: 'Giá trị booking tối thiểu',
                value: voucherDetail.min_booking_value
                    ? formatCurrency(voucherDetail.min_booking_value)
                    : '0',
            },
            {
                label: 'Giới hạn sử dụng',
                value: voucherDetail.usage_limit ? String(voucherDetail.usage_limit) : 'Không giới hạn',
            },
            { label: 'Đã sử dụng', value: String(voucherDetail.usage_count) },
            { label: 'Trạng thái', value: voucherDetail.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động' },
            { label: 'Bắt đầu', value: formatDateTime(voucherDetail.valid_from) },
            { label: 'Kết thúc', value: formatDateTime(voucherDetail.valid_to) },
            { label: 'Tạo lúc', value: formatDateTime(voucherDetail.created_at) },
            { label: 'Cập nhật', value: formatDateTime(voucherDetail.updated_at) },
        ]
    }, [voucherDetail])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-gray-900">Quản Lý Voucher</h1>
                <p className="text-[1.03rem] leading-6 text-slate-500">Tạo, cập nhật và theo dõi voucher khuyến mãi.</p>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <CardTitle className="text-lg">Bộ lọc voucher</CardTitle>
                    </div>
                    <Button onClick={openCreateForm} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Tạo voucher
                    </Button>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-4">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Mã voucher</p>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={searchCode}
                                onChange={(event) => {
                                    setSearchCode(event.target.value)
                                    setPage(1)
                                }}
                                placeholder="Nhập mã voucher"
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Loại giảm giá</p>
                        <Select
                            value={discountType}
                            onValueChange={(value) => {
                                setDiscountType(value as 'all' | VoucherDiscountType)
                                setPage(1)
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Tất cả" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="PERCENT">Phần trăm</SelectItem>
                                <SelectItem value="FIXED">Tiền cố định</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Trạng thái</p>
                        <Select
                            value={activeFilter}
                            onValueChange={(value) => {
                                setActiveFilter(value as 'all' | 'true' | 'false')
                                setPage(1)
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Tất cả" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="true">Đang hoạt động</SelectItem>
                                <SelectItem value="false">Ngừng hoạt động</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end gap-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            {isLoading ? 'Đang tải dữ liệu...' : `Tổng: ${pagination.total ?? pagination.total_items ?? vouchers.length}`}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Danh sách voucher</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mã</TableHead>
                                <TableHead>Loại</TableHead>
                                <TableHead>Giá trị</TableHead>
                                <TableHead>Hiệu lực</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Lượt dùng</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <TableRow key={`voucher-skeleton-${index}`} className="animate-pulse">
                                        <TableCell><div className="h-4 w-24 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="h-4 w-20 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="h-4 w-24 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="h-4 w-32 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="h-6 w-24 rounded-full bg-slate-200" /></TableCell>
                                        <TableCell><div className="ml-auto h-4 w-10 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="ml-auto h-8 w-24 rounded bg-slate-200" /></TableCell>
                                    </TableRow>
                                ))
                            ) : vouchers.length ? (
                                vouchers.map((voucher) => (
                                    <TableRow key={voucher.id} className="hover:bg-slate-50">
                                        <TableCell className="font-semibold text-slate-900">{voucher.code}</TableCell>
                                        <TableCell>
                                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${voucherTypeClassMap[voucher.discount_type]}`}>
                                                {voucherTypeLabel[voucher.discount_type]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700">
                                            {voucher.discount_type === 'PERCENT'
                                                ? `${voucher.discount_value}%`
                                                : formatCurrency(voucher.discount_value)}
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            <div>{formatDateTime(voucher.valid_from)}</div>
                                            <div className="text-xs text-slate-400">đến {formatDateTime(voucher.valid_to)}</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClassMap(voucher.is_active)}`}>
                                                {voucher.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-slate-700">{voucher.usage_count}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDetailId(voucher.id)}
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditForm(voucher)}
                                                    title="Chỉnh sửa"
                                                >
                                                    <PencilLine className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => void handleToggleStatus(voucher)}
                                                    disabled={togglingId === voucher.id}
                                                    title={voucher.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                >
                                                    {voucher.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-slate-500">
                                        Không có voucher phù hợp.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">
                            Trang {currentPage} / {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage <= 1 || isLoading}
                            >
                                Trước
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage >= totalPages || isLoading}
                            >
                                Tiếp
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingVoucher ? 'Cập nhật voucher' : 'Tạo voucher mới'}</DialogTitle>
                        <DialogDescription>
                            {editingVoucher ? 'Điều chỉnh thông tin voucher.' : 'Nhập thông tin voucher để tạo mới.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 px-6 pb-6 pt-2 sm:grid-cols-2">
                        {editingVoucher && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase text-slate-500">Mã voucher</p>
                                <Input
                                    value={editingVoucher.code}
                                    disabled
                                    readOnly
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase text-slate-500">Loại giảm giá *</p>
                            <Select
                                value={formState.discount_type}
                                onValueChange={(value) =>
                                    setFormState((prev) => ({ ...prev, discount_type: value as VoucherDiscountType }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PERCENT">Phần trăm</SelectItem>
                                    <SelectItem value="FIXED">Số tiền cố định</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase text-slate-500">Giá trị giảm giá *</p>
                            <Input
                                value={formState.discount_value}
                                onChange={(event) =>
                                    setFormState((prev) => ({ ...prev, discount_value: formatNumberInput(event.target.value) }))
                                }
                                placeholder={formState.discount_type === 'PERCENT' ? 'VD: 20' : 'VD: 10.000'}
                            />
                        </div>
                        {formState.discount_type === 'PERCENT' && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase text-slate-500">Giảm tối đa</p>
                                <Input
                                    value={formState.max_discount}
                                    onChange={(event) =>
                                        setFormState((prev) => ({ ...prev, max_discount: formatNumberInput(event.target.value) }))
                                    }
                                    placeholder="VD: 100.000"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase text-slate-500">Booking tối thiểu</p>
                            <Input
                                value={formState.min_booking_value}
                                onChange={(event) =>
                                    setFormState((prev) => ({ ...prev, min_booking_value: formatNumberInput(event.target.value) }))
                                }
                                placeholder="VD: 200.000"
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase text-slate-500">Giới hạn sử dụng</p>
                            <Input
                                value={formState.usage_limit}
                                onChange={(event) =>
                                    setFormState((prev) => ({ ...prev, usage_limit: formatNumberInput(event.target.value) }))
                                }
                                placeholder="VD: 500"
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase text-slate-500">Bắt đầu *</p>
                            <Input
                                type="datetime-local"
                                value={formState.valid_from}
                                onChange={(event) => setFormState((prev) => ({ ...prev, valid_from: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase text-slate-500">Kết thúc *</p>
                            <Input
                                type="datetime-local"
                                value={formState.valid_to}
                                onChange={(event) => setFormState((prev) => ({ ...prev, valid_to: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <p className="text-xs font-semibold uppercase text-slate-500">Mô tả</p>
                            <Input
                                value={formState.description}
                                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                                placeholder="Mô tả voucher"
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase text-slate-500">Trạng thái</p>
                            <Select
                                value={formState.is_active}
                                onValueChange={(value) => setFormState((prev) => ({ ...prev, is_active: value as 'true' | 'false' }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Đang hoạt động</SelectItem>
                                    <SelectItem value="false">Ngừng hoạt động</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {formError && (
                        <div className="px-6 pb-4 text-sm text-rose-600">{formError}</div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={() => void handleSubmit()} disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu voucher'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <SlidePanel
                isOpen={Boolean(detailId)}
                onClose={() => setDetailId(null)}
                title="Chi tiết voucher"
                width="max-w-2xl"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Thông tin chi tiết voucher.</p>
                    {voucherDetailLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div key={`detail-skeleton-${index}`} className="h-4 w-full rounded bg-slate-200" />
                            ))}
                        </div>
                    ) : voucherDetail ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {detailFields.map((field) => (
                                <div key={field.label} className="space-y-2">
                                    <p className="text-xs font-semibold uppercase text-slate-500">{field.label}</p>
                                    <div className="flex min-h-[40px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900">
                                        {field.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Không tìm thấy thông tin voucher.
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setDetailId(null)}>
                            Đóng
                        </Button>
                    </div>
                </div>
            </SlidePanel>
        </div>
    )
}
