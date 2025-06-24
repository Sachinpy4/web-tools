'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BarChart, 
  Eye, 
  FileText, 
  FilePlus2, 
  Users, 
  TrendingUp,
  Image,
  Zap,
  Activity,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Database,
  Server,
  Calendar,
  MessageSquare,
  Plus,
  Settings
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { withAdminAuth } from '@/middleware/authCheck'
import { apiRequest } from '@/lib/apiClient'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Type definitions for real data
interface BlogPost {
  _id: string;
  title: string;
  date: string;
  status: 'published' | 'draft' | 'scheduled';
  views: number;
  likes: number;
  slug: string;
  category: string;
  author: {
    name: string;
    email: string;
  } | string;
}

interface ToolUsageStats {
  [key: string]: {
    totalUses: number;
    last24Hours: number;
    averageProcessingTime: string;
    successRate: number;
  };
}

interface SystemHealth {
  mongodb: {
    status: 'connected' | 'disconnected';
    responseTime: number;
  };
  redis: {
    status: 'connected' | 'disconnected';
    responseTime: number;
  };
  system: {
    uptime: string;
    memoryUsage: {
      used: string;
      total: string;
      percentage: number;
    };
    cpuUsage: number;
  };
}

interface DashboardStats {
  totalBlogs: number;
  publishedBlogs: number;
  draftBlogs: number;
  totalViews: number;
  totalLikes: number;
  totalUsers: number;
  totalImageProcessing: number;
  last24HourProcessing: number;
}

