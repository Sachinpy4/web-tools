'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Images, 
  Settings, 
  Users, 
  BarChart3, 
  ShieldAlert,
  LogOut,
  Database
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
    } else if (!isLoading && user && user.role !== 'admin') {
      router.push('/')
    }
  }, [isLoading, user, router, pathname])
  
  // Handle sidebar collapse state
  const handleSidebarToggle = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed)
  }
  
  // Handle mobile menu toggle
  const handleMobileMenuToggle = (open: boolean) => {
    setIsMobileMenuOpen(open)
  }
  
  // Close mobile menu when pathname changes (navigation)
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])
  
  // Close mobile menu when clicking outside on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setIsMobileMenuOpen(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // If loading session, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          {/* Desktop sidebar skeleton */}
          <div className="hidden lg:block w-64 border-r">
            <Skeleton className="h-full" />
          </div>
          <div className="flex-1 flex flex-col">
            <Skeleton className="h-14 sm:h-16 w-full" />
            <div className="flex-1 p-3 sm:p-6">
              <Skeleton className="h-[calc(100vh-6rem)] w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // If authenticated and session loaded, show admin panel
  if (user && user.role === 'admin') {
    const mainNav = [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        title: "Blogs",
        href: "/dashboard/blogs",
        icon: <FileText className="h-5 w-5" />,
      },
      {
        title: "Comments",
        href: "/dashboard/comments",
        icon: <MessageSquare className="h-5 w-5" />,
      },
      {
        title: "Media",
        href: "/dashboard/media",
        icon: <Images className="h-5 w-5" />,
      },
      {
        title: "Users",
        href: "/dashboard/users",
        icon: <Users className="h-5 w-5" />,
      },
      {
        title: "Backup",
        href: "/dashboard/backup",
        icon: <Database className="h-5 w-5" />,
      },
      {
        title: "Monitoring",
        href: "/dashboard/monitoring",
        icon: <BarChart3 className="h-5 w-5" />,
      },
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: <Settings className="h-5 w-5" />,
      },
    ]

    return (
      <div className="min-h-screen bg-background">
        {/* Mobile backdrop overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {/* Desktop sidebar - hidden on mobile */}
        <div className={`hidden lg:block fixed top-0 left-0 h-full z-30 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <AdminSidebar 
            onToggle={handleSidebarToggle} 
            isMobile={false}
            isOpen={true}
          />
        </div>
        
        {/* Mobile sidebar - slide in from left */}
        <div className={`lg:hidden fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} w-64`}>
          <AdminSidebar 
            onToggle={handleMobileMenuToggle} 
            isMobile={true}
            isOpen={isMobileMenuOpen}
          />
        </div>
        
        {/* Main content area */}
        <div className={`min-h-screen transition-all duration-300 ${
          // On mobile: no margin (full width)
          // On desktop: margin left based on sidebar state
          isSidebarCollapsed 
            ? 'lg:ml-20' 
            : 'lg:ml-64'
        }`}>
          {/* Topbar - responsive positioning */}
          <div className="sticky top-0 z-20 bg-background border-b">
            <AdminTopbar 
              user={user} 
              onMobileMenuToggle={handleMobileMenuToggle}
              isMobileMenuOpen={isMobileMenuOpen}
            />
          </div>
          
          {/* Main content with responsive padding - allows full scrolling */}
          <main className="p-3 sm:p-4 lg:p-6">
            <div className="w-full max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
    )
  }
  
  // This should not be visible, but adding as a fallback
  return null
} 