import React from 'react'
import type { NavItem } from './Sidebar'
import Sidebar from './Sidebar'
import { LayoutGrid, MapPin, Home, Calendar, AlertCircle, Package, LifeBuoy, Clock, Sparkles } from 'lucide-react'

const ManagerSidebar: React.FC<{ userName?: string; userRole?: string }> = ({
  userName = 'Manager User',
  userRole = 'Manager'
}) => {
  const navItems: NavItem[] = [
    {
      label: 'Bảng điều khiển',
      path: '/manager',
      icon: <LayoutGrid className="w-6 h-6" />
    },
    {
      label: 'Cụm Pod',
      path: '/manager/clusters',
      icon: <MapPin className="w-6 h-6" />
    },
    {
      label: 'Pod',
      path: '/manager/pods',
      icon: <Home className="w-6 h-6" />
    },
    {
      label: 'Đặt chỗ',
      path: '/manager/bookings',
      icon: <Calendar className="w-6 h-6" />
    },
    {
      label: 'Giám sát Vệ sinh',
      path: '/manager/cleaning-tasks',
      icon: <Sparkles className="w-6 h-6" />
    },
    {
      label: 'Sự cố',
      path: '/manager/incidents',
      icon: <AlertCircle className="w-6 h-6" />
    },
    {
      label: 'Đồ thất lạc',
      path: '/manager/lost-found',
      icon: <Package className="w-6 h-6" />
    },
    {
      label: 'Hỗ trợ',
      path: '/manager/support',
      icon: <LifeBuoy className="w-6 h-6" />
    },
    {
      label: 'Ca làm',
      path: '/manager/shifts',
      icon: <Clock className="w-6 h-6" />
    }
  ]

  return <Sidebar navItems={navItems} userName={userName} userRole={userRole} profilePath="/manager/profile" />
}

export default ManagerSidebar
