'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getProxiedImageUrl } from '@/lib/imageProxy'
import { 
  ArrowRight, 
  Image, 
  Crop, 
  RefreshCw, 
  ZoomIn, 
  Shield, 
  Zap, 
  Clock, 
  Award,
  CreditCard,
  CalendarIcon,
  Check,
  MoveRight,
  FileText,
  ArrowUpRight,
  Star,
  Users,
  Download,
  Globe,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { apiRequest } from '@/lib/apiClient'

// Structured Data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "ToolsCandy - Free Online Image Editor",
  "description": "Free online image editor and optimizer. Compress, resize, crop, convert, and remove backgrounds from images with AI. No signup required, 100% privacy-focused.",
  "url": "https://toolscandy.com",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Image Compression",
    "Image Resizing", 
    "Format Conversion",
    "Image Cropping",
    "AI Background Removal",
    "EXIF Data Extraction",
    "Privacy-First Processing"
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "50000"
  }
}

// Define blog post interface
interface BlogPost {
  _id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  status: string;
  author: { name: string; email: string } | string | null;
  category: string;
  tags: string[];
  featuredImage?: string;
  views: number;
  readingTime?: string;
  slug: string;
}

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

const sparkleVariants = {
  animate: {
    scale: [0, 1, 0],
    rotate: [0, 180, 360],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

// FAQ data
const faqData = [
  {
    question: "Is ToolsCandy completely free to use?",
    answer: "Yes, all our image editing tools are 100% free with no hidden fees, watermarks, or usage limits. You can compress, resize, crop, and convert as many images as you need."
  },
  {
    question: "Are my images safe and private?",
    answer: "Absolutely. All image processing happens locally in your browser - your images never leave your device. We don't store, access, or transmit your images to any servers."
  },
  {
    question: "What image formats do you support?",
    answer: "We support all major image formats including JPG, PNG, WebP, AVIF, GIF, BMP, and TIFF. You can convert between any of these formats seamlessly."
  },
  {
    question: "Is there a file size limit?",
    answer: "Our tools can handle images up to 50MB in size. For larger files, we recommend using our bulk processing features or contacting our support team."
  },
  {
    question: "Do I need to create an account?",
    answer: "No account required! You can start using our image editing tools immediately without any signup process. Simply visit any tool page and start editing."
  },
  {
    question: "Can I use these tools for commercial projects?",
    answer: "Yes, our tools are free for both personal and commercial use. There are no licensing restrictions or attribution requirements."
  }
]

export default function HomeContent() {
  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  
  // Fetch latest blog posts
  useEffect(() => {
    const fetchLatestPosts = async () => {
      try {
        setLoading(true)
        const response = await apiRequest<{
          status: string;
          data: BlogPost[];
        }>('/blogs?limit=3', { noRedirect: true })
        
        if (response.data) {
          setLatestPosts(response.data)
        }
      } catch (error) {
        console.error('Error fetching latest posts:', error)
        // Fallback data if API fails
        setLatestPosts([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchLatestPosts()
  }, [])
  
  // FAQ toggle function
  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index)
  }
  
  // Format author name function
  const getAuthorName = (author: { name: string; email: string } | string | null): string => {
    if (!author || typeof author === 'string') {
      return 'Anonymous'
    }
    return author.name || 'Anonymous'
  }
  
  // Format author initials
  const getAuthorInitials = (author: { name: string; email: string } | string | null): string => {
    if (!author || typeof author === 'string') {
      return 'A'
    }
    if (!author.name) {
      return 'A'
    }
    return author.name.split(' ').map(n => n[0]).join('')
  }

  // Helper function to get proxied featured image URL
  const getProxiedFeaturedImage = (imageUrl: string): string => {
    if (!imageUrl) return imageUrl
    return getProxiedImageUrl(imageUrl) || imageUrl
  }

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="flex flex-col items-center">
        {/* Hero Section - SEO Optimized */}
        <section className="relative w-full py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28 mb-12 sm:mb-16 md:mb-20 overflow-hidden">
          {/* Simplified Background */}
          <div className="absolute inset-0 overflow-hidden -z-10">
            {/* Main gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-50 dark:from-teal-950/20 dark:via-blue-950/20 dark:to-indigo-950/20"></div>
            
            {/* Simple geometric shapes without animation */}
            <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-500/20 blur-2xl"></div>
            <div className="absolute top-40 right-20 w-40 h-40 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-500/20 blur-2xl"></div>
            <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-gradient-to-br from-purple-400/15 to-indigo-400/15 blur-xl"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto text-center"
            >
              {/* Brand Badge */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex items-center gap-2 mb-4 sm:mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-indigo-500/10 border border-teal-200/50 dark:border-teal-800/50 backdrop-blur-sm"
              >
                <span className="text-xs font-semibold bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Free • Fast • Privacy-First
                </span>
              </motion.div>
              
              {/* SEO-Optimized Main Heading - Reduced Size */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 leading-tight">
                <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Free Online Image Editor
                </span>
                <br />
                <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal text-muted-foreground">
                  Compress, Resize, Convert Images
                </span>
              </h1>
              
              {/* SEO-Optimized Subtitle - Reduced Size */}
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 leading-relaxed max-w-3xl mx-auto px-4 sm:px-0">
                Professional image editing tools for web developers, designers, and content creators.
                <br className="hidden sm:block" />
                <span className="text-sm sm:text-base md:text-lg">
                  No signup required, 100% secure, works in any browser.
                </span>
              </p>
              
              {/* CTA Buttons - Reduced Size */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0 mb-8 sm:mb-12">
                <Link href="/image/compress" title="Free Image Compressor - Reduce file size without quality loss">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto rounded-full px-6 py-3 bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 hover:from-teal-700 hover:via-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 h-12 sm:h-14 text-sm sm:text-base font-semibold transition-all duration-300 hover:scale-105"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Compress Images Free
                    <MoveRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Link href="/blog" title="Image optimization tutorials and guides">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full sm:w-auto rounded-full px-6 py-3 border-2 border-teal-200 dark:border-teal-800 hover:border-teal-300 dark:hover:border-teal-700 h-12 sm:h-14 text-sm sm:text-base font-semibold bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-all duration-300"
                  >
                    <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                    Learning Resources
                  </Button>
                </Link>
              </div>
              
              {/* Trust Indicators with SEO benefits - Reduced Size */}
              <div className="pt-6 sm:pt-8 border-t border-teal-100 dark:border-teal-900/50">
                <p className="text-muted-foreground mb-4 sm:mb-6 text-xs sm:text-sm font-medium">
                  TRUSTED BY 50,000+ PROFESSIONALS WORLDWIDE
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 items-center">
                  <motion.div 
                    className="flex flex-col sm:flex-row items-center justify-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400 p-2 rounded-full border border-green-200/50 dark:border-green-800/50">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm">100% Free</span>
                  </motion.div>
                  
                  <motion.div 
                    className="flex flex-col sm:flex-row items-center justify-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 p-2 rounded-full border border-blue-200/50 dark:border-blue-800/50">
                      <Shield className="h-3 w-3" aria-hidden="true" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm">Privacy First</span>
                  </motion.div>
                  
                  <motion.div 
                    className="flex flex-col sm:flex-row items-center justify-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400 p-2 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                      <Zap className="h-3 w-3" aria-hidden="true" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm">Lightning Fast</span>
                  </motion.div>
                  
                  <motion.div 
                    className="flex flex-col sm:flex-row items-center justify-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 text-teal-600 dark:text-teal-400 p-2 rounded-full border border-teal-200/50 dark:border-teal-800/50">
                      <Award className="h-3 w-3" aria-hidden="true" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm">Pro Quality</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
        
        {/* Image Tools Section - SEO Enhanced */}
        <section className="w-full mb-16 sm:mb-20 md:mb-24" id="image-tools" role="main">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-12 sm:mb-16"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Professional Image Editing Tools
                </span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Complete suite of online image optimization tools for photographers, web developers, and content creators
              </p>
            </motion.div>
            
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6"
            >
              {/* Image Compression Tool - SEO Optimized */}
              <article>
                <Link href="/image/compress" className="group" title="Free online image compressor - Reduce JPG, PNG, WebP file sizes">
                  <motion.div variants={item}>
                    <div className="relative h-[350px] rounded-xl border-2 border-transparent bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-100 dark:from-teal-950/30 dark:via-cyan-950/30 dark:to-teal-900/30 p-6 transition-all duration-500 hover:shadow-xl hover:shadow-teal-500/20 hover:border-teal-300/50 hover:-translate-y-1 hover:scale-105 overflow-hidden flex flex-col">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Icon */}
                      <div className="relative mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg group-hover:shadow-xl group-hover:shadow-teal-500/30 transition-all duration-300">
                        <Image size={20} aria-hidden="true" />
                      </div>
                      
                      <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        Image Compressor
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed flex-1">
                        Reduce file sizes by up to 90% without quality loss. Perfect for web optimization and faster loading.
                      </p>
                      <div className="flex items-center font-semibold text-sm text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 mt-auto">
                        Compress Images <ArrowRight size={14} className="ml-2" aria-hidden="true" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </article>

              {/* Image Resize Tool - SEO Optimized */}
              <article>
                <Link href="/image/resize" className="group" title="Free online image resizer - Change dimensions, scale images">
                  <motion.div variants={item}>
                    <div className="relative h-[350px] rounded-xl border-2 border-transparent bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-blue-900/30 p-6 transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/20 hover:border-blue-300/50 hover:-translate-y-1 hover:scale-105 overflow-hidden flex flex-col">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div className="relative mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg group-hover:shadow-xl group-hover:shadow-blue-500/30 transition-all duration-300">
                        <ZoomIn size={20} aria-hidden="true" />
                      </div>
                      
                      <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Image Resizer
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed flex-1">
                        Scale images to custom dimensions or percentage. Ideal for social media posts and websites.
                      </p>
                      <div className="flex items-center font-semibold text-sm text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 mt-auto">
                        Resize Images <ArrowRight size={14} className="ml-2" aria-hidden="true" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </article>

              {/* Image Convert Tool - SEO Optimized */}
              <article>
                <Link href="/image/convert" className="group" title="Free image format converter - JPG to PNG, WebP, AVIF conversion">
                  <motion.div variants={item}>
                    <div className="relative h-[350px] rounded-xl border-2 border-transparent bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-orange-900/30 p-6 transition-all duration-500 hover:shadow-xl hover:shadow-orange-500/20 hover:border-orange-300/50 hover:-translate-y-1 hover:scale-105 overflow-hidden flex flex-col">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div className="relative mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg group-hover:shadow-xl group-hover:shadow-orange-500/30 transition-all duration-300">
                        <RefreshCw size={20} aria-hidden="true" />
                      </div>
                      
                      <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        Format Converter
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed flex-1">
                        Convert between JPG, PNG, WebP, AVIF formats. Optimize images for web performance and speed.
                      </p>
                      <div className="flex items-center font-semibold text-sm text-orange-600 dark:text-orange-400 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 mt-auto">
                        Convert Images <ArrowRight size={14} className="ml-2" aria-hidden="true" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </article>

              {/* Image Crop Tool - SEO Optimized */}
              <article>
                <Link href="/image/crop" className="group" title="Free online image cropper - Crop images with aspect ratios">
                  <motion.div variants={item}>
                    <div className="relative h-[350px] rounded-xl border-2 border-transparent bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-emerald-900/30 p-6 transition-all duration-500 hover:shadow-xl hover:shadow-emerald-500/20 hover:border-emerald-300/50 hover:-translate-y-1 hover:scale-105 overflow-hidden flex flex-col">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div className="relative mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg group-hover:shadow-xl group-hover:shadow-emerald-500/30 transition-all duration-300">
                        <Crop size={20} aria-hidden="true" />
                      </div>
                      
                      <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Image Cropper
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed flex-1">
                        Crop images with precision using aspect ratios. Perfect for social media and profile pictures.
                      </p>
                      <div className="flex items-center font-semibold text-sm text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 mt-auto">
                        Crop Images <ArrowRight size={14} className="ml-2" aria-hidden="true" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </article>

              {/* Background Removal Tool - SEO Optimized */}
              <article>
                <Link href="/image/background-removal" className="group" title="AI-powered background remover - Remove backgrounds from images with precision">
                  <motion.div variants={item}>
                    <div className="relative h-[350px] rounded-xl border-2 border-transparent bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-purple-900/30 p-6 transition-all duration-500 hover:shadow-xl hover:shadow-purple-500/20 hover:border-purple-300/50 hover:-translate-y-1 hover:scale-105 overflow-hidden flex flex-col">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div className="relative mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg group-hover:shadow-xl group-hover:shadow-purple-500/30 transition-all duration-300">
                        <Sparkles size={20} aria-hidden="true" />
                      </div>
                      
                      <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        Background Remover
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed flex-1">
                        AI-powered background removal with professional edge refinement. Perfect for portraits and product photos.
                      </p>
                      <div className="flex items-center font-semibold text-sm text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 mt-auto">
                        Remove Background <ArrowRight size={14} className="ml-2" aria-hidden="true" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </article>

              {/* Image Metadata Tool - SEO Optimized */}
              <article>
                <Link href="/image/metadata" className="group" title="Free EXIF data extractor - View image metadata and camera info">
                  <motion.div variants={item}>
                    <div className="relative h-[350px] rounded-xl border-2 border-transparent bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-blue-900/30 p-6 transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/20 hover:border-blue-300/50 hover:-translate-y-1 hover:scale-105 overflow-hidden flex flex-col">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div className="relative mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg group-hover:shadow-xl group-hover:shadow-blue-500/30 transition-all duration-300">
                        <Info size={20} aria-hidden="true" />
                      </div>
                      
                      <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        EXIF Data Viewer
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed flex-1">
                        Extract metadata, camera settings, GPS coordinates. View technical image properties and details.
                      </p>
                      <div className="flex items-center font-semibold text-sm text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 mt-auto">
                        View Metadata <ArrowRight size={14} className="ml-2" aria-hidden="true" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </article>
            </motion.div>
          </div>
        </section>

        {/* Why Choose Section - SEO Enhanced */}
        <section className="w-full mb-16 sm:mb-20 md:mb-24" id="why-choose-toolscandy">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center mb-12 sm:mb-16"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Why Choose Our Image Editor?
                </span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                The most trusted online image editing platform with advanced features and uncompromising privacy
              </p>
            </motion.div>

            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
            >
              <motion.div variants={item} className="text-center group">
                <div className="mb-4 mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg group-hover:shadow-xl group-hover:shadow-teal-500/30 transition-all duration-300 group-hover:scale-110">
                  <Globe size={24} aria-hidden="true" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  Browser-Based Processing
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  No software downloads or installations required. Works directly in your web browser with complete privacy protection and offline capability.
                </p>
              </motion.div>

              <motion.div variants={item} className="text-center group">
                <div className="mb-4 mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg group-hover:shadow-xl group-hover:shadow-blue-500/30 transition-all duration-300 group-hover:scale-110">
                  <Zap size={24} aria-hidden="true" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Lightning-Fast Processing
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Advanced optimization algorithms ensure your images are processed in seconds, not minutes. Built for speed and efficiency.
                </p>
              </motion.div>

              <motion.div variants={item} className="text-center group">
                <div className="mb-4 mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg group-hover:shadow-xl group-hover:shadow-indigo-500/30 transition-all duration-300 group-hover:scale-110">
                  <Users size={24} aria-hidden="true" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Professional Results
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Intuitive interface designed for everyone – from beginners to professional photographers and web developers.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Modern FAQ Section with Expandable Items */}
        <section className="w-full mb-16 sm:mb-20 md:mb-24" id="image-editing-faq">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mb-12 sm:mb-16"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Frequently Asked Questions
                </span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Everything you need to know about our free online image editing tools
              </p>
            </motion.div>

            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {faqData.map((faq, index) => (
                <motion.div 
                  key={index}
                  variants={item} 
                  className={`bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 ${
                    openFAQ === index 
                      ? 'border-2 border-blue-200 dark:border-blue-700 shadow-blue-100 dark:shadow-blue-900/20' 
                      : 'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className={`w-full px-6 py-4 text-left flex items-center justify-between transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                      openFAQ === index
                        ? 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                    aria-expanded={openFAQ === index}
                  >
                    <h3 className={`font-semibold text-base pr-4 transition-colors duration-200 ${
                      openFAQ === index 
                        ? 'text-blue-900 dark:text-blue-100' 
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {faq.question}
                    </h3>
                    <div className="flex-shrink-0">
                      {openFAQ === index ? (
                        <ChevronUp className="w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform duration-200" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200" />
                      )}
                    </div>
                  </button>
                  
                  <motion.div
                    initial={false}
                    animate={{ 
                      height: openFAQ === index ? "auto" : 0,
                      opacity: openFAQ === index ? 1 : 0
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className={`px-6 pb-4 pt-0 ${
                      openFAQ === index ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Latest Blog Posts Section - SEO Enhanced */}
        {latestPosts.length > 0 && (
          <section className="w-full mb-24 sm:mb-28" id="image-editing-tutorials">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center mb-16 sm:mb-20"
              >
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Image Editing Tutorials & Tips
                  </span>
                </h2>
              </motion.div>

              <motion.div 
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {latestPosts.map((post, index) => (
                  <motion.div key={post._id} variants={item}>
                    <Link href={`/blog/${post.slug}`}>
                      <div className="group h-full rounded-2xl border-2 border-transparent bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-300/30 hover:-translate-y-2">
                        {post.featuredImage && (
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={getProxiedFeaturedImage(post.featuredImage)}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        )}
                        
                        <div className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-teal-500 to-blue-500 text-white">
                                {getAuthorInitials(post.author)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-sm text-muted-foreground">
                              <div className="font-medium">{getAuthorName(post.author)}</div>
                              <div>{new Date(post.date).toLocaleDateString()}</div>
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-bold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                            {post.title}
                          </h3>
                          
                          <p className="text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                            {post.excerpt}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              {post.tags.slice(0, 2).map((tag) => (
                                <Badge 
                                  key={tag} 
                                  variant="secondary" 
                                  className="text-xs bg-gradient-to-r from-teal-100 to-blue-100 dark:from-teal-900/30 dark:to-blue-900/30 text-teal-700 dark:text-teal-300 border-0"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                              Read more <ArrowUpRight size={14} className="ml-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center mt-12"
              >
                <Link href="/blog" title="View all image editing tutorials and guides">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="rounded-full px-8 py-4 border-2 border-teal-200 dark:border-teal-800 hover:border-teal-300 dark:hover:border-teal-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-all duration-300"
                  >
                    <FileText className="h-5 w-5 mr-2" aria-hidden="true" />
                    View All Tutorials
                    <ArrowRight className="h-5 w-5 ml-2" aria-hidden="true" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </section>
        )}

        {/* Loading state for blog posts */}
        {loading && (
          <section className="w-full mb-24 sm:mb-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Image Editing Tutorials & Tips
                  </span>
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border bg-card overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  )
} 