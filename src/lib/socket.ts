import { io, Socket } from 'socket.io-client'
import config from '../config/config'

let userSocketInstance: Socket | null = null

export const initUserSocket = (): Socket | null => {
  if (userSocketInstance) {
    return userSocketInstance
  }

  const token = localStorage.getItem('token')
  if (!token) return null

  // Ensure url doesn't have /api at the end for socket
  const socketUrl = config.SOCKET_URL.replace(/\/api$/, '')

  userSocketInstance = io(socketUrl, {
    auth: { token },
  })

  userSocketInstance.on('connect', () => {
    console.log('[Socket] Connected to server for User notifications')
    userSocketInstance?.emit('user:subscribe')
  })

  userSocketInstance.on('disconnect', () => {
    console.log('[Socket] Disconnected from server')
  })

  userSocketInstance.on('socket:error', (error) => {
    console.error('[Socket] Error:', error)
  })

  return userSocketInstance
}

export const disconnectUserSocket = () => {
  if (userSocketInstance) {
    userSocketInstance.disconnect()
    userSocketInstance = null
  }
}

export const getUserSocket = () => userSocketInstance
