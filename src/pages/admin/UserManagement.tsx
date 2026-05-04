import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CreditCard, Eye, Fingerprint, Info, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import type { AdminUserDetail, AdminUserListItem } from '../../api/lib/adminUserApi'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
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
    clearAdminUserDetail,
    clearAdminUsersError,
    selectAdminUserDetail,
    selectAdminUserDetailLoading,
    selectAdminUsers,
    selectAdminUsersError,
    selectAdminUsersLoading
} from '../../store/slices/adminUsersSlice'
import { fetchAdminUserDetail, fetchAdminUsers } from '../../store/thunks/adminUsersThunks'

const formatDateTime = (value?: string | null) => {
    if (!value) return '—'
    return new Date(value).toLocaleString('vi-VN')
}

const statusBadgeClass = (isActive?: boolean) =>
    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'

const verifiedBadgeClass = (isVerified?: boolean) =>
    isVerified ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'

const getUserId = (user: AdminUserListItem) => user.id ?? user._id ?? ''

const TableRowSkeleton = ({ columns = 7 }: { columns?: number }) => (
    <TableRow className="animate-pulse">
        {Array.from({ length: columns }).map((_, index) => (
            <TableCell key={index} className="px-6 py-4">
                <div className="h-4 w-full max-w-[12rem] rounded bg-slate-200" />
            </TableCell>
        ))}
    </TableRow>
)

