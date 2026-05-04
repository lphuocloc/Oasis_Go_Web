import { Fragment, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
    clearManagerCleaningTasks,
    clearManagerCleaningTaskDetail
} from '../../store/slices/managerCleaningTasksSlice'
import {
    fetchManagerCleaningTasks,
    fetchManagerCleaningTaskDetail
} from '../../store/thunks/managerCleaningTasksThunks'
import { fetchBookings } from '../../store/thunks/bookingsThunks'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '../../components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../../components/ui/table'

const formatDateTime = (value?: string | null) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('vi-VN')
}

const bookingStatusLabel: Record<string, string> = {
    BOOKED: 'Đã đặt',
    IN_USE: 'Đang dọn dẹp',
    COMPLETED: 'Hoàn Tất',
    CANCELLED: 'Đã hủy'
}

export const CleaningTaskManagement = () => {
    const dispatch = useAppDispatch()
    const {
        items: bookings,
        pagination: bookingsPagination,
        isLoading: isBookingsLoading,
    } = useAppSelector((state) => state.bookings)
    const {
        tasks,
        isTasksLoading,
        detailData,
        detailLoading
    } = useAppSelector((state) => state.managerCleaningTasks)

    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20

    const fetchBookingsData = async (page = currentPage) => {
        try {
            await dispatch(fetchBookings({ page, limit: itemsPerPage })).unwrap()
        } catch (error: unknown) {
            toast.error(error as string)
        }
    }

    const fetchTasks = async () => {
        if (!selectedBookingId) return
        try {
            await dispatch(fetchManagerCleaningTasks({
                booking_id: selectedBookingId,
                // status: statusFilter === 'all' ? undefined : (statusFilter as any),
                // request_source: sourceFilter === 'all' ? undefined : (sourceFilter as any),
                // due_from: dueFrom || undefined,
                // due_to: dueTo || undefined
            })).unwrap()
        } catch (error: unknown) {
            toast.error(error as string)
        }
    }

    // Fetch when `currentPage` changes (includes initial mount)
    useEffect(() => {
        fetchBookingsData(currentPage)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage])

    // Sync current page from server pagination when it changes
    useEffect(() => {
        if (bookingsPagination?.current_page && bookingsPagination.current_page !== currentPage) {
            setCurrentPage(bookingsPagination.current_page)
        }
        // only run when server pagination updates
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingsPagination?.current_page])

    useEffect(() => {
        if (selectedBookingId) {
            fetchTasks()
        } else {
            dispatch(clearManagerCleaningTasks())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBookingId])

    const totalPages = Math.max(1, bookingsPagination?.total_pages ?? 1)
    const totalItems = bookingsPagination?.total_items ?? bookings.length
    const pageSize = bookingsPagination?.items_per_page ?? itemsPerPage
    const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const pageEnd = Math.min(currentPage * pageSize, totalItems)

    const openTaskDetail = async (taskId: string) => {
        try {
            setDetailOpen(true)
            await dispatch(fetchManagerCleaningTaskDetail(taskId)).unwrap()
        } catch (error: unknown) {
            toast.error(error as string)
        }
    }

    const handleCloseDetail = (open: boolean) => {
        if (!open) {
            setDetailOpen(false)
            dispatch(clearManagerCleaningTaskDetail())
        }
    }


    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-slate-800">Danh Sách Lịch Đặt(Booking)</h1>
                <p className="text-sm text-slate-500">
                    Quản lý nhiệm vụ vệ sinh theo từng booking.
                </p>
            </div>

            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b bg-slate-50/50 py-4 px-6">
                    <div>
                        <CardTitle className="text-md font-bold text-slate-700 uppercase tracking-tight">Lịch đặt chỗ</CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={bookingSearch}
                                onChange={(event) => setBookingSearch(event.target.value)}
                                placeholder="Tìm kiếm booking..."
                                className="pl-9 h-9 w-64 border-slate-200"
                            />
                        </div> */}
                        <Button variant="outline" size="sm" onClick={() => fetchBookingsData(1)} disabled={isBookingsLoading} className="h-9">
                            <RefreshCw className={`mr-2 h-4 w-4 ${isBookingsLoading ? 'animate-spin' : ''}`} />
                            Tải lại
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                            <TableRow>
                                <TableHead className="px-6 py-3">Mã Booking</TableHead>
                                <TableHead className="px-6 py-3">Pod</TableHead>
                                <TableHead className="px-6 py-3 text-center">Trạng thái</TableHead>
                                <TableHead className="px-6 py-3">Bắt đầu</TableHead>
                                <TableHead className="px-6 py-3">Kết thúc</TableHead>
                                <TableHead className="px-6 py-3 text-right">Hình ảnh</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isBookingsLoading ? (
                                Array.from({ length: 4 }).map((_, index) => (
                                    <TableRow key={`booking-skeleton-${index}`} className="animate-pulse">
                                        <TableCell colSpan={6} className="px-6 py-4">
                                            <div className="h-4 w-full rounded bg-slate-200" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : bookings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        Không tìm thấy booking nào
                                    </TableCell>
                                </TableRow>
                            ) : (
                                bookings.map((booking) => {
                                    const isSelected = booking.id === selectedBookingId
                                    const statusLabel = bookingStatusLabel[booking.status] ?? booking.status
                                    const statusClass = booking.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        booking.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                                            booking.status === 'IN_USE' ? 'bg-blue-100 text-blue-700 tracking-tight italic' :
                                                'bg-slate-100 text-slate-500'

                                    return (
                                        <Fragment key={booking.id}>
                                            <TableRow className={isSelected ? 'bg-indigo-50/30 border-b border-indigo-100' : 'border-b border-slate-100'}>
                                                <TableCell className="px-6 py-4 font-mono font-semibold text-indigo-600">#{booking.id}</TableCell>
                                                <TableCell className="px-6 py-4 font-medium">
                                                    {booking.pod?.name || booking.pod?.code || booking.pod_id || '—'}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase ${statusClass}`}>
                                                        {statusLabel}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-slate-500 text-xs">{formatDateTime(booking.start_time)}</TableCell>
                                                <TableCell className="px-6 py-4 text-slate-500 text-xs">{formatDateTime(booking.end_time)}</TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant={isSelected ? 'default' : 'ghost'}
                                                        className={isSelected ? 'bg-indigo-600' : 'text-slate-400 hover:text-slate-600 font-medium uppercase text-[10px]'}
                                                        onClick={() => {
                                                            setSelectedBookingId(isSelected ? null : booking.id)
                                                        }}
                                                    >
                                                        {isSelected ? (
                                                            <>Đóng Task</>
                                                        ) : (
                                                            <>Chi tiết</>
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>

                                            {/* Expanded Row for Tasks */}
                                            {isSelected && (
                                                <TableRow className="bg-white">
                                                    <TableCell colSpan={6} className="px-12 py-4 border-b border-slate-200">
                                                        <div className="border-l-4 border-indigo-500 pl-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">
                                                                    Các tác vụ Cleaning cho  #{booking.id}
                                                                </h4>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={fetchTasks}
                                                                    disabled={isTasksLoading}
                                                                    className="h-8 px-2 text-indigo-600 text-[10px] uppercase font-bold"
                                                                >
                                                                    <RefreshCw className={`mr-1 h-3 w-3 ${isTasksLoading ? 'animate-spin' : ''}`} />
                                                                    Làm mới
                                                                </Button>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {isTasksLoading ? (
                                                                    Array.from({ length: 3 }).map((_, idx) => (
                                                                        <div key={`task-sk-${idx}`} className="h-16 bg-slate-50 animate-pulse rounded border border-slate-100" />
                                                                    ))
                                                                ) : tasks.length === 0 ? (
                                                                    <div className="col-span-3 py-4 text-center text-slate-400 italic text-xs">
                                                                        Không có nhiệm vụ vệ sinh nào
                                                                    </div>
                                                                ) : (
                                                                    tasks.map((task) => (
                                                                        <div
                                                                            key={task.id}
                                                                            className={cn(
                                                                                "flex items-center gap-3 p-3 border rounded transition-all",
                                                                                task.status === 'DONE' ? "border-slate-100 bg-slate-50/50" :
                                                                                    task.status === 'IN_PROGRESS' ? "border-indigo-200 bg-white ring-1 ring-indigo-100 shadow-sm" :
                                                                                        "border-slate-100 bg-slate-50/50 opacity-100"
                                                                            )}
                                                                        >
                                                                            <div className={cn(
                                                                                "w-2 h-2 rounded-full",
                                                                                task.status === 'DONE' ? "bg-green-500" :
                                                                                    task.status === 'IN_PROGRESS' ? "bg-blue-500 animate-pulse" :
                                                                                        "bg-slate-300"
                                                                            )}></div>
                                                                            <div className="flex-1">
                                                                                <div className={cn(
                                                                                    "text-xs font-bold",
                                                                                    task.status === 'ASSIGNED' ? "text-slate-400 uppercase" : "text-indigo-600 font-mono"
                                                                                )}>
                                                                                    {task.id}
                                                                                </div>
                                                                                <div className="text-[10px] text-slate-500">Hạn: {formatDateTime(task.due_at)}</div>
                                                                            </div>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => openTaskDetail(task.id)}
                                                                                className="h-6 px-1 text-[9px] font-bold text-indigo-600 uppercase"
                                                                            >
                                                                                Xem
                                                                            </Button>
                                                                            <span className={cn(
                                                                                "text-[9px] font-bold uppercase",
                                                                                task.status === 'DONE' ? "text-green-600" :
                                                                                    task.status === 'IN_PROGRESS' ? "text-blue-600" :
                                                                                        "text-slate-400"
                                                                            )}>
                                                                                {task.status === 'DONE' ? 'XONG' :
                                                                                    task.status === 'IN_PROGRESS' ? 'ĐANG LÀM' : 'Chờ'}
                                                                            </span>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
                            <div className="text-xs text-slate-500">
                                Hiển thị <span className="font-semibold text-slate-700">{pageStart}</span> đến <span className="font-semibold text-slate-700">{pageEnd}</span> trong <span className="font-semibold text-slate-700">{totalItems}</span> booking
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || isBookingsLoading}
                                    className="h-8 px-3 text-xs"
                                >
                                    Trước
                                </Button>
                                <div className="flex items-center justify-center min-w-[2rem] text-xs font-medium text-slate-700">
                                    {currentPage} / {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || isBookingsLoading}
                                    className="h-8 px-3 text-xs"
                                >
                                    Sau
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={detailOpen} onOpenChange={handleCloseDetail}>
                <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0 border-none shadow-2xl rounded-xl">
                    <DialogHeader className="bg-slate-900 text-white p-6 rounded-t-xl">
                        <DialogTitle className="text-lg font-bold uppercase tracking-tight italic">Chi tiết nhiệm vụ vệ sinh</DialogTitle>
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="flex h-56 items-center justify-center text-slate-400 bg-white">
                            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                        </div>
                    ) : !detailData ? (
                        <div className="py-12 text-center text-slate-400 bg-white">Không có dữ liệu chi tiết</div>
                    ) : (
                        <div className="bg-white p-6 space-y-8 overflow-y-auto max-h-[calc(85vh-80px)]">
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                                {[
                                    { label: 'Mã Nhiệm vụ', value: detailData.task.id, mono: true },
                                    { label: 'Trạng thái', value: detailData.task.status, highlight: true },
                                    { label: 'Pod', value: detailData.task.pod_name ?? detailData.task.pod_id },
                                    { label: 'Địa điểm', value: detailData.task.location_name ?? '—' },
                                    { label: 'Dự kiến', value: formatDateTime(detailData.task.estimated_start_time) },
                                    { label: 'Hạn chót', value: formatDateTime(detailData.task.due_at) },
                                    { label: 'Bắt đầu', value: formatDateTime(detailData.task.actual_start_time) },
                                    { label: 'Kết thúc', value: formatDateTime(detailData.task.actual_end_time) },
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded">
                                        <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">{item.label}</p>
                                        <p className={cn(
                                            "text-xs font-semibold",
                                            item.mono ? "font-mono text-indigo-600" : "text-slate-800",
                                            item.highlight && "text-blue-600 italic"
                                        )}>{item.value || '—'}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest border-b pb-1">Ảnh trước khi dọn dẹp</h3>
                                    {detailData.media.before.length === 0 ? (
                                        <div className="bg-slate-50 border border-dashed text-slate-400 py-8 rounded text-center text-xs">Không có dữ liệu ảnh trước</div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {detailData.media.before.map((item) => (
                                                <div key={item.id} className="aspect-square rounded overflow-hidden border border-slate-200">
                                                    <img src={item.media.url} alt="Before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest border-b pb-1">Ảnh sau khi hoàn tất</h3>
                                    {detailData.media.after.length === 0 ? (
                                        <div className="bg-slate-50 border border-dashed text-slate-400 py-8 rounded text-center text-xs">Khôngh có dữ liệu ảnh sau</div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {detailData.media.after.map((item) => (
                                                <div key={item.id} className="aspect-square rounded overflow-hidden border border-slate-200">
                                                    <img src={item.media.url} alt="After" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )

}





