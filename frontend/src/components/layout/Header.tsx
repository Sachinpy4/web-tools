'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  Zap,
  Maximize,
  RefreshCw,
  Crop,
  ImageIcon,
  Newspaper,
  Info
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'

interface HeaderProps {
  isMenuOpen: boolean
  isToolsDropdownOpen: boolean
  toggleMenu: () => void
  closeMenu: () => void
  toggleToolsDropdown: () => void
}

export function Header({ 
  isMenuOpen, 
  isToolsDropdownOpen, 
  toggleMenu, 
  closeMenu, 
  toggleToolsDropdown 
}: HeaderProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const isActiveLink = (path: string) => {
    return pathname === path
  }
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Don't render theme-dependent UI until mounted on client
  const renderThemeChanger = mounted

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Optimized for Performance */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group" onClick={closeMenu}>
              {/* Optimized Candy Logo Icon - Using CSS animations instead of JS */}
              <div className="relative candy-logo-wrapper">
                <div 
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full shadow-lg flex items-center justify-center relative overflow-hidden border border-gray-200 dark:border-gray-700 candy-logo-base"
                  style={{background: 'linear-gradient(135deg, #00BFA6 0%, #6C63FF 50%, #1D4ED8 100%)'}}
                >
                  {/* Optimized Shine Effect - CSS animation with will-change */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent rounded-full candy-shine" />
                                  {/* Candy Icon */}
                <span className="text-white text-sm sm:text-base font-bold relative z-10">🍭</span>
                </div>
              </div>
              
              {/* Brand Text - Simplified hover effects */}
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-1">
                <span 
                  className="font-bold text-lg sm:text-xl bg-clip-text text-transparent group-hover:opacity-80 transition-opacity duration-300 brand-text-1"
                  style={{background: 'linear-gradient(135deg, #1D4ED8 0%, #374151 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text'}}
                >
                  Tools
                </span>
                <span 
                  className="font-bold text-lg sm:text-xl bg-clip-text text-transparent group-hover:opacity-80 transition-opacity duration-300 brand-text-2"
                  style={{background: 'linear-gradient(135deg, #00BFA6 0%, #6C63FF 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text'}}
                >
                  Candy
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-3">
            <div className="relative group tools-dropdown-container">
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  toggleToolsDropdown()
                }}
                className="flex items-center px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 border border-teal-100 dark:border-teal-800/50 hover:from-teal-100 hover:to-cyan-100 dark:hover:from-teal-900/50 dark:hover:to-cyan-900/50 transition-all duration-300 shadow-sm hover:shadow-md tools-dropdown-btn"
              >
                <ImageIcon className="w-4 h-4 mr-2 text-teal-600 dark:text-teal-400" />
                <span className="bg-gradient-to-r from-teal-700 to-cyan-600 dark:from-teal-300 dark:to-cyan-300 bg-clip-text text-transparent font-semibold">Image Tools</span>
                <ChevronDown className={`ml-2 h-4 w-4 text-teal-600 dark:text-teal-400 transition-transform duration-300 ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Optimized Dropdown - Simplified animation */}
              <div 
                className={`absolute left-0 right-0 sm:left-0 sm:right-auto sm:w-64 mt-3 mx-4 sm:mx-0 sm:max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-xl tools-dropdown ${isToolsDropdownOpen ? 'tools-dropdown-open' : 'tools-dropdown-closed'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 mb-1">
                    Choose Your Tool
                  </div>
                  
                  <Link
                    href="/image/compress"
                    className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 tool-link ${isActiveLink('/image/compress') ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
                    onClick={() => {
                      toggleToolsDropdown()
                      closeMenu()
                    }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white mr-3 tool-icon">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Compress</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Reduce file size</div>
                    </div>
                  </Link>
                  
                  <Link
                    href="/image/resize"
                    className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 tool-link ${isActiveLink('/image/resize') ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
                    onClick={() => {
                      toggleToolsDropdown()
                      closeMenu()
                    }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white mr-3 tool-icon">
                      <Maximize className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Resize</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Change dimensions</div>
                    </div>
                  </Link>
                  
                  <Link
                    href="/image/convert"
                    className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 tool-link ${isActiveLink('/image/convert') ? 'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
                    onClick={() => {
                      toggleToolsDropdown()
                      closeMenu()
                    }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 text-white mr-3 tool-icon">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Convert</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Change format</div>
                    </div>
                  </Link>
                  
                  <Link
                    href="/image/crop"
                    className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 tool-link ${isActiveLink('/image/crop') ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
                    onClick={() => {
                      toggleToolsDropdown()
                      closeMenu()
                    }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white mr-3 tool-icon">
                      <Crop className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Crop</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Trim & cut</div>
                    </div>
                  </Link>
                  
                  <Link
                    href="/image/metadata"
                    className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 tool-link ${isActiveLink('/image/metadata') ? 'bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
                    onClick={() => {
                      toggleToolsDropdown()
                      closeMenu()
                    }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white mr-3 tool-icon">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Metadata</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Image analysis</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
            
            <Link
              href="/blog"
              className={`group flex items-center px-4 py-3 mx-3 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-800/50 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/50 dark:hover:to-teal-900/50 transition-all duration-300 ${isActiveLink('/blog') ? 'ring-2 ring-emerald-200 dark:ring-emerald-800' : ''}`}
              onClick={closeMenu}
            >
              <Newspaper className="w-4 h-4 mr-3 text-emerald-600 dark:text-emerald-400" />
              <span className="bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-300 dark:to-teal-300 bg-clip-text text-transparent font-semibold">Latest News</span>
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* CTA Button - always visible */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle Button */}
            {renderThemeChanger && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="relative w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-background hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                aria-label="Toggle theme"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 