const VietnameseCCCDCard = ({ data }: { data?: AdminUserDetail['cccd'] | null }) => {
    if (!data) return null

    return (
        <div className="relative mx-auto mt-4 h-[340px] w-full max-w-[540px] overflow-hidden rounded-[24px] border border-slate-300 bg-white p-1 text-slate-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#e0f2f7] via-[#f0f9ff] to-[#e0f7fa]"></div>
            <div
                className="absolute inset-0 opacity-15"
                style={{
                    backgroundImage: 'radial-gradient(#0c4a6e 0.5px, transparent 0.5px)',
                    backgroundSize: '8px 8px'
                }}
            ></div>
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(45deg, #0c4a6e, #0c4a6e 1px, transparent 1px, transparent 6px)'
                }}
            ></div>

            <div className="relative flex h-full w-full flex-col rounded-[22px] border border-white/60 p-6">
                <div className="flex items-start justify-between">
                    <div className="flex w-24 flex-col items-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#ff0] bg-[#da251d] shadow-md">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-yellow-200/50">
                                <div
                                    className="h-5 w-5 rotate-45 bg-[#ff0]"
                                    style={{
                                        clipPath:
                                            'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 pr-4 text-center">
                        <p className="text-[13px] font-black uppercase leading-tight tracking-tighter text-[#cf1e1e]">
                            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold tracking-tight text-[#cf1e1e]">Độc lập - Tự do - Hạnh phúc</p>
                        <div className="mx-auto mt-1 h-[1.5px] w-32 bg-[#cf1e1e] opacity-60"></div>
                        <p className="mt-2 text-[19px] font-extrabold uppercase tracking-wide text-[#1a3a8a]">CĂN CƯỚC CÔNG DÂN</p>
                        <p className="-mt-1 text-[11px] font-black uppercase italic text-[#1a3a8a] opacity-80">
                            Citizen Identity Card
                        </p>
                    </div>
                    <div className="flex w-24 justify-end">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-lg border border-blue-200/50 bg-white/40 shadow-inner backdrop-blur-sm">
                            <div className="absolute inset-1 flex items-center justify-center rounded bg-slate-100 opacity-40">
                                <span className="text-[8px] font-black italic">QR</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="relative h-44 w-32 overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-200 shadow-md">
                            <div className="absolute inset-0 flex flex-col items-center justify-end bg-[#cedae6]">
                                <div className="h-32 w-24 rounded-t-full bg-slate-400 opacity-60"></div>
                            </div>
                            <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay"></div>
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-1 rounded bg-[#fbbf2430] py-0.5">
                            <Fingerprint className="h-3 w-3 text-amber-700" />
                            <span className="text-[8px] font-black italic text-amber-800">CHÍP ĐỊNH DANH</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-2 text-slate-800">
                        <div className="mb-3">
                            <p className="text-[10px] font-black uppercase italic text-blue-900 opacity-80">Số / No:</p>
                            <p className="text-[24px] font-black leading-none tracking-[0.05em] text-[#da251d]">{data.idNumber}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-y-2">
                            <div>
                                <span className="text-[10px] font-black uppercase text-blue-900 opacity-80">Họ và tên / Full name:</span>
                                <p className="mt-1 text-[17px] font-black uppercase leading-none text-blue-900">{data.fullName}</p>
                            </div>

                            <div className="flex gap-8">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-blue-900 opacity-80">Ngày sinh:</span>
                                    <p className="mt-0.5 text-[14px] font-bold leading-none text-slate-900">{data.dob}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase text-blue-900 opacity-80">Giới tính:</span>
                                    <p className="mt-0.5 text-[14px] font-bold leading-none text-slate-900">{data.gender}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase text-blue-900 opacity-80">Quốc tịch:</span>
                                    <p className="mt-0.5 text-[14px] font-bold leading-none text-slate-900">VIỆT NAM</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase text-blue-900 opacity-80">Quê quán / Place of origin:</span>
                                <p className="mt-0.5 text-[13px] font-bold leading-tight text-slate-800">{data.placeOfOrigin ?? '—'}</p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase text-blue-900 opacity-80">
                                    Nơi thường trú / Place of residence:
                                </span>
                                <p className="mt-0.5 line-clamp-1 text-[13px] font-bold leading-tight text-slate-800">{data.address}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-10 left-10 flex h-11 w-16 flex-col justify-between rounded-lg border border-[#a6740b] bg-gradient-to-br from-[#f8d052] via-[#e6b12a] to-[#c78f14] p-1 px-1.5 shadow-lg">
                    <div className="h-[1px] bg-black/10"></div>
                    <div className="flex flex-1 items-center justify-center">
                        <div className="mx-auto h-full w-[1px] bg-black/5"></div>
                        <div className="mx-auto h-full w-[1px] bg-black/5"></div>
                    </div>
                    <div className="h-[1px] bg-black/10"></div>
                </div>

                <div className="pointer-events-none absolute bottom-6 right-10 select-none text-[9px] font-black uppercase tracking-tighter text-blue-900/10">
                    CHÍNH PHỦ VIỆT NAM • MẪU BẢO MẬT THẺ CCCD
                </div>
            </div>
        </div>
    )
}

export const UserManagement: React.FC = () => {
    const dispatch = useAppDispatch()
    const users = useAppSelector(selectAdminUsers)
    const isLoading = useAppSelector(selectAdminUsersLoading)
    const error = useAppSelector(selectAdminUsersError)
    const userDetail = useAppSelector(selectAdminUserDetail)
    const detailLoading = useAppSelector(selectAdminUserDetailLoading)

    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all')
    const [roleFilter, setRoleFilter] = useState('all')
    const [detailId, setDetailId] = useState<string | null>(null)
    const [showIdentityCard, setShowIdentityCard] = useState(false)

    useEffect(() => {
        void dispatch(fetchAdminUsers())
    }, [dispatch])

    useEffect(() => {
        if (!error) return
        toast.error(error)
        dispatch(clearAdminUsersError())
    }, [dispatch, error])

    useEffect(() => {
        if (!detailId) {
            dispatch(clearAdminUserDetail())
            return
        }

        void dispatch(fetchAdminUserDetail(detailId))
    }, [detailId, dispatch])

    const roleOptions = useMemo(() => {
        const roles = new Set<string>()
        users.forEach((user) => {
            if (!user.role || user.role === 'admin') return
            roles.add(user.role)
        })
        return Array.from(roles)
    }, [users])

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase()

        return users.filter((user) => {
            if (user.role === 'admin') return false
            const matchesSearch =
                !query ||
                user.name?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query) ||
                user.phone?.toLowerCase().includes(query) ||
                getUserId(user).toLowerCase().includes(query)

            const matchesActive =
                activeFilter === 'all' ||
                (activeFilter === 'active' ? user.isActive !== false : user.isActive === false)

            const matchesVerified =
                verifiedFilter === 'all' ||
                (verifiedFilter === 'verified' ? user.isVerified === true : user.isVerified !== true)

            const matchesRole = roleFilter === 'all' || user.role === roleFilter

            return matchesSearch && matchesActive && matchesVerified && matchesRole
        })
    }, [activeFilter, roleFilter, search, users, verifiedFilter])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-gray-900">Quản lý người dùng</h1>
                <p className="text-[1.03rem] leading-6 text-slate-500">
                    Theo dõi danh sách tài khoản người dùng, trạng thái và thông tin xác minh.
                </p>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-lg">Bộ lọc người dùng</CardTitle>
                        <p className="mt-1 text-sm text-slate-500">Tìm theo tên, email, số điện thoại hoặc ID.</p>
                    </div>
                    <Button variant="outline" onClick={() => dispatch(fetchAdminUsers())} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Tải lại
                    </Button>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-4">
                    <div className="lg:col-span-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Tìm theo tên, email, số điện thoại..."
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div>
                        <Select value={activeFilter} onValueChange={(value) => setActiveFilter(value as typeof activeFilter)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                <SelectItem value="active">Đang hoạt động</SelectItem>
                                <SelectItem value="inactive">Tạm khóa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Select value={verifiedFilter} onValueChange={(value) => setVerifiedFilter(value as typeof verifiedFilter)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Xác minh" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả xác minh</SelectItem>
                                <SelectItem value="verified">Đã xác minh</SelectItem>
                                <SelectItem value="unverified">Chưa xác minh</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="lg:col-span-2">
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Vai trò" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả vai trò</SelectItem>
                                {roleOptions.map((role) => (
                                    <SelectItem key={role} value={role}>
                                        {role}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Danh sách người dùng</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="px-6">Người dùng</TableHead>
                                <TableHead>Vai trò</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead>Xác minh</TableHead>
                                <TableHead>Nhà cung cấp</TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <TableRowSkeleton key={`skeleton-${index}`} />
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="px-6 py-10 text-center text-slate-400">
                                        Không tìm thấy người dùng phù hợp
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={getUserId(user)}>
                                        <TableCell className="px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                                                    {user.name?.charAt(0) ?? 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{user.name ?? '—'}</div>
                                                    <div className="text-xs text-slate-400">{user.email ?? '—'}</div>
                                                    <div className="text-xs text-slate-400">ID: {getUserId(user) || '—'}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.role ?? '—'}</TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                                                    user.isActive
                                                )}`}
                                            >
                                                {user.isActive ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                ) : (
                                                    <XCircle className="h-3.5 w-3.5" />
                                                )}
                                                {user.isActive ? 'Hoạt động' : 'Tạm khóa'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${verifiedBadgeClass(
                                                    user.isVerified
                                                )}`}
                                            >
                                                {user.isVerified ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                ) : (
                                                    <XCircle className="h-3.5 w-3.5" />
                                                )}
                                                {user.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-500">{user.authProvider ?? '—'}</TableCell>
                                        <TableCell className="text-sm text-slate-500">{formatDateTime(user.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setShowIdentityCard(false)
                                                    setDetailId(getUserId(user))
                                                }}
                                            >
                                                <Eye className="mr-1 h-4 w-4" />
                                                Chi tiết
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog
                open={!!detailId}
                onOpenChange={(open) => {
                    if (!open) {
                        setDetailId(null)
                        setShowIdentityCard(false)
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] w-[min(92vw,54rem)] max-w-4xl overflow-y-auto p-0">
                    <DialogHeader className="flex h-14 flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6">
                        <DialogTitle className="text-lg font-bold text-slate-900">Hồ sơ người dùng</DialogTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setDetailId(null)
                                setShowIdentityCard(false)
                            }}
                        >
                        </Button>
                    </DialogHeader>

                    <div className="p-6 md:p-8">
                        {detailLoading ? (
                            <div className="flex h-64 flex-col items-center justify-center gap-4 text-slate-400">
                                <RefreshCw className="h-8 w-8 animate-spin" />
                                <p className="animate-pulse font-medium">Đang tải dữ liệu hồ sơ...</p>
                            </div>
                        ) : (
                            <div className="grid gap-8 lg:grid-cols-12">
                                <div className="space-y-6 lg:col-span-5">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-900 text-3xl font-black text-white shadow-xl ring-4 ring-slate-100">
                                            {userDetail?.name?.charAt(0) ?? 'U'}
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900">{userDetail?.name ?? '—'}</h2>
                                        <p className="text-slate-500">{userDetail?.email ?? '—'}</p>
                                        <div className="mt-3 flex gap-2">
                                            <span
                                                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusBadgeClass(
                                                    userDetail?.isActive
                                                )}`}
                                            >
                                                {userDetail?.isActive ? 'Hoạt động' : 'Tạm khóa'}
                                            </span>
                                            <span
                                                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${verifiedBadgeClass(
                                                    userDetail?.isVerified
                                                )}`}
                                            >
                                                {userDetail?.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-6">
                                        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                                            <Info className="h-3 w-3" /> Chi tiết liên hệ
                                        </h3>
                                        <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-slate-500">Số điện thoại</span>
                                                <span className="text-sm font-bold text-slate-900">{userDetail?.phone ?? '—'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-slate-500">Vai trò</span>
                                                <span className="text-sm font-bold text-slate-900 capitalize">{userDetail?.role ?? '—'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-slate-500">Ngày tạo</span>
                                                <span className="text-sm font-bold text-slate-900">{formatDateTime(userDetail?.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-slate-500">Nhà cung cấp</span>
                                                <span className="text-sm font-bold text-slate-900">{userDetail?.authProvider ?? '—'}</span>
                                            </div>
                                        </div>

                                        <h3 className="flex items-center gap-2 pt-4 text-sm font-black uppercase tracking-widest text-slate-400">
                                            <CreditCard className="h-3 w-3" /> Thanh toán
                                        </h3>
                                        <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-slate-500">Ngân hàng</span>
                                                <span className="text-sm font-bold text-slate-900">{userDetail?.bank_name ?? '—'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-slate-500">Số tài khoản</span>
                                                <span className="text-sm font-bold text-slate-900">{userDetail?.bank_account_number ?? '—'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 lg:col-span-7">
                                    <div className="flex items-center justify-between">
                                        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                                            <ShieldCheck className="h-3.5 w-3.5" /> Xác minh danh tính
                                        </h3>
                                        <Button
                                            variant={showIdentityCard ? 'outline' : 'default'}
                                            size="sm"
                                            onClick={() => setShowIdentityCard((prev) => !prev)}
                                            className="h-8 text-[11px] font-black uppercase tracking-wider"
                                        >
                                            {showIdentityCard ? 'Ẩn hồ sơ CCCD' : 'Xem hồ sơ CCCD'}
                                        </Button>
                                    </div>

                                    {showIdentityCard ? (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg">
                                                    <ShieldCheck className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black uppercase tracking-wider text-blue-600">Trạng thái CCCD</div>
                                                    <div className="text-sm font-bold text-slate-900">
                                                        {userDetail?.identityCardStatus ?? 'Đang chờ duyệt'}
                                                    </div>
                                                </div>
                                            </div>

                                            <VietnameseCCCDCard data={userDetail?.cccd} />

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div className="rounded-xl border border-slate-100 p-4">
                                                    <div className="mb-1 text-[10px] font-black uppercase tracking-tighter text-slate-400">Xác minh lúc</div>
                                                    <div className="text-sm font-bold text-slate-700">
                                                        {formatDateTime(userDetail?.identityCardVerifiedAt)}
                                                    </div>
                                                </div>
                                                <div className="rounded-xl border border-slate-100 p-4">
                                                    <div className="mb-1 text-[10px] font-black uppercase tracking-tighter text-slate-400">Ly do tu choi</div>
                                                    <div className="text-sm font-bold text-slate-700">
                                                        {userDetail?.identityCardRejectReason ?? '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex h-80 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/30 p-8 text-center">
                                            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-8 ring-slate-100">
                                                <CreditCard className="h-8 w-8 text-slate-300" />
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-900">Hồ sơ CCCD chưa mở</h4>
                                            <p className="mt-1 max-w-[240px] text-sm text-slate-500">
                                                Nhấn nút bên trên để xem chi tiết thẻ định danh của người dùng.
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="mt-6 font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                onClick={() => setShowIdentityCard(true)}
                                            >
                                                Mở xem ngay
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
