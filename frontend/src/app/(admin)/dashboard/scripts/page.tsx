'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/apiClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Code, 
  Monitor, 
  Smartphone,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Script {
  _id: string
  name: string
  description?: string
  content: string
  placement: 'head' | 'body' | 'footer'
  isActive: boolean
  platform: string
  priority: number
  targetPages: string[]
  excludePages: string[]
  createdAt: string
  updatedAt: string
}

const PLATFORMS = [
  'Google Analytics',
  'Google Tag Manager',
  'Facebook Pixel',
  'Google Ads',
  'LinkedIn Insight',
  'Twitter Pixel',
  'TikTok Pixel',
  'Hotjar',
  'Mixpanel',
  'Custom'
]

const PLACEMENTS = [
  { value: 'head', label: 'Head', description: 'Load before page content (recommended for tracking)' },
  { value: 'body', label: 'Body', description: 'Load with page content' },
  { value: 'footer', label: 'Footer', description: 'Load after page content (recommended for widgets)' }
]

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingScript, setEditingScript] = useState<Script | null>(null)
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set())
  const [testResults, setTestResults] = useState<{[key: string]: any}>({})
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    placement: 'head' as 'head' | 'body' | 'footer',
    platform: 'Custom',
    priority: 100,
    targetPages: '',
    excludePages: '/admin,/dashboard,/api',
    isActive: true
  })

  // Fetch scripts
  const fetchScripts = async () => {
    try {
      const response = await apiRequest<{status: string; data: Script[]}>('/scripts', {
        requireAuth: true
      })
      
      if (response.status === 'success') {
        setScripts(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching scripts:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch scripts',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScripts()
  }, [])

  // Test script system functionality
  const testScriptSystem = async () => {
    try {
      const testPath = '/'
      const results: {[key: string]: any} = {}
      
      // Test each placement
      for (const placement of ['head', 'body', 'footer']) {
        console.log(`Testing ${placement} scripts...`)
        
        const response = await apiRequest<{status: string; data: Script[]}>(
          `/scripts/public?pathname=${encodeURIComponent(testPath)}&placement=${placement}`,
          {
            requireAuth: false,
            noRedirect: true
          }
        )
        
        results[placement] = {
          success: response.status === 'success',
          count: response.data?.length || 0,
          scripts: response.data?.map(s => ({
            platform: s.platform,
            priority: s.priority,
            hasGTM: s.content.includes('GTM-'),
            hasFacebookPixel: s.content.includes('fbq') || s.platform === 'Facebook Pixel',
            hasGoogleAnalytics: s.content.includes('gtag') || s.platform === 'Google Analytics',
            hasScript: s.content.includes('<script'),
            isActive: s.isActive
          })) || []
        }
      }
      
      setTestResults(results)
      
      // Count total tracking scripts
      const totalScripts = Object.values(results).reduce((sum: number, r: any) => sum + r.count, 0)
      const trackingPlatforms = new Set()
      
      Object.values(results).forEach((r: any) => {
        r.scripts.forEach((s: any) => {
          if (s.hasGTM) trackingPlatforms.add('GTM')
          if (s.hasFacebookPixel) trackingPlatforms.add('Facebook Pixel')  
          if (s.hasGoogleAnalytics) trackingPlatforms.add('Google Analytics')
          if (!s.hasGTM && !s.hasFacebookPixel && !s.hasGoogleAnalytics) trackingPlatforms.add(s.platform)
        })
      })
      
      toast({
        title: 'Test Complete',
        description: `Found ${totalScripts} scripts across ${trackingPlatforms.size} platforms. Check console for details.`,
        variant: 'default'
      })
      
      console.log('📊 Script System Test Results:', results)
      console.log('🎯 Detected Platforms:', Array.from(trackingPlatforms))
      
    } catch (error) {
      console.error('Test failed:', error)
      toast({
        title: 'Test Failed',
        description: 'Could not test script system',
        variant: 'destructive'
      })
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const endpoint = editingScript ? `/scripts/${editingScript._id}` : '/scripts'
      const method = editingScript ? 'PUT' : 'POST'
      
      const payload = {
        ...formData,
        targetPages: formData.targetPages ? formData.targetPages.split(',').map(p => p.trim()) : [],
        excludePages: formData.excludePages ? formData.excludePages.split(',').map(p => p.trim()) : ['/admin', '/api']
      }

      const response = await apiRequest<{status: string; data: Script}>(endpoint, {
        method,
        requireAuth: true,
        body: payload
      })

      toast({
        title: 'Success',
        description: `Script ${editingScript ? 'updated' : 'created'} successfully`
      })
      setIsDialogOpen(false)
      resetForm()
      fetchScripts()
    } catch (error: any) {
      console.error('Error saving script:', error)
      toast({
        title: 'Error',
        description: error.message || `Failed to ${editingScript ? 'update' : 'create'} script`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      placement: 'head',
      platform: 'Custom',
      priority: 100,
      targetPages: '',
      excludePages: '/admin,/dashboard,/api',
      isActive: true
    })
    setEditingScript(null)
  }

  // Handle edit
  const handleEdit = (script: Script) => {
    setFormData({
      name: script.name,
      description: script.description || '',
      content: script.content,
      placement: script.placement,
      platform: script.platform,
      priority: script.priority,
      targetPages: script.targetPages.join(', '),
      excludePages: script.excludePages.join(', '),
      isActive: script.isActive
    })
    setEditingScript(script)
    setIsDialogOpen(true)
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/scripts/${id}`, {
        method: 'DELETE',
        requireAuth: true
      })

      toast({
        title: 'Success',
        description: 'Script deleted successfully'
      })
      fetchScripts()
    } catch (error) {
      console.error('Error deleting script:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete script',
        variant: 'destructive'
      })
    }
  }

  // Toggle script status
  const handleToggleStatus = async (id: string) => {
    try {
      await apiRequest(`/scripts/${id}/toggle`, {
        method: 'PATCH',
        requireAuth: true
      })

      toast({
        title: 'Success',
        description: 'Script status updated'
      })
      fetchScripts()
    } catch (error) {
      console.error('Error toggling script status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update script status',
        variant: 'destructive'
      })
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedScripts)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedScripts(newExpanded)
  }

  const getPlacementIcon = (placement: string) => {
    switch (placement) {
      case 'head': return <Monitor className="h-4 w-4" />
      case 'body': return <Smartphone className="h-4 w-4" />
      case 'footer': return <Code className="h-4 w-4" />
      default: return <Code className="h-4 w-4" />
    }
  }

  const getPlacementColor = (placement: string) => {
    switch (placement) {
      case 'head': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'body': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'footer': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dynamic Scripts</h1>
          <p className="text-muted-foreground mt-2">
            Manage analytics scripts, tracking codes, and custom JavaScript for your website.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={testScriptSystem}
            disabled={loading}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Test System
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Script
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingScript ? 'Edit Script' : 'Add New Script'}</DialogTitle>
                <DialogDescription>
                  {editingScript ? 'Update the script configuration' : 'Add a new tracking script or analytics code'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Script Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g., Google Analytics"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select value={formData.platform} onValueChange={(value) => setFormData({...formData, platform: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(platform => (
                          <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description of what this script does"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Script Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Paste your script here (HTML with <script> tags or pure JavaScript)"
                    className="min-h-[120px] font-mono text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="placement">Placement *</Label>
                    <Select value={formData.placement} onValueChange={(value: any) => setFormData({...formData, placement: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLACEMENTS.map(placement => (
                          <SelectItem key={placement.value} value={placement.value}>
                            <div>
                              <div className="flex items-center gap-2">
                                {getPlacementIcon(placement.value)}
                                {placement.label}
                              </div>
                              <div className="text-xs text-muted-foreground">{placement.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority (1-1000)</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 100})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetPages">Target Pages (optional)</Label>
                  <Input
                    id="targetPages"
                    value={formData.targetPages}
                    onChange={(e) => setFormData({...formData, targetPages: e.target.value})}
                    placeholder="/, /blog, /tools (comma-separated, leave empty for all public pages)"
                  />
                  <p className="text-xs text-muted-foreground">Specific pages to target. Leave empty to target all public pages.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excludePages">Exclude Pages</Label>
                  <Input
                    id="excludePages"
                    value={formData.excludePages}
                    onChange={(e) => setFormData({...formData, excludePages: e.target.value})}
                    placeholder="/admin, /api"
                  />
                  <p className="text-xs text-muted-foreground">Pages to exclude (admin and API pages are always excluded)</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                  />
                  <Label htmlFor="isActive">Enable script</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : editingScript ? 'Update Script' : 'Add Script'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Scripts List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Scripts ({scripts.length})</CardTitle>
          <CardDescription>
            All scripts are automatically excluded from admin pages (/admin/*, /dashboard/*) for security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading scripts...</div>
          ) : scripts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scripts configured yet.</p>
              <p className="text-sm">Add your first tracking script or analytics code.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scripts.map((script) => (
                <Card key={script._id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold truncate">{script.name}</h3>
                          <Badge className={getPlacementColor(script.placement)}>
                            <div className="flex items-center gap-1">
                              {getPlacementIcon(script.placement)}
                              {script.placement}
                            </div>
                          </Badge>
                          <Badge variant="outline">{script.platform}</Badge>
                          <Badge variant={script.isActive ? "default" : "secondary"}>
                            {script.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        {script.description && (
                          <p className="text-sm text-muted-foreground mb-2">{script.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Priority: {script.priority}</span>
                          <span>Created: {new Date(script.createdAt).toLocaleDateString()}</span>
                          {script.targetPages.length > 0 && (
                            <span>Target: {script.targetPages.slice(0, 2).join(', ')}{script.targetPages.length > 2 ? '...' : ''}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(script._id)}
                        >
                          {expandedScripts.has(script._id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(script._id)}
                        >
                          {script.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(script)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Script</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{script.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(script._id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    
                    {expandedScripts.has(script._id) && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">SCRIPT CONTENT</Label>
                            <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto max-h-32">
                              {script.content.length > 300 ? script.content.substring(0, 300) + '...' : script.content}
                            </pre>
                          </div>
                          
                          {script.targetPages.length > 0 && (
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">TARGET PAGES</Label>
                              <p className="text-xs mt-1">{script.targetPages.join(', ')}</p>
                            </div>
                          )}
                          
                          {script.excludePages.length > 0 && (
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">EXCLUDED PAGES</Label>
                              <p className="text-xs mt-1">{script.excludePages.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-200">Security Notice</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Scripts are automatically excluded from all admin pages (/admin/*, /dashboard/*) and API endpoints (/api/*) for security. 
                Only public pages will load the configured scripts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 