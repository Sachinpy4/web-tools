'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Sun, Moon, LogOut, ChevronDown, Menu, User, Settings, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminTopbarProps {
  user: User
  onMobileMenuToggle?: (open: boolean) => void
  isMobileMenuOpen?: boolean
}

export function AdminTopbar({ user, onMobileMenuToggle, isMobileMenuOpen = false }: AdminTopbarProps) {
  const { setTheme, theme } = useTheme()
  const { logout, refreshSession, sessionTimeRemaining } = useAuth()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleMobileMenuToggle = () => {
    if (onMobileMenuToggle) {
      onMobileMenuToggle(!isMobileMenuOpen)
    }
  }

  // Format session time remaining
  const formatTimeRemaining = (milliseconds: number | null): string => {
    if (!milliseconds || milliseconds <= 0) return 'Expired'
    
    const minutes = Math.floor(milliseconds / (60 * 1000))
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
  }

  // Get session status color
  const getSessionStatusColor = (milliseconds: number | null): string => {
    if (!milliseconds || milliseconds <= 0) return 'bg-red-500'
    
    const minutes = Math.floor(milliseconds / (60 * 1000))
    if (minutes <= 10) return 'bg-red-500'
    if (minutes <= 30) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const handleRefreshSession = async () => {
    setIsRefreshing(true)
    await refreshSession()
    setIsRefreshing(false)
  }

  return (
    <div className="h-14 sm:h-16 border-b flex items-center justify-between px-3 sm:px-6 bg-background">
      {/* Left side - Mobile menu button + Title */}
      <div className="flex items-center gap-3 flex-1">
        {/* Mobile menu button - only visible on mobile */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleMobileMenuToggle}
          className="lg:hidden rounded-md hover:bg-primary/10 h-8 w-8 sm:h-10 sm:w-10"
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        
        {/* Welcome message - hidden on very small screens */}
        <h1 className="font-medium text-sm sm:text-lg hidden sm:block">
          Welcome, {user?.name || 'Admin'}
        </h1>
        
        {/* Mobile title - only visible on small screens */}
        <h1 className="font-medium text-sm sm:hidden">
          Admin Panel
        </h1>
      </div>
      
      {/* Right side - Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full border-0 bg-secondary/30 hover:bg-secondary/50 h-8 w-8 sm:h-10 sm:w-10"
            >
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 sm:w-40 rounded-xl p-2">
            <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer rounded-lg flex items-center gap-2 py-2">
              <Sun className="h-4 w-4" />
              <span className="text-sm">Light</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer rounded-lg flex items-center gap-2 py-2">
              <Moon className="h-4 w-4" />
              <span className="text-sm">Dark</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer rounded-lg flex items-center gap-2 py-2">
              <div className="h-4 w-4 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full border-2"></div>
              </div>
              <span className="text-sm">System</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full border-0 bg-secondary/30 hover:bg-secondary/50 relative h-8 w-8 sm:h-10 sm:w-10"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500 rounded-full border-2 border-background"></span>
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 sm:w-80 rounded-xl p-3 sm:p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-sm sm:text-base">Notifications</h3>
              <Badge variant="outline" className="ml-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs">
                3 New
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <div className="space-y-2 sm:space-y-3 mt-2">
              <div className="flex items-start gap-2 sm:gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium">New blog comment</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Someone commented on your latest blog post</p>
                  <p className="text-xs text-muted-foreground mt-1">2 min ago</p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium">New user registration</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">A new user has registered to the platform</p>
                  <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator className="my-2" />
            <div className="text-center">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm w-full justify-center rounded-lg">
                View all notifications
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Session timeout indicator */}
        {sessionTimeRemaining !== null && (
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted text-xs">
              <div className={`w-2 h-2 rounded-full ${getSessionStatusColor(sessionTimeRemaining)}`} />
              <Clock className="h-3 w-3" />
              <span className="font-medium">{formatTimeRemaining(sessionTimeRemaining)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshSession}
              disabled={isRefreshing}
              className="h-8 px-2 text-xs"
            >
              {isRefreshing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}
        
        {/* User avatar & dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 rounded-full h-8 sm:h-10 hover:bg-secondary/50">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary ring-2 ring-background flex-shrink-0">
                <span className="text-xs font-medium">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'AU'}
                </span>
              </div>
              <div className="text-xs sm:text-sm hidden md:block">
                <div className="font-medium truncate max-w-20 sm:max-w-32">
                  {user?.name || 'Admin User'}
                </div>
              </div>
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 sm:w-56 rounded-xl p-2">
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || 'admin@example.com'}</p>
            </div>
            
            {/* Mobile session info */}
            {sessionTimeRemaining !== null && (
              <div className="sm:hidden px-3 py-2 border-t border-b my-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${getSessionStatusColor(sessionTimeRemaining)}`} />
                    <Clock className="h-3 w-3" />
                    <span>Session: {formatTimeRemaining(sessionTimeRemaining)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshSession}
                    disabled={isRefreshing}
                    className="h-6 px-2"
                  >
                    {isRefreshing ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer rounded-lg flex items-center gap-2 py-2">
              <span className="text-sm">Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer rounded-lg flex items-center gap-2 py-2">
              <span className="text-sm">Admin Preferences</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer rounded-lg flex items-center gap-2 text-red-500 py-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
} 