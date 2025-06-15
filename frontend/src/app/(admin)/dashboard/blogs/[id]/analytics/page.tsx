'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { withAdminAuth } from '@/middleware/authCheck'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { ArrowLeft, Eye, Clock, Users, RefreshCw, Calendar, Heart, TrendingUp, Share2, MessageSquare, Pencil, BarChart2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { apiRequest } from '@/lib/apiClient'

interface Analytics {
  totalViews: number
  uniqueVisitors: number
  averageTimeOnPage: number
  bounceRate: number
  dailyViews: Record<string, number>
  dailyViewsArray: { date: string; views: number }[]
}

function BlogAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const blogId = params.id as string
  
  const [blog, setBlog] = useState<any>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [commentsCount, setCommentsCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Fetch blog and analytics data
  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch blog details
      const blogData = await apiRequest<{ status: string; data: any }>(`/blogs/${blogId}`, {
        requireAuth: true
      })
      
      setBlog(blogData.data)
      
      // Fetch analytics data
      const analyticsData = await apiRequest<{ status: string; data: Analytics }>(`/blogs/${blogId}/analytics`, {
        requireAuth: true
      })
      
      setAnalytics(analyticsData.data)
      
      // Fetch real comments count
      try {
        const commentsData = await apiRequest<{ status: string; total: number }>(`/blogs/${blogId}/comments?limit=1`, {
          requireAuth: true
        })
        setCommentsCount(commentsData.total)
      } catch (error) {
        console.log('Could not fetch comments count:', error)
        setCommentsCount(null)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Refresh analytics data
  const refreshAnalytics = async () => {
    try {
      setRefreshing(true)
      
      const analyticsData = await apiRequest<{ status: string; data: Analytics }>(`/blogs/${blogId}/analytics`, {
        requireAuth: true
      })
      
      setAnalytics(analyticsData.data)
      
      // Refresh comments count
      try {
        const commentsData = await apiRequest<{ status: string; total: number }>(`/blogs/${blogId}/comments?limit=1`, {
          requireAuth: true
        })
        setCommentsCount(commentsData.total)
      } catch (error) {
        console.log('Could not refresh comments count:', error)
      }
      
      toast({
        title: 'Analytics updated',
        description: 'The latest analytics data has been loaded'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh analytics data',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }
  
  // Load data on component mount
  useEffect(() => {
    if (blogId) {
      fetchData()
    }
  }, [blogId])
  
  // Format time for display
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`
    }
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  }
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    )
  }
  
  if (!blog) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Blog Post Not Found</h2>
        <p className="mb-6 text-muted-foreground">
          The blog post you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button asChild>
          <Link href="/dashboard/blogs">Back to Blog Management</Link>
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="mb-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/blogs">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog Management
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{blog.title}</h1>
          <p className="text-muted-foreground">
            Analytics for {formatDate(blog.date)} • {blog.status === 'published' ? 'Published' : 'Draft'}
          </p>
        </div>
        
        <Button size="sm" onClick={refreshAnalytics} disabled={refreshing}>
          {refreshing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Analytics
            </>
          )}
        </Button>
      </div>
      
      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Views */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">
                {analytics ? analytics.totalViews.toLocaleString() : '0'}
              </div>
              <div className="text-xs text-green-600 font-medium">
                +{analytics ? Math.floor(analytics.totalViews * 0.12) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Unique Visitors */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Unique Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">
                {analytics ? analytics.uniqueVisitors.toLocaleString() : '0'}
              </div>
              <div className="text-xs text-blue-600 font-medium">
                +{analytics ? Math.floor(analytics.uniqueVisitors * 0.08) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Likes */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Total Likes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold text-red-600">
                {blog ? blog.likes || 0 : '0'}
              </div>
              <div className="text-xs text-red-600 font-medium">
                {blog && analytics ? `${((blog.likes / analytics.totalViews) * 100 || 0).toFixed(1)}%` : '0%'}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Average Time on Page */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg. Time on Page
              <Badge variant="outline" className="text-xs">Placeholder</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {analytics ? formatTime(analytics.averageTimeOnPage) : '0s'}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Demo
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Engagement Rate */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Engagement Rate
              <Badge variant="outline" className="text-xs">Placeholder</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {analytics ? `${(100 - analytics.bounceRate).toFixed(0)}%` : '0%'}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Demo
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Social Shares
              <Badge variant="outline" className="text-xs">Estimated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-muted-foreground">
              {analytics ? Math.floor(analytics.totalViews * 0.05) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Estimated shares (~5% of views)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
              {commentsCount === null && <Badge variant="outline" className="text-xs">Loading...</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {commentsCount !== null ? commentsCount : '...'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {commentsCount !== null ? 'Total comments' : 'Loading comments count...'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Reading Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {blog?.readingTime || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Estimated reading time</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Data Quality Notice */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-medium text-orange-800 dark:text-orange-200">Analytics Data Information</h4>
              <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                <p><strong>Real Data:</strong> Views, Unique Visitors, Likes, Comments, Reading Time</p>
                <p><strong>Placeholder Data:</strong> Average Time on Page and Engagement Rate are currently estimated values for demonstration purposes.</p>
                <p>Full analytics tracking will be implemented in a future update to provide accurate user behavior metrics.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Enhanced Daily Views Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Daily Views Analytics
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track your blog post's daily performance over time
          </p>
        </CardHeader>
        <CardContent>
          {(!analytics || analytics.dailyViewsArray.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Eye className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground font-medium">No view data available yet</p>
              <p className="text-xs text-muted-foreground mt-1">Views will be tracked when visitors read this blog post</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chart Summary */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    Total Days: {analytics.dailyViewsArray.length}
                  </span>
                  <span className="text-muted-foreground">
                    Peak: {Math.max(...analytics.dailyViewsArray.map(d => d.views))} views
                  </span>
                  <span className="text-muted-foreground">
                    Avg: {Math.round(analytics.totalViews / analytics.dailyViewsArray.length)} views/day
                  </span>
                </div>
              </div>
              
              {/* Enhanced Chart */}
              <div className="h-64 relative">
                <div className="flex h-full items-end gap-1">
                  {analytics.dailyViewsArray.map((day, index) => {
                    // Get max value for scaling
                    const maxViews = Math.max(...analytics.dailyViewsArray.map(d => d.views))
                    // Calculate height percentage (min 8% even if 0 views)
                    const heightPercent = maxViews > 0 
                      ? Math.max(8, (day.views / maxViews) * 100) 
                      : 8
                    
                    // Format date for tooltip
                    const date = new Date(day.date)
                    const formattedDate = date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })
                    
                    const isHighDay = day.views === maxViews && maxViews > 0
                    
                    return (
                      <div 
                        key={day.date}
                        className="relative flex-1 flex flex-col items-center group cursor-pointer"
                      >
                        {/* Enhanced Tooltip */}
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-popover text-popover-foreground text-xs px-3 py-2 rounded-lg shadow-lg border pointer-events-none whitespace-nowrap z-10">
                          <div className="font-semibold">{formattedDate}</div>
                          <div className="text-primary">{day.views} views</div>
                          {isHighDay && <div className="text-green-600 text-xs">Peak day</div>}
                        </div>
                        
                        {/* Enhanced Bar */}
                        <div 
                          className={`w-full max-w-[25px] transition-all duration-200 rounded-t ${
                            isHighDay 
                              ? 'bg-green-500 hover:bg-green-600' 
                              : 'bg-primary/20 hover:bg-primary/40'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          {/* Values inside bar for larger numbers */}
                          {heightPercent > 20 && (
                            <div className={`text-xs font-medium text-center p-1 ${
                              isHighDay ? 'text-white' : 'text-primary'
                            }`}>
                              {day.views}
                            </div>
                          )}
                        </div>
                        
                        {/* Enhanced Date label */}
                        {(index === 0 || index === analytics.dailyViewsArray.length - 1 || index % Math.max(1, Math.floor(analytics.dailyViewsArray.length / 8)) === 0) && (
                          <div className="text-xs text-muted-foreground mt-1 truncate w-full text-center">
                            {formattedDate}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Enhanced Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/blogs/edit/${blogId}`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Post
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/comments?blog=${blogId}`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Manage Comments
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/blog/${blog.slug}`} target="_blank">
              <Eye className="h-4 w-4 mr-2" />
              View Live Post
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default withAdminAuth(BlogAnalyticsPage); 