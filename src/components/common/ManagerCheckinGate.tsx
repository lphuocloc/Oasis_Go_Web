import React, { useEffect, useState } from 'react'
import { LogIn, Clock, Shield, RefreshCw } from 'lucide-react'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { staffAttendanceLogApi } from '../../api/lib/staffAttendanceLogApi'

interface CheckinStatus {
  checked_in_today: boolean
  checked_out_today: boolean
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
  const navigate = useNavigate()

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
    try {
      await staffAttendanceLogApi.checkin()
      toast.success('✅ Check-in thành công! Chào mừng bạn vào ca trực.')
      // Force fresh fetch with cache buster after checkin
      await fetchStatus(true)
      // Redirect to dashboard after check-in
      navigate('/manager')
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Check-in thất bại'
      toast.error(msg)
    } finally {
      setIsActing(false)
    }
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

  // No roster assigned = let them through (manager may not have shift yet)
  if (noRoster) {
    return <>{children}</>
  }

  // Already checked in today = allow through
  if (status?.checked_in_today) {
    return <>{children}</>
  }

  // NOT checked in = show blocking gate
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
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Xác Nhận Ca Trực</h1>
              <p className="text-blue-100 text-sm mt-1">Vui lòng check-in để bắt đầu làm việc</p>
            </div>

            {/* Body */}
            <div className="px-8 py-7 space-y-5">
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

              {/* Status info */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm text-amber-800 font-medium">
                  ⚠️ Bạn chưa check-in cho hôm nay. Hệ thống yêu cầu check-in trước khi bắt đầu ca trực để xác nhận sự hiện diện.
                </p>
              </div>

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
