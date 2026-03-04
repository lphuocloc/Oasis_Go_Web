import React from 'react'
import { authApi } from '../api/lib/authApi'
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export const Login = () => {

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const res = await authApi.login({ email, password })
    console.log(res)
    if (res.success) {
      localStorage.setItem('access_token', res.data.accessToken)
      toast.success(res.message)
      navigate('/admin')
    } else {
      toast.error(res.error.message)
    }
  }
  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" name="email" />
        <input type="password" placeholder="Password" name="password" />
        <button type="submit">Login</button>
      </form>
    </div>
  )
}
