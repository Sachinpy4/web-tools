'use client'

import React, { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { useAuth } from '@/components/providers/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Shield, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Home,
  Loader2,
  KeyRound,
  Clock
} from 'lucide-react'

// Wrapper component that uses searchParams
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const { login } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [rateLimitEndTime, setRateLimitEndTime] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{email?: string, password?: string}>({})

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  const errorVariants = {
    hidden: { opacity: 0, scale: 0.95, height: 0 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      height: "auto",
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      height: 0,
      transition: { duration: 0.2 }
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Rate limit countdown timer
  useEffect(() => {
    if (!isRateLimited || !rateLimitEndTime) return

    const timer = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, rateLimitEndTime - now)
      
      if (remaining <= 0) {
        setIsRateLimited(false)
        setRateLimitEndTime(null)
        setTimeRemaining(0)
        setError('')
      } else {
        setTimeRemaining(remaining)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [isRateLimited, rateLimitEndTime])

  // Real-time validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return 'Email is required'
    if (!emailRegex.test(email)) return 'Please enter a valid email address'
    return ''
  }

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required'
    if (password.length < 6) return 'Password must be at least 6 characters'
    return ''
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    
    if (focusedField === 'email' || value.length > 0) {
      const emailError = validateEmail(value)
      setValidationErrors(prev => ({ ...prev, email: emailError }))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    
    if (focusedField === 'password' || value.length > 0) {
      const passwordError = validatePassword(value)
      setValidationErrors(prev => ({ ...prev, password: passwordError }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent multiple submissions or rate limited attempts
    if (isLoading || isRateLimited) {
      return
    }
    
    // Validate all fields
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    
    setValidationErrors({ email: emailError, password: passwordError })
    
    if (emailError || passwordError) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors below and try again.',
        variant: 'destructive',
      })
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      await login(email, password)
      
      // If we reach here, login was successful
      toast({
        title: 'Welcome Back!',
        description: 'You have been successfully logged in.',
        duration: 2000,
      })
      
      // Add a small delay for better UX
      setTimeout(() => {
        router.push(callbackUrl)
      }, 500)
      
    } catch (error: any) {
      // Handle specific security errors - check multiple possible error structures
      // The backend exception filter now returns security errors in the main response body
      const errorCode = error?.data?.code || error?.response?.data?.code;
      const errorData = error?.data || error?.response?.data || {};
      
      if (errorCode === 'ACCOUNT_LOCKED' || errorCode === 'ACCOUNT_LOCKED_AFTER_ATTEMPTS') {
        const retryAfter = errorData.retryAfter || 900
        const endTime = Date.now() + (retryAfter * 1000)
        const minutes = Math.ceil(retryAfter / 60)
        
        setIsRateLimited(true)
        setRateLimitEndTime(endTime)
        setTimeRemaining(retryAfter * 1000)
        setError(`Account temporarily locked due to multiple failed login attempts. Try again in ${minutes} minutes.`)
        
        toast({
          title: '🔒 Account Locked',
          description: `Your account has been temporarily locked after 3 failed attempts. Please try again in ${minutes} minutes.`,
          variant: 'destructive',
          duration: 10000,
        })
      } else if (errorCode === 'LOGIN_RATE_LIMIT_EXCEEDED') {
        const retryAfter = errorData.retryAfter || 900
        const endTime = Date.now() + (retryAfter * 1000)
        
        setIsRateLimited(true)
        setRateLimitEndTime(endTime)
        setTimeRemaining(retryAfter * 1000)
        setError('Too many login attempts from this IP. Please wait before trying again.')
        
        toast({
          title: '🚨 Rate Limit Exceeded',
          description: 'Too many failed attempts from this IP. Please wait before trying again.',
          variant: 'destructive',
          duration: 10000,
        })
      } else if (errorCode === 'ACCOUNT_TEMPORARILY_LOCKED') {
        const retryAfter = errorData.retryAfter || 900
        const endTime = Date.now() + (retryAfter * 1000)
        const minutes = Math.ceil(retryAfter / 60)
        
        setIsRateLimited(true)
        setRateLimitEndTime(endTime)
        setTimeRemaining(retryAfter * 1000)
        setError(`Account temporarily locked. Try again in ${minutes} minutes.`)
        
        toast({
          title: '🔒 Account Locked',
          description: `Multiple failed attempts detected. Try again in ${minutes} minutes.`,
          variant: 'destructive',
          duration: 10000,
        })
      } else if (errorCode === 'SUSPICIOUS_ACTIVITY_DETECTED') {
        setError('Request blocked due to suspicious activity.')
        toast({
          title: '🛡️ Security Alert',
          description: 'Suspicious activity detected. Please try again later.',
          variant: 'destructive',
          duration: 10000,
        })
      } else if (errorCode === 'AUTHENTICATION_FAILED' || 
                 errorCode === 'MISSING_CREDENTIALS' ||
                 errorCode === 'INVALID_EMAIL_FORMAT') {
        // Handle authentication failures
        setError('Invalid email or password. Please check your credentials and try again.')
        toast({
          title: 'Authentication Failed',
          description: 'The email or password you entered is incorrect.',
          variant: 'destructive',
          duration: 5000,
        })
      } else if (error?.status === 401) {
        // Generic 401 handling
        setError('Invalid email or password. Please check your credentials and try again.')
        toast({
          title: 'Authentication Failed',
          description: 'The email or password you entered is incorrect.',
          variant: 'destructive',
          duration: 5000,
        })
      } else if (error?.status === 429) {
        // Generic rate limiting
        const retryAfter = 900 // Default 15 minutes
        const endTime = Date.now() + (retryAfter * 1000)
        
        setIsRateLimited(true)
        setRateLimitEndTime(endTime)
        setTimeRemaining(retryAfter * 1000)
        setError('Too many requests. Please wait before trying again.')
        
        toast({
          title: '⏳ Please Wait',
          description: 'Too many requests. Please wait a moment and try again.',
          variant: 'destructive',
          duration: 8000,
        })
      } else {
        // Network or other errors
        setError('Unable to connect to the server. Please check your internet connection and try again.')
        toast({
          title: 'Connection Error',
          description: 'Unable to connect to the server. Please check your internet connection.',
          variant: 'destructive',
          duration: 5000,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = email && password && !validationErrors.email && !validationErrors.password && !isRateLimited

  // Format time remaining for display
  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!mounted) {
    return <LoginLoading />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-[10%] -right-[5%] w-72 h-72 bg-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-[20%] right-[10%] w-32 h-32 bg-pink-400/10 rounded-full blur-2xl"></div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-0 shadow-2xl shadow-black/10 backdrop-blur-sm bg-white/90 dark:bg-slate-900/90">
          <CardHeader className="space-y-4 text-center pb-8">
            <motion.div variants={itemVariants} className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Admin Portal
              </CardTitle>
              <CardDescription className="text-base mt-2 text-gray-600 dark:text-gray-400">
                Sign in to access your dashboard
              </CardDescription>
            </motion.div>

            <motion.div variants={itemVariants} className="flex justify-center">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                <KeyRound className="h-3 w-3 mr-1" />
                Secure Access
              </Badge>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div
                  variants={errorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-start space-x-3"
                >
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <p className="font-medium">Authentication Error</p>
                    <p className="mt-1">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>Email Address</span>
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="admin@example.com"
                    className={`pl-10 h-12 transition-all duration-200 ${
                      focusedField === 'email' 
                        ? 'ring-2 ring-blue-500 border-blue-500' 
                        : validationErrors.email 
                        ? 'border-red-500 ring-1 ring-red-500' 
                        : ''
                    }`}
                    required
                    disabled={isLoading || isRateLimited}
                    autoComplete="email"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  {email && !validationErrors.email && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                <AnimatePresence>
                  {validationErrors.email && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      <span>{validationErrors.email}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-gray-500" />
                  <span>Password</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    className={`pl-10 pr-12 h-12 transition-all duration-200 ${
                      focusedField === 'password' 
                        ? 'ring-2 ring-blue-500 border-blue-500' 
                        : validationErrors.password 
                        ? 'border-red-500 ring-1 ring-red-500' 
                        : ''
                    }`}
                    required
                    disabled={isLoading || isRateLimited}
                    autoComplete="current-password"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <AnimatePresence>
                  {validationErrors.password && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      <span>{validationErrors.password}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className={`w-full h-12 font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRateLimited 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/25' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-blue-500/25'
                } text-white`}
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing In...</span>
                  </div>
                ) : isRateLimited ? (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Try again in {formatTimeRemaining(timeRemaining)}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </motion.form>
          </CardContent>

          <CardFooter className="border-t bg-gray-50/50 dark:bg-slate-800/50 rounded-b-lg">
            <div className="w-full space-y-4">
              <Separator />
              
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Need access? Contact your administrator
                </p>
                
                {/* Demo credentials - in production, remove this */}
                {/* <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                    Demo Credentials:
                  </p>
                  <div className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">admin@example.com</span>
                      <span>/</span>
                      <span className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">admin123</span>
                    </div>
                  </div>
                </div> */}
              </div>

              <div className="flex items-center justify-center">
                <Link
                  href="/"
                  className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span>Back to Home</span>
                </Link>
              </div>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

// Enhanced loading component
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Loading admin portal...</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
} 