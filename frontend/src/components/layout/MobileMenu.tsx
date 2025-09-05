'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Zap,
  Maximize,
  RefreshCw,
  Crop,
  ImageIcon,
  Newspaper,
  Info,
  Sun,
  Moon,
  Scissors
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'

interface MobileMenuProps {
  isMenuOpen: boolean
  closeMenu: () => void
}

export function MobileMenu({ isMenuOpen, closeMenu }: MobileMenuProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [isAnimating, setIsAnimating] = useState(false)

  const isActiveLink = (path: string) => {
    return pathname === path
  }

  // Handle animation states
  useEffect(() => {
    if (isMenuOpen) {
      setIsAnimating(true)
    }
  }, [isMenuOpen])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflowX = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflowX = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflowX = 'unset'
    }
  }, [isMenuOpen])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(closeMenu, 200) // Wait for animation to complete
  }

  if (!isMenuOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-200 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      
      {/* Mobile Menu */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 max-h-[calc(100vh-4rem)] overflow-hidden">
        <div className={`h-full overflow-y-auto overflow-x-hidden transition-all duration-300 ease-out ${isAnimating ? 'transform translate-y-0 opacity-100' : 'transform -translate-y-4 opacity-0'}`}>
          <div className="px-3 pt-2 pb-3 space-y-1 bg-background/98 backdrop-blur-xl supports-[backdrop-filter]:bg-background/95 border-t shadow-xl min-w-0 max-w-full">
        {/* Image Tools Section */}
        <div className="py-2">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 mb-2">
            <ImageIcon className="w-4 h-4 inline mr-2" />
            Image Tools
          </div>
          
          <Link
            href="/image/compress"
            className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 mx-1 min-w-0 max-w-full ${isActiveLink('/image/compress') ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
            onClick={handleClose}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white mr-3 flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">Compress</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Reduce file size</div>
            </div>
          </Link>
          
          <Link
            href="/image/resize"
            className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 mx-1 min-w-0 max-w-full ${isActiveLink('/image/resize') ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
            onClick={handleClose}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white mr-3 flex-shrink-0">
              <Maximize className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">Resize</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Change dimensions</div>
            </div>
          </Link>
          
          <Link
            href="/image/convert"
            className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 mx-1 min-w-0 max-w-full ${isActiveLink('/image/convert') ? 'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
            onClick={handleClose}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 text-white mr-3 flex-shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">Convert</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Change format</div>
            </div>
          </Link>
          
          <Link
            href="/image/crop"
            className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 mx-1 min-w-0 max-w-full ${isActiveLink('/image/crop') ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
            onClick={handleClose}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white mr-3 flex-shrink-0">
              <Crop className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">Crop</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Trim & cut</div>
            </div>
          </Link>
          
          <Link
            href="/image/metadata"
            className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 mx-1 min-w-0 max-w-full ${isActiveLink('/image/metadata') ? 'bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
            onClick={handleClose}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white mr-3 flex-shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">Metadata</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Image analysis</div>
            </div>
          </Link>
          
          <Link
            href="/image/background-removal"
            className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 mx-1 min-w-0 max-w-full ${isActiveLink('/image/background-removal') ? 'bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/50 dark:to-rose-950/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
            onClick={handleClose}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white mr-3 flex-shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">Background Removal</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Remove backgrounds</div>
            </div>
          </Link>
        </div>

        {/* Blog Link */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/blog"
            className={`group flex items-center px-3 py-3 mx-1 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-800/50 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/50 dark:hover:to-teal-900/50 transition-all duration-300 min-w-0 max-w-full ${isActiveLink('/blog') ? 'ring-2 ring-emerald-200 dark:ring-emerald-800' : ''}`}
            onClick={handleClose}
          >
            <Newspaper className="w-5 h-5 mr-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-300 dark:to-teal-300 bg-clip-text text-transparent font-semibold truncate">Latest News</span>
          </Link>
        </div>

        {/* Theme Toggle */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button 
            variant="ghost" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full justify-start px-3 py-3 mx-1 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 min-w-0 max-w-full"
          >
            <Sun className="h-4 w-4 mr-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 flex-shrink-0" />
            <Moon className="absolute h-4 w-4 ml-3 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 flex-shrink-0" />
            <span className="ml-6 truncate">Toggle Theme</span>
          </Button>
          </div>
          </div>
        </div>
      </div>
    </>
  )
} 