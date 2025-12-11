'use client'

import React from 'react'
import Link from 'next/link'
import { 
  Github, 
  Twitter, 
  Mail, 
  Heart, 
  Zap,
  Shield,
  FileText,
  Info,
  MessageCircle,
  ExternalLink,
  Sparkles,
  ImageIcon,
  Newspaper,
  Scissors
} from 'lucide-react'


export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              {/* Logo */}
              <div 
                className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center relative overflow-hidden border border-gray-200 dark:border-gray-700"
                style={{background: 'linear-gradient(135deg, #00BFA6 0%, #6C63FF 50%, #1D4ED8 100%)'}}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent rounded-full" />
                <span className="text-white text-lg font-bold relative z-10">🍭</span>
              </div>
              
              {/* Brand Text */}
              <div className="flex flex-col">
                <div className="flex items-baseline space-x-1">
                  <span 
                    className="font-bold text-xl bg-clip-text text-transparent"
                    style={{background: 'linear-gradient(135deg, #1D4ED8 0%, #374151 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text'}}
                  >
                    Tools
                  </span>
                  <span 
                    className="font-bold text-xl bg-clip-text text-transparent"
                    style={{background: 'linear-gradient(135deg, #00BFA6 0%, #6C63FF 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text'}}
                  >
                    Candy
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
              Professional image processing tools designed for creators, developers, and businesses. 
              Fast, secure, and privacy-focused.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors duration-200 group"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors duration-200 group"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200" />
              </a>
              <a 
                href="mailto:contact@toolscandy.com"
                className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors duration-200 group"
                aria-label="Email"
              >
                <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200" />
              </a>
            </div>
          </div>

          {/* Image Tools */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <ImageIcon className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Image Tools
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/image/compress" 
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors duration-200 flex items-center group"
                >
                  <Zap className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  Image Compression
                </Link>
              </li>
              <li>
                <Link 
                  href="/image/resize" 
                  className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 text-sm transition-colors duration-200 flex items-center group"
                >
                  <Sparkles className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  Image Resizing
                </Link>
              </li>
              <li>
                <Link 
                  href="/image/convert" 
                  className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 text-sm transition-colors duration-200 flex items-center group"
                >
                  <ExternalLink className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  Format Conversion
                </Link>
              </li>
              <li>
                <Link 
                  href="/image/crop" 
                  className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 text-sm transition-colors duration-200 flex items-center group"
                >
                  <ExternalLink className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  Image Cropping
                </Link>
              </li>
              <li>
                <Link 
                  href="/image/metadata" 
                  className="text-gray-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 text-sm transition-colors duration-200 flex items-center group"
                >
                  <Info className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  Metadata Analysis
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Newspaper className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/blog" 
                  className="text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-sm transition-colors duration-200 flex items-center group"
                >
                  <Newspaper className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  Blog & Tutorials
                </Link>
              </li>
              <li>
                <Link 
                  href="/about" 
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm transition-colors duration-200 flex items-center group"
                >
                  <Info className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm transition-colors duration-200 flex items-center group"
                >
                  <MessageCircle className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
              Legal & Privacy
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/privacy" 
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm transition-colors duration-200 flex items-center group"
                >
                  <Shield className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm transition-colors duration-200 flex items-center group"
                >
                  <FileText className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  href="/disclaimer" 
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm transition-colors duration-200 flex items-center group"
                >
                  <FileText className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>


        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <span>© {currentYear} ToolsCandy.</span>
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span>for creators worldwide.</span>
            </div>

            {/* Developer Credit */}
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Developed by <span className="text-blue-600 dark:text-blue-400">Sachin Modi</span>
            </div>

            {/* Performance Badge */}
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-500">
              <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 dark:text-green-400 font-medium">99.9% Uptime</span>
              </div>
              <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <Zap className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-400 font-medium">Lightning Fast</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 