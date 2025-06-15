'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Target, 
  Users, 
  Zap, 
  Shield, 
  Globe, 
  Award,
  Lightbulb,
  Heart
} from 'lucide-react'

export default function AboutContent() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-teal-500/5"></div>
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-block mb-6 px-6 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400 font-medium text-sm">
              About ToolsCandy
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Making Image Processing 
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600"> Sweet & Simple</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              We believe powerful tools should be accessible to everyone. That's why we created ToolsCandy - 
              a collection of free, fast, and privacy-focused image processing tools that work right in your browser.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto"
          >
            <motion.div variants={itemVariants}>
              <Card className="h-full border-2 border-purple-100 dark:border-purple-900/30 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/10">
                <CardContent className="p-8">
                  <div className="bg-purple-500/10 text-purple-600 dark:text-purple-400 p-3 rounded-xl mb-6 inline-block">
                    <Target className="h-8 w-8" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    To democratize professional image processing by providing free, powerful, and user-friendly tools 
                    that respect your privacy and work seamlessly across all devices.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="h-full border-2 border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10">
                <CardContent className="p-8">
                  <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 rounded-xl mb-6 inline-block">
                    <Lightbulb className="h-8 w-8" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    A world where everyone has access to professional-grade image processing tools without 
                    compromising on privacy, speed, or quality.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">What Drives Us</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our core values shape every tool we build and every decision we make
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto"
          >
            <motion.div variants={itemVariants}>
              <Card className="text-center p-6 h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-purple-200 dark:hover:border-purple-800">
                <CardContent className="p-4">
                  <div className="bg-purple-500/10 text-purple-600 dark:text-purple-400 p-4 rounded-xl mb-4 inline-block">
                    <Shield className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Privacy First</h3>
                  <p className="text-muted-foreground">
                    Your images never leave your device. All processing happens locally in your browser.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="text-center p-6 h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200 dark:hover:border-blue-800">
                <CardContent className="p-4">
                  <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-4 rounded-xl mb-4 inline-block">
                    <Zap className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
                  <p className="text-muted-foreground">
                    Optimized algorithms and modern web technologies for instant results.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="text-center p-6 h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-teal-200 dark:hover:border-teal-800">
                <CardContent className="p-4">
                  <div className="bg-teal-500/10 text-teal-600 dark:text-teal-400 p-4 rounded-xl mb-4 inline-block">
                    <Globe className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Accessible</h3>
                  <p className="text-muted-foreground">
                    Free tools that work on any device, anywhere, without registration or downloads.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="text-center p-6 h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-amber-200 dark:hover:border-amber-800">
                <CardContent className="p-4">
                  <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-4 rounded-xl mb-4 inline-block">
                    <Award className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Quality</h3>
                  <p className="text-muted-foreground">
                    Professional-grade results with advanced algorithms and quality preservation.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Story</h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-2 border-gray-100 dark:border-gray-800">
                <CardContent className="p-8 md:p-12">
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    <p className="text-xl leading-relaxed mb-6">
                      ToolsCandy was born from a simple frustration: why should you need to upload your personal images 
                      to unknown servers just to resize, compress, or convert them?
                    </p>
                    
                    <p className="text-lg leading-relaxed mb-6">
                      As developers and content creators ourselves, we found ourselves constantly searching for reliable, 
                      fast image processing tools that didn't compromise on privacy. Most solutions required file uploads, 
                      registration, or had limitations that got in the way of productivity.
                    </p>
                    
                    <p className="text-lg leading-relaxed mb-6">
                      So we built what we wanted to use: a comprehensive suite of image tools that work entirely in your 
                      browser, require no registration, and deliver professional results instantly. We call it ToolsCandy 
                      because working with images should be sweet, not bitter.
                    </p>
                    
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-xl mt-8">
                      <div className="flex items-center gap-3 mb-4">
                        <Heart className="h-6 w-6 text-red-500" />
                        <span className="font-semibold text-lg">Made with passion</span>
                      </div>
                      <p className="text-muted-foreground">
                        Every line of code, every algorithm, and every pixel of our interface is crafted with care 
                        to give you the best possible experience.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Trusted Worldwide</h2>
              <p className="text-xl text-muted-foreground">
                Join thousands of users who trust ToolsCandy for their image processing needs
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-purple-600 dark:text-purple-400 mb-2">100K+</div>
                <div className="text-muted-foreground font-medium">Images Processed</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">50+</div>
                <div className="text-muted-foreground font-medium">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-teal-600 dark:text-teal-400 mb-2">0</div>
                <div className="text-muted-foreground font-medium">Data Stored</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-amber-600 dark:text-amber-400 mb-2">24/7</div>
                <div className="text-muted-foreground font-medium">Available</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
} 