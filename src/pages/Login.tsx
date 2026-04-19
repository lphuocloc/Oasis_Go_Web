import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ChevronRight, Lock, Mail, Shield, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const email = formData.get('email') as string
      const password = formData.get('password') as string

      await login(email, password)
      toast.success('Đăng nhập thành công!')

      // The navigation will happen automatically via ProtectedRoute redirect
      navigate('/')
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Đăng nhập thất bại!'

      toast.error(message)
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full overflow-hidden bg-slate-50">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-indigo-950 lg:flex lg:items-center lg:justify-center">
          <div className="absolute inset-0">
            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />
            <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl" />
          </div>

          <div className="relative z-10 mx-auto max-w-xl p-12 text-white">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-100">
              <Sparkles className="h-3.5 w-3.5" />
              Hệ thống quản trị Oasis Go
            </div>

            <h1 className="mb-5 text-5xl font-bold leading-tight">
              Nâng tầm trải nghiệm nghỉ ngơi với hệ thống Pod ngủ thông minh
            </h1>
            <p className="mb-10 text-base leading-relaxed text-indigo-100/80">
              Theo dõi hoạt động theo thời gian thực, xử lý sự cố ngay lập tức và tối ưu hóa hiệu quả của từng pod.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-indigo-200/70">Oasis Sleep Pod</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-indigo-50/95">
                  Pod cách âm, thoáng khí, tối ưu cho giấc ngủ ngắn, chất lượng cao.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-indigo-200/70">Tinh hoa nghỉ ngơi hiện đại</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-indigo-50/95">
                  Từ việc đặt chổ đến vận hành, mỗi trải nghiệm đều được cá nhân hóa và nhất quán.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-16">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 lg:mx-0">
                <Shield className="h-7 w-7" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900">Chào mừng bạn quay lại!</h2>
              <p className="mt-2 text-sm text-slate-500">Đăng nhập để tiếp tục sử dụng Oasis Go.</p>
            </div>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl">Đăng nhập</CardTitle>
                <CardDescription>Vui lòng nhập thông tin tài khoản của bạn.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        name="email"
                        placeholder="admin@oasisgo.com"
                        required
                        disabled={isLoading}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        name="password"
                        placeholder="........"
                        required
                        disabled={isLoading}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="h-11 w-full bg-indigo-950 text-white hover:bg-indigo-900">
                    {isLoading ? 'Đang đăng nhập...' : 'Xác thực và đăng nhập'}
                    {!isLoading && <ChevronRight className="h-4 w-4" />}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-slate-400 lg:text-left">Hệ thống quản trị Oasis Go</p>
          </div>
        </div>
      </div>
    </div>
  )
}
