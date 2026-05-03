import React, { useMemo, useState } from 'react'
import { Eye } from 'lucide-react'
import type { LedgerEntry, LedgerFilters, LedgerType } from '../../api/lib/ledgerApi'
import { LEDGER_SOURCES, LEDGER_TYPES } from '../../api/lib/ledgerApi'
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
import { useGetLedgerListQuery, useGetLedgerSummaryQuery } from '../../store/apis/ledgerApi'

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

const formatDateTime = (value?: string | null) => {
    if (!value) return '—'
    return new Date(value).toLocaleString('vi-VN')
}



const ledgerTypeLabel: Record<LedgerType, string> = {
    ESCROW_CREDIT: 'Tiền vào',
    ESCROW_DEBIT: 'Tiền ra',
    REVENUE_RECOGNIZED: 'Doanh thu ghi nhận',
    PAYOUT: 'Thanh toán',
}

const ledgerTypeClassMap: Record<LedgerType, string> = {
    ESCROW_CREDIT: 'bg-emerald-100 text-emerald-700',
    ESCROW_DEBIT: 'bg-rose-100 text-rose-700',
    REVENUE_RECOGNIZED: 'bg-indigo-100 text-indigo-700',
    PAYOUT: 'bg-amber-100 text-amber-700',
}

const ledgerSourceLabel: Record<string, string> = {
    booking: 'Booking',
    refund: 'Hoàn tiền',
    withdrawal: 'Rút tiền',
    adjustment: 'Điều chỉnh',
    penalty: 'Phạt',
}

const summaryCards: Array<{
    key: string
    label: string
    format: 'currency' | 'number'
}> = [
        { key: 'escrow_balance', label: 'Số dư escrow', format: 'currency' },
        { key: 'escrow_in', label: 'Tổng tiền vào', format: 'currency' },
        { key: 'escrow_out', label: 'Tổng tiền ra', format: 'currency' },
        { key: 'revenue_recognized', label: 'Doanh thu ghi nhận', format: 'currency' },
        { key: 'payout', label: 'Thanh toán', format: 'currency' },
        { key: 'transaction_count', label: 'Số giao dịch', format: 'number' },
    ]

