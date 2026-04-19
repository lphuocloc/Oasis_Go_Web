import React, { useEffect, useMemo, useState } from 'react'
import {
    CheckCircle2,
    Eye,
    XCircle,
} from 'lucide-react'
import { toast } from 'react-toastify'
import type { WalletWithdrawalItem } from '../../api/lib/walletWithdrawalApi'
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
    selectWalletWithdrawals,
    selectWalletWithdrawalsError,
    selectWalletWithdrawalsLoading,
    selectWalletWithdrawalsPagination,
} from '../../store/slices/walletWithdrawalsSlice'
import {
    fetchWalletWithdrawals,
    processWalletWithdrawal,
} from '../../store/thunks/walletWithdrawalsThunks'

type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

const statusClassMap: Record<WithdrawalStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
}

const statusTabs: Array<{ value: 'ALL' | WithdrawalStatus; label: string }> = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'REJECTED', label: 'Từ chối' },
]

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN')
}

const WithdrawTableSkeletonRow = () => (
    <TableRow className="animate-pulse">
        <TableCell>
            <div className="h-4 w-24 rounded bg-slate-200" />
        </TableCell>
        <TableCell>
            <div className="h-4 w-28 rounded bg-slate-200" />
        </TableCell>
        <TableCell>
            <div className="h-4 w-20 rounded bg-slate-200" />
        </TableCell>
        <TableCell>
            <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-3 w-20 rounded bg-slate-100" />
            </div>
        </TableCell>
        <TableCell>
            <div className="h-6 w-20 rounded-full bg-slate-200" />
        </TableCell>
        <TableCell>
            <div className="h-4 w-32 rounded bg-slate-200" />
        </TableCell>
        <TableCell>
            <div className="ml-auto flex w-fit items-center gap-2">
                <div className="h-8 w-8 rounded bg-slate-200" />
                <div className="h-8 w-8 rounded bg-slate-200" />
            </div>
        </TableCell>
    </TableRow>
)

