'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Scale, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Users,
  Gavel,
  Info,
  Globe,
  Clock
} from 'lucide-react'

export default function TermsContent() {
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
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-blue-500/5 to-purple-500/5"></div>
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-block mb-6 px-6 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-blue-500/10 text-amber-600 dark:text-amber-400 font-medium text-sm">
              Terms of Service
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Fair Terms for 
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-blue-600"> Everyone</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Clear, simple terms that protect both you and ToolsCandy while ensuring the best possible experience.
            </p>
            
            <div className="flex justify-center">
              <Badge variant="outline" className="text-sm px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                Last updated: <span suppressHydrationWarning>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </Badge>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Alert className="mb-12 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200 font-medium">
                <strong>Quick Summary:</strong> Use our tools responsibly, respect others, and we'll provide 
                you with free, high-quality image processing services.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="text-center h-full border-2 border-green-100 dark:border-green-900/30">
                  <CardContent className="p-6">
                    <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-4 rounded-xl mb-4 inline-block">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Free to Use</h3>
                    <p className="text-muted-foreground">
                      All our image processing tools are completely free with no hidden fees or limitations.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Additional content components... */}
              {/* Note: Additional components are abbreviated to save space */}
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Terms */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Acceptance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    Acceptance of Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                  <p>
                    By accessing and using ToolsCandy, you agree to be bound by these Terms of Service. 
                    If you do not agree to these terms, please do not use our services.
                  </p>
                </CardContent>
              </Card>

              {/* Additional cards... */}
              {/* Note: Additional cards are abbreviated to save space */}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
} 