export const LedgerManagement: React.FC = () => {
    const [page, setPage] = useState(1)
    const [limit] = useState(20)

    const [type, setType] = useState<'all' | LedgerType>('all')
    const [source, setSource] = useState<'all' | string>('all')

    const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null)

    const filters: LedgerFilters = {
        page,
        limit,

        type: type === 'all' ? undefined : type,
        source: source === 'all' ? undefined : source,

    }



    const {
        data: listData,
        isLoading,
        error,
    } = useGetLedgerListQuery(filters, { pollingInterval: 4000, skipPollingIfUnfocused: true })

    const {
        data: summaryData,
        isLoading: summaryLoading,
        error: summaryError,
    } = useGetLedgerSummaryQuery(undefined, { pollingInterval: 4000, skipPollingIfUnfocused: true })

    const entries = listData?.items ?? []
    const pagination = listData?.pagination

    const totalPages = pagination?.totalPages ?? 1
    const currentPage = pagination?.page ?? page

    const errorMessage = useMemo(() => {
        if (!error) return null
        if (typeof error === 'string') return error

        if (typeof error === 'object' && error !== null && 'error' in error) {
            return String((error as { error: string }).error)
        }

        return 'Không thể tải danh sách ledger.'
    }, [error])

    const summaryErrorMessage = useMemo(() => {
        if (!summaryError) return null
        if (typeof summaryError === 'string') return summaryError

        if (typeof summaryError === 'object' && summaryError !== null && 'error' in summaryError) {
            return String((summaryError as { error: string }).error)
        }

        return 'Không thể tải tổng quan ledger.'
    }, [summaryError])

    const detailFields = useMemo(() => {
        if (!selectedEntry) return []

        return [
            { label: 'ID', value: selectedEntry.id },
            { label: 'Mongo ID', value: selectedEntry._id ?? '—' },
            { label: 'Loại', value: ledgerTypeLabel[selectedEntry.type] },
            { label: 'Số tiền', value: formatCurrency(selectedEntry.amount) },
            { label: 'Escrow delta', value: formatCurrency(selectedEntry.escrow_delta) },
            { label: 'Nguồn', value: ledgerSourceLabel[selectedEntry.source] ?? selectedEntry.source },
            { label: 'Order ID', value: selectedEntry.order_id ?? '—' },
            { label: 'Tên người dùng', value: selectedEntry.user_name ?? '—' },
            { label: 'Email người dùng', value: selectedEntry.user_email ?? '—' },
            { label: 'Mô tả', value: selectedEntry.description ?? '—' },
            { label: 'Tạo lúc', value: formatDateTime(selectedEntry.created_at) },
        ]
    }, [selectedEntry])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-gray-900">Ví Admin</h1>
                <p className="text-[1.03rem] leading-6 text-slate-500">Theo dõi ledger escrow và dòng tiền của hệ thống.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Tổng quan ledger</CardTitle>
                </CardHeader>
                <CardContent>
                    {summaryErrorMessage ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                            {summaryErrorMessage}
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {summaryCards.map((card) => {
                                const rawValue = summaryData?.[card.key as keyof typeof summaryData]
                                const value =
                                    typeof rawValue === 'number'
                                        ? card.format === 'currency'
                                            ? formatCurrency(rawValue)
                                            : rawValue.toLocaleString('vi-VN')
                                        : '—'

                                return (
                                    <div key={card.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase text-slate-500">{card.label}</p>
                                        <p className="mt-2 text-xl font-semibold text-slate-900">
                                            {summaryLoading ? 'Đang tải...' : value}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Bộ lọc ledger</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-4">


                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Loại giao dịch</p>
                        <Select
                            value={type}
                            onValueChange={(value) => {
                                setType(value as 'all' | LedgerType)
                                setPage(1)
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Tất cả" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                {LEDGER_TYPES.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {ledgerTypeLabel[item]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Nguồn</p>
                        <Select
                            value={source}
                            onValueChange={(value) => {
                                setSource(value)
                                setPage(1)
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Tất cả" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                {LEDGER_SOURCES.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {ledgerSourceLabel[item] ?? item}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>





                    <div className="flex items-end">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            {isLoading ? 'Đang tải dữ liệu...' : `Tổng: ${pagination?.total ?? entries.length}`}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Danh sách ledger</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Loại</TableHead>
                                <TableHead>Số tiền</TableHead>
                                <TableHead>Escrow delta</TableHead>
                                <TableHead>Nguồn</TableHead>
                                <TableHead>Order</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Thời gian</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, index) => (
                                    <TableRow key={`ledger-skeleton-${index}`} className="animate-pulse">
                                        <TableCell><div className="h-4 w-24 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="h-4 w-24 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="h-4 w-24 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="h-4 w-20 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="h-4 w-20 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="h-4 w-20 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="h-4 w-20 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="h-4 w-28 rounded bg-slate-200" /></TableCell>
                                        <TableCell><div className="ml-auto h-8 w-8 rounded bg-slate-200" /></TableCell>
                                    </TableRow>
                                ))
                            ) : errorMessage ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="py-8 text-center text-rose-600">
                                        {errorMessage}
                                    </TableCell>
                                </TableRow>
                            ) : entries.length ? (
                                entries.map((entry) => (
                                    <TableRow key={entry.id} className="hover:bg-slate-50">
                                        <TableCell>
                                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${ledgerTypeClassMap[entry.type]}`}>
                                                {ledgerTypeLabel[entry.type]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-900">
                                            {formatCurrency(entry.amount)}
                                        </TableCell>
                                        <TableCell className={entry.escrow_delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                            {entry.escrow_delta >= 0 ? '+' : '-'}{formatCurrency(Math.abs(entry.escrow_delta))}
                                        </TableCell>
                                        <TableCell>{ledgerSourceLabel[entry.source] ?? entry.source}</TableCell>
                                        <TableCell className="text-slate-600">{entry.order_id ?? '—'}</TableCell>
                                        <TableCell className="text-slate-600">{entry.user_name ?? '—'}</TableCell>
                                        <TableCell className="text-slate-500">{formatDateTime(entry.created_at)}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setSelectedEntry(entry)}
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="py-10 text-center text-slate-500">
                                        Không có dữ liệu ledger phù hợp.
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

            <Dialog open={Boolean(selectedEntry)} onOpenChange={(open) => !open && setSelectedEntry(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Chi tiết ledger</DialogTitle>
                        <DialogDescription>Thông tin chi tiết giao dịch.</DialogDescription>
                    </DialogHeader>

                    <div className="px-6 pb-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {detailFields.map((field) => (
                                <div key={field.label} className="space-y-2">
                                    <p className="text-xs font-semibold uppercase text-slate-500">{field.label}</p>
                                    <div className="flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                                        {field.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
