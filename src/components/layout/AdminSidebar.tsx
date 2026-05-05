import React from 'react'
import type { NavItem } from './Sidebar'
import Sidebar from './Sidebar'
import { LayoutGrid, MapPin, Home, Calendar, DollarSign, Users, Star, Boxes, Warehouse, Wallet, Clock, Landmark, BadgePercent } from 'lucide-react'

const AdminSidebar: React.FC<{ userName?: string; userRole?: string }> = ({
  userName = 'Admin User',
  userRole = 'Administrator'
}) => {
  const navItems: NavItem[] = [
    {
      label: 'Bảng điều khiển',
      path: '/admin',
      icon: <LayoutGrid className="w-6 h-6" />
    },
    {
      label: 'Địa điểm  ',
      path: '/admin/locations',
      icon: <MapPin className="w-6 h-6" />
    },
    {
      label: 'Cụm Pod',
      path: '/admin/pod-clusters',
      icon: <Boxes className="w-6 h-6" />
    },
    {
      label: 'Pod',
      path: '/admin/pods',
      icon: <Home className="w-6 h-6" />
    },
    {
      label: 'Kho hàng & Vật tư',
      path: '/admin/inventory-warehouse',
      icon: <Warehouse className="w-6 h-6" />
    },
    // {
    //   label: 'Cleaning Tasks',
    //   path: '/admin/cleaning-tasks',
    //   icon: <ListChecks className="w-6 h-6" />
    // },
    {
      label: 'Quản lý ca làm',
      path: '/admin/shifts',
      icon: <Clock className="w-6 h-6" />
    },
    {
      label: 'Rút tiền',
      path: '/admin/withdraw',
      icon: <Wallet className="w-6 h-6" />
    },
    {
      label: 'Ví Admin',
      path: '/admin/ledger',
      icon: <Landmark className="w-6 h-6" />
    },
    {
      label: 'Đặt chỗ',
      path: '/admin/bookings',
      icon: <Calendar className="w-6 h-6" />
    },
    {
      label: 'Quy luật giá',
      path: '/admin/pricing-rules',
      icon: <BadgePercent className="w-6 h-6" />
    },
    {
      label: 'Voucher',
      path: '/admin/pricing',
      icon: <DollarSign className="w-6 h-6" />
    },
    {
      label: 'Quản lý nhân sự',
      path: '/admin/staff',
      icon: <Users className="w-6 h-6" />
    },
    {
      label: 'Quản lý người dùng',
      path: '/admin/users',
      icon: <Users className="w-6 h-6" />
    },
    {
      label: 'Đánh giá',
      path: '/admin/reviews',
      icon: <Star className="w-6 h-6" />
    }


  ]

  return <Sidebar navItems={navItems} userName={userName} userRole={userRole} profilePath="/admin/profile" />
}

export default AdminSidebar
