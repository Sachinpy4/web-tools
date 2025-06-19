'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { 
  Twitter, 
  Facebook, 
  Linkedin, 
  Instagram, 
  Mail,
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
// import { ProcessingModeIndicator } from '@/components/ui/ProcessingModeIndicator'

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const closeMenu = () => setIsMenuOpen(false)
  const toggleToolsDropdown = () => setIsToolsDropdownOpen(!isToolsDropdownOpen)

  const isActiveLink = (path: string) => {
    return pathname === path
  }
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Don't render theme-dependent UI until mounted on client
  const renderThemeChanger = mounted

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
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
                    {/* Candy-Styled Gear Icon */}
                    <span className="text-white text-sm sm:text-base font-bold relative z-10">⚙️</span>
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
              <div className="relative group">
                <button 
                  onClick={toggleToolsDropdown}
                  className="flex items-center px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 border border-teal-100 dark:border-teal-800/50 hover:from-teal-100 hover:to-cyan-100 dark:hover:from-teal-900/50 dark:hover:to-cyan-900/50 transition-all duration-300 shadow-sm hover:shadow-md tools-dropdown-btn"
                >
                  <ImageIcon className="w-4 h-4 mr-2 text-teal-600 dark:text-teal-400" />
                  <span className="bg-gradient-to-r from-teal-700 to-cyan-600 dark:from-teal-300 dark:to-cyan-300 bg-clip-text text-transparent font-semibold">Image Tools</span>
                  <ChevronDown className={`ml-2 h-4 w-4 text-teal-600 dark:text-teal-400 transition-transform duration-300 ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Optimized Dropdown - Simplified animation */}
                <div 
                  className={`absolute left-0 mt-3 w-64 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-xl tools-dropdown ${isToolsDropdownOpen ? 'tools-dropdown-open' : 'tools-dropdown-closed'}`}
                >
                  <div className="p-2">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 mb-1">
                      Choose Your Tool
                    </div>
                    
                    <Link
                      href="/image/compress"
                      className={`group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 tool-link ${isActiveLink('/image/compress') ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-750 text-gray-700 dark:text-gray-300'}`}
                      onClick={() => {
                        setIsToolsDropdownOpen(false)
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
                        setIsToolsDropdownOpen(false)
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
                        setIsToolsDropdownOpen(false)
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
                        setIsToolsDropdownOpen(false)
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
                        setIsToolsDropdownOpen(false)
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
              {/* <ProcessingModeIndicator /> */}
              
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

      {/* Mobile Navigation Menu */}
      <div className={`md:hidden mobile-menu ${isMenuOpen ? 'mobile-menu-open' : 'mobile-menu-closed'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-background border-b border-gray-200 dark:border-gray-700">
          {/* Mobile Tools Dropdown */}
          <div className="space-y-1">
            <button
              onClick={toggleToolsDropdown}
              className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <div className="flex items-center">
                <ImageIcon className="w-5 h-5 mr-3 text-teal-600 dark:text-teal-400" />
                <span>Image Tools</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Mobile Tools Submenu */}
            <div className={`mobile-submenu ${isToolsDropdownOpen ? 'mobile-submenu-open' : 'mobile-submenu-closed'}`}>
              <Link
                href="/image/compress"
                className="flex items-center px-6 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors duration-200"
                onClick={closeMenu}
              >
                <Zap className="w-4 h-4 mr-3" />
                Compress Images
              </Link>
              <Link
                href="/image/resize"
                className="flex items-center px-6 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/50 rounded-md transition-colors duration-200"
                onClick={closeMenu}
              >
                <Maximize className="w-4 h-4 mr-3" />
                Resize Images
              </Link>
              <Link
                href="/image/convert"
                className="flex items-center px-6 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-md transition-colors duration-200"
                onClick={closeMenu}
              >
                <RefreshCw className="w-4 h-4 mr-3" />
                Convert Format
              </Link>
              <Link
                href="/image/crop"
                className="flex items-center px-6 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/50 rounded-md transition-colors duration-200"
                onClick={closeMenu}
              >
                <Crop className="w-4 h-4 mr-3" />
                Crop Images
              </Link>
              <Link
                href="/image/metadata"
                className="flex items-center px-6 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 rounded-md transition-colors duration-200"
                onClick={closeMenu}
              >
                <Info className="w-4 h-4 mr-3" />
                View Metadata
              </Link>
            </div>
          </div>

          <Link
            href="/blog"
            className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            onClick={closeMenu}
          >
            <Newspaper className="w-5 h-5 mr-3 text-emerald-600 dark:text-emerald-400" />
            Latest News
          </Link>

          <Link
            href="/about"
            className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            onClick={closeMenu}
          >
            About
          </Link>

          <Link
            href="/contact"
            className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            onClick={closeMenu}
          >
            Contact
          </Link>

          {/* Mobile Theme Toggle */}
          {renderThemeChanger && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
            >
              <Sun className="h-5 w-5 mr-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 ml-3 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="ml-8">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {pathname === '/' ? (
          <>{children}</>
        ) : (
          <div className="container py-6 md:py-10">
            {children}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-8 h-8 rounded-full shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700"
                  style={{background: 'linear-gradient(135deg, #00BFA6 0%, #6C63FF 50%, #1D4ED8 100%)'}}
                >
                  <span className="text-white text-sm font-bold">⚙️</span>
                </div>
                <div className="flex space-x-1">
                  <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-gray-700 dark:from-blue-400 dark:to-gray-300 bg-clip-text text-transparent">Tools</span>
                  <span className="font-bold text-lg bg-gradient-to-r from-teal-600 to-purple-600 dark:from-teal-400 dark:to-purple-400 bg-clip-text text-transparent">Candy</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Free online image processing tools. Compress, resize, convert, and optimize your images with privacy-first processing.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="social-link" aria-label="Twitter">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="social-link" aria-label="Facebook">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="social-link" aria-label="LinkedIn">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="social-link" aria-label="Instagram">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="mailto:hello@toolscandy.com" className="social-link" aria-label="Email">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Image Tools */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Image Tools</h3>
              <div className="space-y-2">
                <Link href="/image/compress" className="footer-link">
                  Image Compressor
                </Link>
                <Link href="/image/resize" className="footer-link">
                  Image Resizer
                </Link>
                <Link href="/image/convert" className="footer-link">
                  Format Converter
                </Link>
                <Link href="/image/crop" className="footer-link">
                  Image Cropper
                </Link>
                <Link href="/image/metadata" className="footer-link">
                  EXIF Viewer
                </Link>
              </div>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Resources</h3>
              <div className="space-y-2">
                <Link href="/blog" className="footer-link">
                  Blog & Tutorials
                </Link>
                <Link href="/about" className="footer-link">
                  About Us
                </Link>
                <Link href="/contact" className="footer-link">
                  Contact Support
                </Link>
                <Link href="/privacy" className="footer-link">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="footer-link">
                  Terms of Service
                </Link>
              </div>
            </div>

            {/* Newsletter */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Stay Updated</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get notified about new tools and features.
              </p>
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button 
                  size="sm" 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                >
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                © 2024 ToolsCandy. All rights reserved.
              </p>
              <div className="flex space-x-6 text-sm">
                <Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                  Privacy
                </Link>
                <Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                  Terms
                </Link>
                <Link href="/disclaimer" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                  Disclaimer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Performance-Optimized CSS Styles */}
      <style jsx>{`
        /* Candy Logo Optimizations */
        .candy-logo-wrapper {
          will-change: transform;
        }
        
        .candy-logo-wrapper:hover .candy-logo-base {
          transform: scale(1.05) rotate3d(0, 0, 1, 5deg);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .candy-shine {
          will-change: transform;
          animation: candyShine 8s linear infinite;
        }
        
        @keyframes candyShine {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Brand Text Optimizations */
        .brand-text-1, .brand-text-2 {
          will-change: transform;
        }
        
        .group:hover .brand-text-1,
        .group:hover .brand-text-2 {
          transform: scale(1.02);
          transition: transform 0.2s ease-out;
        }
        
        /* Tools Dropdown Optimizations */
        .tools-dropdown-btn {
          will-change: transform;
        }
        
        .tools-dropdown-btn:hover {
          transform: scale(1.02);
          transition: transform 0.2s ease-out;
        }
        
        .tools-dropdown {
          will-change: opacity, transform;
          transition: opacity 0.2s ease-out, transform 0.2s ease-out;
        }
        
        .tools-dropdown-open {
          opacity: 1;
          transform: scale(1) translateY(0);
          pointer-events: auto;
        }
        
        .tools-dropdown-closed {
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
          pointer-events: none;
        }
        
        /* Tool Icon Optimizations */
        .tool-icon {
          will-change: transform;
          transition: transform 0.2s ease-out;
        }
        
        .tool-link:hover .tool-icon {
          transform: scale(1.1);
        }
        
        /* Mobile Menu Optimizations */
        .mobile-menu {
          will-change: transform, opacity;
          transition: all 0.3s ease-in-out;
          overflow: hidden;
        }
        
        .mobile-menu-open {
          max-height: 100vh;
          opacity: 1;
          transform: translateY(0);
        }
        
        .mobile-menu-closed {
          max-height: 0;
          opacity: 0;
          transform: translateY(-10px);
        }
        
        .mobile-submenu {
          will-change: max-height, opacity;
          transition: all 0.3s ease-in-out;
          overflow: hidden;
        }
        
        .mobile-submenu-open {
          max-height: 300px;
          opacity: 1;
        }
        
        .mobile-submenu-closed {
          max-height: 0;
          opacity: 0;
        }
        
        /* Social Links */
        .social-link {
          @apply text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200;
        }
        
        .footer-link {
          @apply block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200;
        }
        
        /* Performance Optimizations */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Hardware acceleration for transforms */
        .candy-logo-wrapper,
        .tools-dropdown-btn,
        .tool-icon,
        .mobile-menu {
          transform: translate3d(0, 0, 0);
        }
        
        /* Reduce paint operations */
        .tools-dropdown,
        .mobile-menu {
          contain: layout style paint;
        }
      `}</style>
    </div>
  )
} 