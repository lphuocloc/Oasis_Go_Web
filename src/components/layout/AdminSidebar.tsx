import React from 'react'
import type { NavItem } from './Sidebar'
import Sidebar from './Sidebar'
import { LayoutGrid, MapPin, Home, Calendar, DollarSign, Users, Star, AlertCircle, BarChart3, Settings, Boxes, Warehouse, Clock, Wallet, ListChecks } from 'lucide-react'

const AdminSidebar: React.FC<{ userName?: string; userRole?: string }> = ({
  userName = 'Admin User',
  userRole = 'Administrator'
}) => {
  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/admin',
      icon: <LayoutGrid className="w-6 h-6" />
    },
    {
      label: 'Locations',
      path: '/admin/locations',
      icon: <MapPin className="w-6 h-6" />
    },
    {
      label: 'Pod Clusters',
      path: '/admin/pod-clusters',
      icon: <Boxes className="w-6 h-6" />
    },
    {
      label: 'Pods',
      path: '/admin/pods',
      icon: <Home className="w-6 h-6" />
    },
    {
      label: 'Inventory & Warehouses',
      path: '/admin/inventory-warehouse',
      icon: <Warehouse className="w-6 h-6" />
    },
    // {
    //   label: 'Cleaning Tasks',
    //   path: '/admin/cleaning-tasks',
    //   icon: <ListChecks className="w-6 h-6" />
    // },
    /*
    {
      label: 'Manager Shifts',
      path: '/admin/shifts',
      icon: <Clock className="w-6 h-6" />
    },
    */
    {
      label: 'Withdraw',
      path: '/admin/withdraw',
      icon: <Wallet className="w-6 h-6" />
    },
    {
      label: 'Bookings',
      path: '/admin/bookings',
      icon: <Calendar className="w-6 h-6" />
    },
    {
      label: 'Pricing & Vouchers',
      path: '/admin/pricing',
      icon: <DollarSign className="w-6 h-6" />
    },
    {
      label: 'Staff Management',
      path: '/admin/staff',
      icon: <Users className="w-6 h-6" />
    },
    {
      label: 'Reviews & Ratings',
      path: '/admin/reviews',
      icon: <Star className="w-6 h-6" />
    },
    {
      label: 'Incidents & Maintenance',
      path: '/admin/incidents',
      icon: <AlertCircle className="w-6 h-6" />
    },
    // {
    //   label: 'Analytics & Reports',
    //   path: '/admin/analytics',
    //   icon: <BarChart3 className="w-6 h-6" />
    // },
    // {
    //   label: 'System Settings',
    //   path: '/admin/settings',
    //   icon: <Settings className="w-6 h-6" />
    // }

  ]

  return <Sidebar navItems={navItems} userName={userName} userRole={userRole} profilePath="/admin/profile" />
}

export default AdminSidebar
