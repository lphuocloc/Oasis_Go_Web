import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bell, CheckCircle2, Info, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useNotifications } from '../../hooks/useNotifications'
import type { NotificationPayload } from '../../api/notificationApi'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

dayjs.extend(relativeTime)

export const NotificationDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const { notifications, unreadCount, markAsRead, markAllAsRead, loadMore, pagination, loading, refresh } = useNotifications()
    const navigate = useNavigate()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (isOpen) {
            refresh()
        }
    }, [isOpen, refresh])

    const getIcon = (type: string) => {
        switch (type) {
            case 'SUPPORT':
                return <MessageSquare size={16} className="text-blue-600" />
            case 'INCIDENT':
                return <AlertTriangle size={16} className="text-amber-600" />
            case 'SYSTEM':
                return <Info size={16} className="text-violet-600" />
            default:
                return <Bell size={16} className="text-slate-500" />
        }
    }

    const handleNotificationClick = async (noti: NotificationPayload) => {
        if (!noti.is_read) {
            await markAsRead(noti.id)
        }

        setIsOpen(false)

        if (noti.type === 'SUPPORT' && noti.data?.support_request_id) {
            navigate('/manager/support')
        } else if (noti.type === 'INCIDENT') {
            navigate('/manager/incidents')
        }
    }

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget
        if (scrollHeight - scrollTop <= clientHeight + 50 && !loading && pagination.page < pagination.pages) {
            loadMore()
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label="Notifications"
                className="relative rounded-full"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl sm:w-[25rem]">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                            <p className="text-xs text-slate-500">{unreadCount} unread</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllAsRead()}
                            disabled={unreadCount === 0}
                        >
                            Mark all read
                        </Button>
                    </div>

                    <div className="max-h-[28rem] overflow-y-auto" onScroll={handleScroll}>
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center px-6 py-10 text-center">
                                <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
                                    <CheckCircle2 size={22} />
                                </div>
                                <p className="text-sm font-medium text-slate-700">All caught up</p>
                                <p className="mt-1 text-xs text-slate-500">You will see new notifications here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((noti) => (
                                    <button
                                        key={noti.id}
                                        type="button"
                                        onClick={() => handleNotificationClick(noti)}
                                        className={cn(
                                            'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50',
                                            !noti.is_read && 'bg-blue-50/50',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                                                !noti.is_read ? 'bg-white ring-1 ring-slate-200' : 'bg-slate-100',
                                            )}
                                        >
                                            {getIcon(noti.type)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex items-start justify-between gap-2">
                                                <p
                                                    className={cn(
                                                        'truncate text-sm',
                                                        !noti.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700',
                                                    )}
                                                >
                                                    {noti.title}
                                                </p>
                                                {!noti.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                                            </div>
                                            <p className="line-clamp-2 text-xs text-slate-600">{noti.message}</p>
                                            <p className="mt-1.5 text-[11px] font-medium text-slate-400">{dayjs(noti.createdAt).fromNow()}</p>
                                        </div>
                                    </button>
                                ))}
                                {loading && (
                                    <div className="p-4 text-center">
                                        <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