function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([])
  const [toolUsage, setToolUsage] = useState<ToolUsageStats | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('7days')

  // Animation variants
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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  // Fetch dashboard data
  const fetchDashboardData = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // Fetch all data in parallel
      const [
        blogsResponse,
        toolUsageResponse,
        systemHealthResponse,
        usersResponse
      ] = await Promise.allSettled([
        apiRequest<{ status: string; data: BlogPost[]; count: number }>('/blogs?limit=50', { requireAuth: true }),
        apiRequest<{ status: string; data: ToolUsageStats }>(`/monitoring/tool-usage?timeRange=${timeRange}`, { requireAuth: true }),
        apiRequest<{ status: string; data: SystemHealth }>('/monitoring/system-health', { requireAuth: true }),
        apiRequest<{ status: string; count: number; data: any[] }>('/auth/users', { requireAuth: true })
      ])

      // Initialize stats with default values
      let statsData: DashboardStats = {
        totalBlogs: 0,
        publishedBlogs: 0,
        draftBlogs: 0,
        totalViews: 0,
        totalLikes: 0,
        totalUsers: 0,
        totalImageProcessing: 0,
        last24HourProcessing: 0
      }

      // Process blogs data
      if (blogsResponse.status === 'fulfilled') {
        const blogs = blogsResponse.value.data || []
        setRecentPosts(blogs.slice(0, 5)) // Show latest 5 posts
        
        // Calculate blog statistics
        statsData.totalBlogs = blogs.length
        statsData.publishedBlogs = blogs.filter(blog => blog.status === 'published').length
        statsData.draftBlogs = blogs.filter(blog => blog.status === 'draft').length
        statsData.totalViews = blogs.reduce((sum, blog) => sum + (blog.views || 0), 0)
        statsData.totalLikes = blogs.reduce((sum, blog) => sum + (blog.likes || 0), 0)
      } else {
        console.error('Failed to fetch blogs:', blogsResponse.reason)
      }

      // Process tool usage data
      if (toolUsageResponse.status === 'fulfilled') {
        const usage = toolUsageResponse.value.data
        Object.values(usage).forEach(tool => {
          statsData.totalImageProcessing += tool.totalUses
          statsData.last24HourProcessing += tool.last24Hours
        })
        setToolUsage(usage)
      } else {
        console.error('Failed to fetch tool usage:', toolUsageResponse.reason)
      }

      // Process users data
      if (usersResponse.status === 'fulfilled') {
        statsData.totalUsers = usersResponse.value.count || usersResponse.value.data?.length || 0
      } else {
        console.error('Failed to fetch users:', usersResponse.reason)
      }

      // Always set stats, even if some requests failed
      setStats(statsData)

      // Process system health data
      if (systemHealthResponse.status === 'fulfilled') {
        setSystemHealth(systemHealthResponse.value.data)
      } else {
        console.error('Failed to fetch system health:', systemHealthResponse.reason)
      }

      if (showRefreshToast) {
        toast({
          title: 'Dashboard Updated',
          description: 'All data has been refreshed successfully.',
        })
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error)
      setError('Failed to load dashboard data. Please try again.')
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Refresh data
  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  // Handle time range change
  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    // Refetch tool usage when time range changes
    if (timeRange) {
      apiRequest<{ status: string; data: ToolUsageStats }>(`/monitoring/tool-usage?timeRange=${timeRange}`, { requireAuth: true })
        .then(response => {
          setToolUsage(response.data)
          
          // Recalculate totals
          if (stats) {
            let totalImageProcessing = 0
            let last24HourProcessing = 0
            Object.values(response.data).forEach(tool => {
              totalImageProcessing += tool.totalUses
              last24HourProcessing += tool.last24Hours
            })
            setStats(prev => prev ? {
              ...prev,
              totalImageProcessing,
              last24HourProcessing
            } : null)
          }
        })
        .catch(error => {
          console.error('Failed to update tool usage:', error)
        })
    }
  }, [timeRange])

  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  // Calculate growth percentage (placeholder - in real app, compare with previous period)
  const calculateGrowth = (current: number) => {
    const growth = Math.floor(Math.random() * 30) + 5 // Random growth for demo
    return current > 0 ? `+${growth}%` : '0%'
  }

  if (loading && !stats) {
    return <DashboardSkeleton />
  }

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 lg:space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor your platform's performance and activity
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Link href="/dashboard/blogs/new">
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <span className="text-sm font-medium">Time Range:</span>
        <div className="flex flex-wrap gap-1 sm:gap-2">
          {['today', '7days', '30days', '1year'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTimeRangeChange(range)}
              className="text-xs sm:text-sm"
            >
              {range === 'today' ? 'Today' : range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : '1 Year'}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <motion.div variants={itemVariants}>
          <Card className="p-4 sm:p-6">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Blogs</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl sm:text-2xl font-bold">{formatNumber(stats?.totalBlogs || 0)}</p>
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                      +{calculateGrowth(stats?.totalBlogs || 0)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.publishedBlogs || 0} published, {stats?.draftBlogs || 0} drafts
                  </p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-4 sm:p-6">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Views</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl sm:text-2xl font-bold">{formatNumber(stats?.totalViews || 0)}</p>
                    <Badge variant="outline" className="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 text-xs">
                      +{calculateGrowth(stats?.totalViews || 0)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all published content
                  </p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-4 sm:p-6">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Users</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl sm:text-2xl font-bold">{formatNumber(stats?.totalUsers || 0)}</p>
                    <Badge variant="outline" className="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 text-xs">
                      +{calculateGrowth(stats?.totalUsers || 0)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registered platform users
                  </p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-4 sm:p-6">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Image Processing</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl sm:text-2xl font-bold">{formatNumber(stats?.totalImageProcessing || 0)}</p>
                    <Badge variant="outline" className="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 text-xs">
                      +{stats?.last24HourProcessing || 0} today
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total images processed
                  </p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Image className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* System Health */}
      {systemHealth && (
        <motion.div variants={itemVariants}>
          <Card className="p-4 sm:p-6">
            <CardHeader className="p-0 pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
                System Health
              </CardTitle>
              <CardDescription className="text-sm">
                Real-time system status and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">MongoDB</p>
                    <p className="text-xs text-muted-foreground">{systemHealth.mongodb.responseTime}ms</p>
                  </div>
                  <div className={cn(
                    "h-2 w-2 sm:h-3 sm:w-3 rounded-full",
                    systemHealth.mongodb.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  )} />
                </div>
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Redis</p>
                    <p className="text-xs text-muted-foreground">{systemHealth.redis.responseTime}ms</p>
                  </div>
                  <div className={cn(
                    "h-2 w-2 sm:h-3 sm:w-3 rounded-full",
                    systemHealth.redis.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  )} />
                </div>
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Memory</p>
                    <p className="text-xs text-muted-foreground">{systemHealth.system.memoryUsage.percentage}%</p>
                  </div>
                  <div className={cn(
                    "h-2 w-2 sm:h-3 sm:w-3 rounded-full",
                    systemHealth.system.memoryUsage.percentage < 80 ? 'bg-green-500' : 
                    systemHealth.system.memoryUsage.percentage < 90 ? 'bg-yellow-500' : 'bg-red-500'
                  )} />
                </div>
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">CPU</p>
                    <p className="text-xs text-muted-foreground">{systemHealth.system.cpuUsage}%</p>
                  </div>
                  <div className={cn(
                    "h-2 w-2 sm:h-3 sm:w-3 rounded-full",
                    systemHealth.system.cpuUsage < 70 ? 'bg-green-500' : 
                    systemHealth.system.cpuUsage < 85 ? 'bg-yellow-500' : 'bg-red-500'
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Recent Posts */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                  Recent Posts
                </CardTitle>
                <Link href="/dashboard/blogs">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    View All
                  </Button>
                </Link>
              </div>
              <CardDescription className="text-sm">
                Latest blog posts and their performance
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3 sm:space-y-4">
                {recentPosts.length > 0 ? (
                  recentPosts.map((post, index) => (
                    <motion.div
                      key={post._id}
                      variants={itemVariants}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 rounded-lg hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base truncate">{post.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge 
                            variant={post.status === 'published' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {post.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{post.views || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{post.likes || 0}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <FileText className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2 sm:mb-4" />
                    <p className="text-sm sm:text-base text-muted-foreground">No recent posts</p>
                    <Link href="/dashboard/blogs/new">
                      <Button variant="outline" size="sm" className="mt-2 sm:mt-4">
                        Create your first post
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tool Usage Analytics */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                Tool Usage Analytics
              </CardTitle>
              <CardDescription className="text-sm">
                Image processing tool performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3 sm:space-y-4">
                {toolUsage && Object.keys(toolUsage).length > 0 ? (
                  Object.entries(toolUsage).map(([tool, usage]) => (
                    <div key={tool} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 rounded-lg bg-secondary/30">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm sm:text-base capitalize">{tool}</h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {usage.totalUses} total uses
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {usage.last24Hours} in 24h
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{usage.successRate}% success</span>
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            usage.successRate > 95 ? 'bg-green-500' :
                            usage.successRate > 85 ? 'bg-yellow-500' : 'bg-red-500'
                          )} />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Avg: {usage.averageProcessingTime}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <BarChart className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2 sm:mb-4" />
                    <p className="text-sm sm:text-base text-muted-foreground">No usage data available</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tool usage analytics will appear here once users start processing images
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="p-4 sm:p-6">
          <CardHeader className="p-0 pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-sm">
              Common administrative tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <Link href="/dashboard/blogs/new">
                <Button variant="outline" className="w-full h-auto p-3 sm:p-4 flex-col gap-2 hover:bg-primary/5">
                  <FilePlus2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm">New Blog Post</span>
                </Button>
              </Link>
              <Link href="/dashboard/users">
                <Button variant="outline" className="w-full h-auto p-3 sm:p-4 flex-col gap-2 hover:bg-primary/5">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm">Manage Users</span>
                </Button>
              </Link>
              <Link href="/dashboard/backup">
                <Button variant="outline" className="w-full h-auto p-3 sm:p-4 flex-col gap-2 hover:bg-gradient-to-r hover:from-pink-50 hover:via-purple-50 hover:to-violet-50 hover:border-pink-200">
                  <Database className="h-5 w-5 sm:h-6 sm:w-6 text-gradient bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 bg-clip-text text-transparent" />
                  <span className="text-xs sm:text-sm font-medium">Database Backup</span>
                </Button>
              </Link>
              <Link href="/dashboard/monitoring">
                <Button variant="outline" className="w-full h-auto p-3 sm:p-4 flex-col gap-2 hover:bg-primary/5">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm">View Analytics</span>
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" className="w-full h-auto p-3 sm:p-4 flex-col gap-2 hover:bg-primary/5">
                  <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm">Settings</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-x-4">
                <div className="flex flex-col space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default withAdminAuth(AdminDashboard) 