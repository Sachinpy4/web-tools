'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  Info, 
  Shield, 
  FileText, 
  Scale,
  Lightbulb,
  CheckCircle,
  ExternalLink,
  Clock
} from 'lucide-react'

export default function DisclaimerContent() {
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
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-red-500/5 to-purple-500/5"></div>
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-block mb-6 px-6 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-600 dark:text-orange-400 font-medium text-sm">
              Disclaimer
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Important 
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-red-600"> Information</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Please read this disclaimer carefully before using ToolsCandy's services. 
              It contains important information about the use of our tools.
            </p>
            
            <div className="flex justify-center">
              <Badge variant="outline" className="text-sm px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300">
                Last updated: <span suppressHydrationWarning>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </Badge>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Alert className="mb-12 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/20">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-800 dark:text-orange-200 font-medium">
                <strong>Important:</strong> Always backup your original files before processing. 
                Use our tools responsibly and ensure you have rights to any images you process.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="text-center h-full border-2 border-red-100 dark:border-red-900/30">
                  <CardContent className="p-6">
                    <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl mb-4 inline-block">
                      <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Use at Own Risk</h3>
                    <p className="text-muted-foreground">
                      Our tools are provided "as is" without warranties. Users assume all risks.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Additional sections abbreviated */}
              {/* Note: This is a simplified version to save space */}
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Disclaimer */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* General Disclaimer */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    General Disclaimer
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                  <p>
                    The information and tools provided by ToolsCandy are for general informational and 
                    utility purposes only. While we strive to provide accurate and reliable image processing 
                    tools, we make no representations or warranties of any kind about the completeness, 
                    accuracy, reliability, suitability, or availability of our services.
                  </p>
                </CardContent>
              </Card>

              {/* Additional cards abbreviated */}
              {/* Note: This is a simplified version to save space */}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
} 