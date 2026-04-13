import React, { useState, useRef, useEffect } from 'react';
import { Bell, AlertTriangle, Info, MessageSquare, CheckCircle, X } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import type { NotificationPayload } from '../../api/notificationApi';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const NotificationDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { notifications, unreadCount, markAsRead, markAllAsRead, loadMore, pagination, loading } = useNotifications();
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'SUPPORT': return <MessageSquare size={16} className="text-blue-500" />;
            case 'INCIDENT': return <AlertTriangle size={16} className="text-orange-500" />;
            case 'SYSTEM': return <Info size={16} className="text-indigo-500" />;
            default: return <Bell size={16} className="text-slate-500" />;
        }
    };

    const handleNotificationClick = async (noti: NotificationPayload) => {
        if (!noti.is_read) {
            await markAsRead(noti.id);
        }
        setIsOpen(false);
        // Navigate conditionally based on type
        if (noti.type === 'SUPPORT' && noti.data?.support_request_id) {
            navigate(`/manager/support`); // Could go to specific or just list
        } else if (noti.type === 'INCIDENT') {
            navigate('/manager/incidents');
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50 && !loading && pagination.page < pagination.pages) {
            loadMore();
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-200"
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[1.25rem] h-5 px-1 bg-rose-500 border-2 border-white rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 transform origin-top-right transition-all">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div 
                        className="max-h-[28rem] overflow-y-auto overscroll-contain"
                        onScroll={handleScroll}
                    >
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                    <CheckCircle className="text-slate-400" size={24} />
                                </div>
                                <p className="text-sm font-medium text-slate-600">All caught up!</p>
                                <p className="text-xs text-slate-400 mt-1">Check back later for new notifications.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((noti) => (
                                    <div
                                        key={noti.id}
                                        onClick={() => handleNotificationClick(noti)}
                                        className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 ${!noti.is_read ? 'bg-indigo-50/30' : ''}`}
                                    >
                                        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!noti.is_read ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'bg-slate-100'}`}>
                                            {getIcon(noti.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className={`text-sm tracking-tight truncate ${!noti.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                    {noti.title}
                                                </p>
                                                {!noti.is_read && (
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5 ml-2"></span>
                                                )}
                                            </div>
                                            <p className={`text-xs line-clamp-2 ${!noti.is_read ? 'text-slate-600' : 'text-slate-500'}`}>
                                                {noti.message}
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                                                {dayjs(noti.createdAt).fromNow()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="p-4 text-center">
                                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
