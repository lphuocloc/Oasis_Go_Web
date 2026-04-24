/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react'
import {
  Star,
  CheckCircle,
  XCircle,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  User,
  Layout,
  Clock,
  AlertCircle
} from 'lucide-react'
import { toast } from 'react-toastify'
import { reviewApi, type ReviewItem } from '../../api/lib/reviewApi'
import { Button } from '../../components/ui/button'

type TabType = 'active' | 'hidden'

export const ReviewManagement = () => {
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({ avgRating: 0, satisfactionRate: 0, totalReviews: 0 })
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 })
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [search, setSearch] = useState('')

  const fetchReviews = async () => {
    setIsLoading(true)
    try {
      const res = await reviewApi.getAdminReviews({
        page: pagination.page,
        limit: pagination.limit,
        status: activeTab
      })
      setReviews(res.data)
      setPagination((prev) => ({ ...prev, total: res.pagination.total, pages: res.pagination.pages }))
    } catch (error) {
      toast.error('Không thể tải dữ liệu đánh giá')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await reviewApi.getGlobalStats()
      if (res.success) {
        setStats(res.data)
      }
    } catch (error) {
      console.error('Fetch stats error:', error)
    }
  }

  useEffect(() => {
    fetchReviews()
    fetchStats()
  }, [activeTab, pagination.page, refreshTrigger])

  const handleRestore = async (id: string) => {
    try {
      await reviewApi.restore(id)
      toast.success('Đã hiển thị lại đánh giá!')
      setRefreshTrigger((p) => p + 1)
    } catch (error) {
      toast.error('Không thể hiển thị lại đánh giá')
    }
  }

  const handleHide = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn ẩn đánh giá này?')) return
    try {
      await reviewApi.reject(id)
      toast.success('Đã ẩn đánh giá!')
      setRefreshTrigger((p) => p + 1)
    } catch (error) {
      toast.error('Không thể ẩn đánh giá')
    }
  }

  const filteredReviews = useMemo(() => {
    if (!search.trim()) return reviews
    const s = search.toLowerCase()
    return reviews.filter(
      (r) =>
        r.comment?.toLowerCase().includes(s) ||
        r.user?.name?.toLowerCase().includes(s) ||
        r.cluster?.name?.toLowerCase().includes(s)
    )
  }, [reviews, search])

  const renderStars = (rating: number | null) => {
    if (rating === null) return <span className="text-gray-300">Chưa đánh giá</span>
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-4 h-4 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Kiểm Duyệt Đánh Giá
        </h1>
        <p className="text-gray-500 mt-1">Quản lý và kiểm soát nội dung đánh giá từ khách hàng.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-3/4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex gap-1">
            {[
              { id: 'active', label: 'Đang hiển thị', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { id: 'hidden', label: 'Đã ẩn', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType)
                  setPagination({ ...pagination, page: 1 })
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id
                    ? `${tab.bg} ${tab.color} shadow-sm`
                    : 'text-gray-500 hover:bg-gray-50'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo nội dung, tên khách hàng, cụm pod..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm transition-all"
            />
          </div>

          <div className="space-y-4">
            {isLoading ? (
              [1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-1/4 mb-4"></div>
                  <div className="h-10 bg-gray-50 rounded mb-4"></div>
                  <div className="h-4 bg-gray-100 rounded w-full"></div>
                </div>
              ))
            ) : filteredReviews.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500">Không có đánh giá nào trong danh sách này</p>
              </div>
            ) : (
              filteredReviews.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow group relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{r.user?.name || 'Khách hàng'}</div>
                            <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('vi-VN')}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          {renderStars(r.rating)}
                          <div className="text-xs text-indigo-600 font-medium mt-1 flex items-center gap-1">
                            <Layout className="w-3 h-3" />
                            {r.cluster?.name}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm italic border border-gray-100 relative">
                        <span className="text-3xl text-gray-200 absolute -top-2 -left-1 font-serif">"</span>
                        {r.comment || 'Không có nhận xét.'}
                      </div>
                    </div>

                    <div className="flex md:flex-col gap-2 justify-center md:border-l md:border-gray-50 md:pl-6 min-w-[140px]">
                      {activeTab === 'active' ? (
                        <Button
                          variant="outline"
                          onClick={() => handleHide(r.id)}
                          className="text-rose-600 border-rose-100 hover:bg-rose-50 flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Ẩn đánh giá
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleRestore(r.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Hiện lại
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pagination.pages }).map((_, i) => (
                <Button
                  key={i}
                  variant={pagination.page === i + 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: i + 1 })}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full lg:w-1/4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              Tổng quan thống kê
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="text-indigo-700 text-sm font-medium">Trung bình Rating</div>
                <div className="text-3xl font-bold text-indigo-900 mt-1 flex items-baseline gap-2">
                  {stats.avgRating.toFixed(1)}
                  <span className="text-xs font-normal text-indigo-600">/ 5.0</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="text-emerald-700 text-sm font-medium">Tỷ lệ hài lòng</div>
                <div className="text-3xl font-bold text-emerald-900 mt-1">{stats.satisfactionRate}%</div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="text-sm font-bold text-gray-900 mb-4">Gợi ý cho Admin:</div>
                <div className="flex items-start gap-2 p-3 bg-white border border-gray-100 rounded-xl text-xs text-gray-600 italic shadow-sm">
                  <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                  Đừng quên kiểm tra các đánh giá 1-2 sao để kịp thời xử lý sự cố tại chi nhánh.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