export const WithdrawManagement: React.FC = () => {
    const dispatch = useAppDispatch()
    const withdrawals = useAppSelector(selectWalletWithdrawals)
    const isLoading = useAppSelector(selectWalletWithdrawalsLoading)
    const error = useAppSelector(selectWalletWithdrawalsError)
    const pagination = useAppSelector(selectWalletWithdrawalsPagination)

    const [filterStatus, setFilterStatus] = useState<'ALL' | WithdrawalStatus>('ALL')
    const [searchTerm] = useState('')
    const [selectedRequest, setSelectedRequest] = useState<WalletWithdrawalItem | null>(null)
    const [actionNote, setActionNote] = useState('')
    const [actionError, setActionError] = useState<string | null>(null)
    const [isProcessingAction, setIsProcessingAction] = useState(false)
    const [page, setPage] = useState(1)
    const limit = 20

    useEffect(() => {
        void dispatch(
            fetchWalletWithdrawals({
                status: filterStatus === 'ALL' ? undefined : filterStatus,
                page,
                limit,
                append: false,
            }),
        )
    }, [dispatch, filterStatus, page])

    useEffect(() => {
        const totalPages = pagination.totalPages ?? pagination.total_pages ?? 1
        if (!totalPages || totalPages < 1) return

        if (page > totalPages) {
            setPage(totalPages)
        }
    }, [page, pagination.totalPages, pagination.total_pages])

    useEffect(() => {
        if (selectedRequest) {
            setActionNote('')
            setActionError(null)
            return
        }

        setActionError(null)
        setIsProcessingAction(false)
    }, [selectedRequest])

    const filteredRequests = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase()
        return withdrawals.filter((request) => {
            const matchStatus = filterStatus === 'ALL' || request.status === filterStatus

            if (!keyword) {
                return matchStatus
            }

            const matchSearch =
                request.id.toLowerCase().includes(keyword) ||
                request.bank_account_number_snapshot.toLowerCase().includes(keyword) ||
                request.bank_name_snapshot.toLowerCase().includes(keyword)

            return matchStatus && matchSearch
        })
    }, [filterStatus, searchTerm, withdrawals])

    const totalPages = pagination.totalPages ?? pagination.total_pages ?? 1
    const currentPage = pagination.page ?? pagination.current_page ?? page


    const handleAction = async (id: string, nextStatus: WithdrawalStatus) => {
        const trimmedNote = actionNote.trim()

        if (nextStatus === 'REJECTED' && !trimmedNote) {
            setActionError('Tu choi bat buoc nhap ghi chu.')
            toast.error('Tu choi bat buoc nhap ghi chu.')
            return
        }

        setActionError(null)
        const action = nextStatus === 'APPROVED' ? 'APPROVE' : 'REJECT'

        try {
            setIsProcessingAction(true)
            await dispatch(
                processWalletWithdrawal({
                    id,
                    action,
                    note: trimmedNote,
                }),
            ).unwrap()

            toast.success(nextStatus === 'APPROVED' ? 'Phê duyệt yêu cầu thành công.' : 'Từ chối yêu cầu thành công.')

            setSelectedRequest((current) => (current?.id === id ? null : current))
        } catch (err) {
            setActionError(typeof err === 'string' ? err : 'Khong the xu ly yeu cau. Vui long thu lai.')
            toast.error(typeof err === 'string' ? err : 'Khong the xu ly yeu cau. Vui long thu lai.')
        } finally {
            setIsProcessingAction(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-gray-900">Quản lý rút tiền</h1>
                <p className="text-[1.03rem] leading-6 text-slate-500">Phê duyệt và theo dõi các yêu cầu rút tiền từ ví người dùng.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Bộ lọc trạng thái">
                    {statusTabs.map((tab) => (
                        <Button
                            key={tab.value}
                            type="button"
                            variant={filterStatus === tab.value ? 'default' : 'ghost'}
                            className={`h-10 rounded-xl border px-4 transition-colors ${filterStatus === tab.value
                                ? 'border-transparent bg-blue-700 text-white hover:bg-blue-700/95'
                                : 'border-transparent bg-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-300/60'
                                }`}
                            onClick={() => {
                                setFilterStatus(tab.value)
                                setPage(1)
                            }}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>
            </div>





            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Danh sách yêu cầu</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table className="min-w-[980px] table-fixed">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[14%]">Mã giao dịch</TableHead>
                                <TableHead className="w-[14%]">Người dùng</TableHead>
                                <TableHead className="w-[12%]">Số tiền</TableHead>
                                <TableHead className="w-[18%]">Ngân hàng</TableHead>
                                <TableHead className="w-[14%]">Trạng thái</TableHead>
                                <TableHead className="w-[18%]">Ngày yêu cầu</TableHead>
                                <TableHead className="w-[10%] text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                Array.from({ length: 6 }).map((_, index) => (
                                    <WithdrawTableSkeletonRow key={`withdraw-skeleton-${index}`} />
                                ))
                            )}

                            {!isLoading && error && (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-rose-600">
                                        {error}
                                    </TableCell>
                                </TableRow>
                            )}

                            {!isLoading && !error && filteredRequests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell className="font-mono text-xs text-slate-500">{request.id.slice(0, 8)}...</TableCell>
                                    <TableCell>{request.requester_name}</TableCell>
                                    <TableCell className="font-semibold">{formatCurrency(request.amount)}</TableCell>
                                    <TableCell>
                                        <div className="space-y-0.5">
                                            <p className="font-medium text-slate-800">{request.bank_name_snapshot}</p>
                                            <p className="text-xs text-slate-500">{request.bank_account_number_snapshot}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassMap[request.status]}`}>
                                            {request.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-xs text-slate-600">{formatDate(request.requested_at)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRequest(request)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {request.status === 'PENDING' && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAction(request.id, 'APPROVED')}>
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAction(request.id, 'REJECTED')}>
                                                        <XCircle className="h-4 w-4 text-rose-600" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!isLoading && !error && filteredRequests.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                                        Khong co yeu cau rut tien phu hop.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1 || isLoading}>
                    Trang truoc
                </Button>
                <span className="px-1 text-sm text-slate-600">Trang {currentPage}/{Math.max(1, totalPages)}</span>
                <Button
                    variant="outline"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={isLoading || currentPage >= Math.max(1, totalPages)}
                >
                    Trang sau
                </Button>
            </div>

            <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent>
                    {selectedRequest && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Chi tiết yêu cầu rút tiền</DialogTitle>
                                <DialogDescription>Thông tin giao dịch và tài khoản nhận tiền.</DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 px-6 pb-2 sm:grid-cols-2">
                                <Card>
                                    <CardContent className="space-y-1 p-4">
                                        <p className="text-xs text-slate-500">Mã giao dịch</p>
                                        <p className="text-sm font-mono">{selectedRequest.id}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="space-y-1 p-4">
                                        <p className="text-xs text-slate-500">Số tiền</p>
                                        <p className="text-lg font-bold text-indigo-700">{formatCurrency(selectedRequest.amount)}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="space-y-1 p-4">
                                        <p className="text-xs text-slate-500">Ngân hàng</p>
                                        <p className="text-sm font-medium">{selectedRequest.bank_name_snapshot}</p>
                                        <p className="text-xs text-slate-500">{selectedRequest.bank_account_number_snapshot}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="space-y-1 p-4">
                                        <p className="text-xs text-slate-500">Chủ tài khoản</p>
                                        <p className="text-sm font-medium">{selectedRequest.requester_name ?? '-'}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="px-6 pb-4 text-sm text-slate-600">
                                <p className="mb-1 font-medium text-slate-800">Ghi chú</p>
                                <p className="rounded-lg bg-slate-50 p-3">{selectedRequest.note ?? '-'}</p>
                            </div>

                            {selectedRequest.status === 'PENDING' && (
                                <div className="px-6 pb-2">
                                    <label htmlFor="withdraw-action-note" className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Ghi chú xử lý
                                    </label>
                                    <textarea
                                        id="withdraw-action-note"
                                        value={actionNote}
                                        onChange={(event) => setActionNote(event.target.value)}
                                        placeholder="Nhap ghi chu (bat buoc khi tu choi, tuy chon khi phe duyet)..."
                                        className="min-h-[92px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-blue-400"
                                    />
                                    {actionError && (
                                        <p className="mt-2 text-sm font-medium text-rose-600">{actionError}</p>
                                    )}
                                </div>
                            )}

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                                    Đóng
                                </Button>
                                {selectedRequest.status === 'PENDING' && (
                                    <>
                                        <Button
                                            variant="destructive"
                                            disabled={isProcessingAction}
                                            onClick={() => void handleAction(selectedRequest.id, 'REJECTED')}
                                        >
                                            Từ chối
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            disabled={isProcessingAction}
                                            onClick={() => void handleAction(selectedRequest.id, 'APPROVED')}
                                        >
                                            Phê duyệt
                                        </Button>
                                    </>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}