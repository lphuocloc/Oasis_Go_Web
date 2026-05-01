import React, { useEffect, useState } from 'react'
import { LogIn, Clock, Shield, RefreshCw, LogOut, User, AlertTriangle } from 'lucide-react'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { staffAttendanceLogApi } from '../../api/lib/staffAttendanceLogApi'
import { useAuth } from '../../contexts/AuthContext'

interface CheckinStatus {
  checked_in_today: boolean
  checked_out_today: boolean
  can_checkin: boolean
  latest_checkin_at: string | null
}

interface ManagerCheckinGateProps {
  children: React.ReactNode
}

export const ManagerCheckinGate: React.FC<ManagerCheckinGateProps> = ({ children }) => {
  const [status, setStatus] = useState<CheckinStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActing, setIsActing] = useState(false)
  const [noRoster, setNoRoster] = useState<boolean | null>(null)
  const [checkinError, setCheckinError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const fetchStatus = async (bustCache = true) => {
    try {
      const res = await staffAttendanceLogApi.getTodayStatus(bustCache)
      setStatus(res.data)
      setNoRoster(false)
    } catch (err: any) {
      // If 404 = no active roster (no shift assigned), let them through
      if (err?.response?.status === 404 || err?.response?.status === 403) {
        setNoRoster(true)
      } else {
        setStatus(null)
        setNoRoster(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchStatus(true) }, [])

  const handleCheckin = async () => {
    setIsActing(true)
    setCheckinError(null)
    try {
      await staffAttendanceLogApi.checkin()
      toast.success('✅ Check-in thành công! Chào mừng bạn vào ca trực.')
      await fetchStatus(true)
      navigate('/manager')
    } catch (e: any) {
      const status = e?.response?.status
      const serverMsg = e?.response?.data?.message

      let userMsg: string
      if (status === 404) {
        userMsg = 'Không tìm thấy ca làm việc cho hôm nay. Hãy liên hệ Admin để được phân ca, hoặc kiểm tra lại tài khoản đang đăng nhập.'
      } else if (status === 403) {
        userMsg = 'Bạn không có quyền check-in. Vui lòng đăng nhập đúng tài khoản Manager.'
      } else if (status === 400) {
        userMsg = serverMsg || 'Bạn đã check-in hôm nay rồi.'
      } else {
        userMsg = serverMsg || 'Check-in thất bại. Vui lòng thử lại.'
      }

      setCheckinError(userMsg)
      toast.error(userMsg)
    } finally {
      setIsActing(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-sm text-slate-300">Đang kiểm tra trạng thái ca trực...</p>
        </div>
      </div>
    )
  }

  // Practical Business Logic:
  // 1. If user is CURRENTLY working (checked in but not checked out), let them through to finish their work
  if (status?.checked_in_today && !status?.checked_out_today) {
    return <>{children}</>
  }

  // 2. If it's NOT the user's shift time (cannot check-in), let them through to see dashboard/info
  if (status && !status.can_checkin) {
    return <>{children}</>
  }

  // 3. If there's NO roster assigned, let them through
  if (noRoster) {
    return <>{children}</>
  }

  // ONLY show the gate if they HAVE a shift right now (can_checkin is true) AND they haven't checked in yet
  return (
    <>
      {/* Blurred background content */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(4px)', opacity: 0.3 }}>
        {children}
      </div>

      {/* Full-screen blocking overlay */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
        <div className="w-full max-w-md mx-4">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-center relative">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Xác Nhận Ca Trực</h1>
              <p className="text-blue-100 text-sm mt-1">Vui lòng check-in để bắt đầu làm việc</p>
            </div>

            {/* Body */}
            <div className="px-8 py-7 space-y-4">
              {/* Logged-in user info */}
              {user && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                  <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-blue-500 uppercase tracking-wide">Đang đăng nhập</div>
                    <div className="text-sm font-bold text-blue-900 truncate">{user.name}</div>
                    <div className="text-xs text-blue-400 truncate">{user.email}</div>
                  </div>
                </div>
              )}

              {/* Time display */}
              <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Thời gian hiện tại</div>
                  <div className="text-lg font-bold text-gray-900">{dayjs().format('HH:mm - DD/MM/YYYY')}</div>
                </div>
              </div>

              {/* Error message if checkin failed */}
              {checkinError ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700 mb-1">Không thể check-in</p>
                    <p className="text-xs text-red-600">{checkinError}</p>
                    <p className="text-xs text-red-400 mt-2">
                      Nếu bạn đăng nhập nhầm tài khoản, hãy nhấn <strong>"Đăng xuất"</strong> để thử lại.
                    </p>
                  </div>
                </div>
              ) : (
                /* Default warning */
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-sm text-amber-800 font-medium">
                    ⚠️ Bạn chưa check-in cho hôm nay. Hệ thống yêu cầu check-in trước khi bắt đầu ca trực để xác nhận sự hiện diện.
                  </p>
                </div>
              )}

              {/* Checkin button */}
              <button
                onClick={handleCheckin}
                disabled={isActing}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-base rounded-2xl shadow-lg shadow-green-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isActing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {isActing ? 'Đang xử lý...' : 'Check-in Bắt Đầu Ca'}
              </button>

              {/* Logout button (secondary) */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50 font-semibold text-sm rounded-2xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất &amp; Đổi tài khoản
              </button>

              <p className="text-center text-xs text-gray-400">
                Check-in của bạn sẽ được ghi lại và giám sát bởi hệ thống.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
