'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  Eye, 
  Lock, 
  Server, 
  Cookie,
  FileText,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

export default function PrivacyContent() {
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
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-blue-500/5 to-purple-500/5"></div>
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-block mb-6 px-6 py-2 rounded-full bg-gradient-to-r from-green-500/10 to-blue-500/10 text-green-600 dark:text-green-400 font-medium text-sm">
              Privacy Policy
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Your Privacy is 
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-600"> Our Priority</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Learn how ToolsCandy protects your privacy and what data we collect (spoiler: almost none).
            </p>
            
            <div className="flex justify-center">
              <Badge variant="outline" className="text-sm px-4 py-2 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Badge>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Privacy Highlights */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-6xl mx-auto"
          >
            <Alert className="mb-12 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                <strong>Privacy First:</strong> All image processing happens locally in your browser. 
                We never upload, store, or have access to your files.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <motion.div variants={itemVariants}>
                <Card className="text-center h-full border-2 border-green-100 dark:border-green-900/30">
                  <CardContent className="p-6">
                    <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-4 rounded-xl mb-4 inline-block">
                      <Lock className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">No Data Collection</h3>
                    <p className="text-muted-foreground">
                      Your images never leave your device. Zero upload, zero storage, zero access.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="text-center h-full border-2 border-blue-100 dark:border-blue-900/30">
                  <CardContent className="p-6">
                    <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-4 rounded-xl mb-4 inline-block">
                      <Eye className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">No Tracking</h3>
                    <p className="text-muted-foreground">
                      We don't use invasive analytics or tracking cookies to monitor your behavior.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="text-center h-full border-2 border-purple-100 dark:border-purple-900/30">
                  <CardContent className="p-6">
                    <div className="bg-purple-500/10 text-purple-600 dark:text-purple-400 p-4 rounded-xl mb-4 inline-block">
                      <Shield className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Complete Control</h3>
                    <p className="text-muted-foreground">
                      You maintain full control over your data at all times. Nothing leaves your browser.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Detailed Privacy Policy */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Introduction */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    Introduction
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                  <p>
                    At ToolsCandy, we believe privacy is a fundamental right. This Privacy Policy explains 
                    how we approach data collection, usage, and protection when you use our image processing tools.
                  </p>
                  <p>
                    <strong>The short version:</strong> We designed our tools to work entirely in your browser, 
                    which means your files and personal data stay with you, always.
                  </p>
                </CardContent>
              </Card>

              {/* Data We Don't Collect */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Lock className="h-6 w-6 text-green-600 dark:text-green-400" />
                    Data We Don't Collect
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Your Images</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Personal Information</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">File Contents</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Location Data</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Device Information</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Browsing History</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Remaining sections... */}
              {/* Note: The remaining sections are abbreviated in this example */}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
} 