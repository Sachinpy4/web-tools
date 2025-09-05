'use client'

import React, { useState } from 'react'
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

  return (
    <div className="flex min-h-screen flex-col">
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
          <div className="container py-6 md:py-10">
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