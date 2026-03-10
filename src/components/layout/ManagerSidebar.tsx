import React from 'react'
import type { NavItem } from './Sidebar'
import Sidebar from './Sidebar'
import { LayoutGrid, MapPin, Home, Calendar, CheckCircle, AlertCircle, Package } from 'lucide-react'

const ManagerSidebar: React.FC<{ userName?: string; userRole?: string }> = ({ 
  userName = 'Manager User', 
  userRole = 'Manager' 
}) => {
  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/manager',
      icon: <LayoutGrid className="w-6 h-6" />
    },
    {
      label: 'Clusters',
      path: '/manager/clusters',
      icon: <MapPin className="w-6 h-6" />
    },
    {
      label: 'Pods',
      path: '/manager/pods',
      icon: <Home className="w-6 h-6" />
    },
    {
      label: 'Bookings',
      path: '/manager/bookings',
      icon: <Calendar className="w-6 h-6" />
    },
    {
      label: 'Cleaning and Maintenance',
      path: '/manager/maintenance',
      icon: <CheckCircle className="w-6 h-6" />
    },
    {
      label: 'Incidents',
      path: '/manager/incidents',
      icon: <AlertCircle className="w-6 h-6" />
    },
    {
      label: 'Lost and Found',
      path: '/manager/lost-found',
      icon: <Package className="w-6 h-6" />
    }
  ]

  return <Sidebar navItems={navItems} userName={userName} userRole={userRole} profilePath="/manager/profile" />
}

export default ManagerSidebar
