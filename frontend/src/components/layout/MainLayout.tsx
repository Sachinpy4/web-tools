'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { MobileMenu } from './MobileMenu'
import { Footer } from './Footer'
import SimplePWAInstallPrompt from '@/components/pwa/SimplePWAInstallPrompt'
import { PWAHealthCheck } from '@/components/pwa/PWAHealthCheck'

import './layout-styles.css'

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false)
  const pathname = usePathname()
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const closeMenu = () => setIsMenuOpen(false)
  const toggleToolsDropdown = () => setIsToolsDropdownOpen(!isToolsDropdownOpen)
  const closeToolsDropdown = () => setIsToolsDropdownOpen(false)

  // Close tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isToolsDropdownOpen && target) {
        // Check if click is outside the dropdown container
        const dropdownContainer = target.closest('.tools-dropdown-container')
        if (!dropdownContainer) {
          closeToolsDropdown()
        }
      }
    }

    if (isToolsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isToolsDropdownOpen])

  return (
    <div className="flex min-h-screen flex-col max-w-full overflow-x-hidden">
      <Header 
        isMenuOpen={isMenuOpen}
        isToolsDropdownOpen={isToolsDropdownOpen}
        toggleMenu={toggleMenu}
        closeMenu={closeMenu}
        toggleToolsDropdown={toggleToolsDropdown}
      />

      <MobileMenu 
        isMenuOpen={isMenuOpen}
        closeMenu={closeMenu}
      />

      {/* Main Content */}
      <main className="flex-1 pt-16">
        {pathname === '/' ? (
          <>{children}</>
        ) : (
          <div className="container px-4 sm:px-6 lg:px-8 py-6 md:py-10">
            {children}
          </div>
        )}
      </main>

      <Footer />

      {/* PWA Install Prompt */}
      <SimplePWAInstallPrompt />
      
      {/* PWA Health Check (development only) */}
      <PWAHealthCheck />
    </div>
  )
} 