'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { 
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Plus,
  Clock,
  HardDrive,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  ArrowRight,
  Settings,
  Eye,
  PlayCircle,
  Sparkles,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { withAdminAuth } from '@/middleware/authCheck'
import { apiRequest } from '@/lib/apiClient'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

// Type definitions
interface BackupHistory {
  _id: string;
  filename: string;
  originalName?: string;
  type: 'full' | 'incremental' | 'selective';
  collections?: string[];
  size: number;
  status: 'creating' | 'completed' | 'failed' | 'deleted';
  startedAt: string;
  completedAt?: string;
  createdBy: string | { _id: string; name: string; email: string };
  description?: string;
  errorMessage?: string;
  compression?: boolean;
  encryption?: boolean;
  metadata?: {
    collections: string[];
    totalDocuments: number;
    totalSize: number;
    compression: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface RestoreHistory {
  _id: string;
  sourceBackupId?: {
    _id: string;
    filename: string;
    originalName: string;
    type: string;
  };
  sourceBackupName?: string;
  sourceType: 'existing_backup' | 'uploaded_file';
  uploadedFileName?: string;
  restoreType: 'full' | 'selective';
  collectionsRestored: string[];
  collectionsSkipped: string[];
  overwriteMode: boolean;
  safetyBackupId?: {
    _id: string;
    filename: string;
    originalName: string;
  };
  totalDocumentsRestored: number;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  restoredBy: string | { _id: string; name: string; email: string };
  description?: string;
  errorMessage?: string;
  details?: {
    backupType?: string;
    backupTimestamp?: string;
    estimatedSize?: string;
    errors?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface BackupStatus {
  recentBackups: BackupHistory[];
  storage: {
    totalSize: string;
    totalFiles: number;
    directory: string;
  };
  lastBackup: BackupHistory | null;
}

interface RestorePreview {
  backupInfo: {
    type: string;
    timestamp: string;
    version: string;
  };
  collectionsToRestore: string[];
  totalDocuments: number;
  estimatedSize: string;
}

const AVAILABLE_COLLECTIONS = [
  'blogs',
  'users', 
  'comments',
  'media',
  'systemsettings',
  'scripts',
  'pageseo',
  'schedulerconfigs'
];

function BackupManagement() {
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([])
  const [restoreHistory, setRestoreHistory] = useState<RestoreHistory[]>([])
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeOperation, setActiveOperation] = useState<string | null>(null)
  const [createBackupForm, setCreateBackupForm] = useState({
    type: 'full' as 'full' | 'incremental' | 'selective',
    collections: [] as string[],
    compress: true,
    description: ''
  })
  const [restoreForm, setRestoreForm] = useState({
    backupId: '',
    collections: [] as string[],
    overwrite: false,
    createSafetyBackup: true
  })
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

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

  // Fetch backup data
  const fetchBackupData = async (forceRefresh = false) => {
    try {
      setLoading(true)
      
      // Add timestamp to prevent caching if force refresh
      const cacheBuster = forceRefresh ? `?_t=${Date.now()}` : ''
      
      const [historyResponse, restoreHistoryResponse, statusResponse] = await Promise.allSettled([
        apiRequest<{ status: string; data: { backups: BackupHistory[] } }>(`admin/backup${cacheBuster}`, { requireAuth: true }),
        apiRequest<{ status: string; data: { restores: RestoreHistory[] } }>(`admin/backup/restore-history${cacheBuster}`, { requireAuth: true }),
        apiRequest<{ status: string; data: BackupStatus }>(`admin/backup/stats${cacheBuster}`, { requireAuth: true })
      ])

      if (historyResponse.status === 'fulfilled' && historyResponse.value.status === 'success') {
        console.log('Backup history fetched:', historyResponse.value.data.backups)
        setBackupHistory(historyResponse.value.data.backups || [])
      } else if (historyResponse.status === 'rejected') {
        console.error('Failed to fetch backup history:', historyResponse.reason)
      }

      if (restoreHistoryResponse.status === 'fulfilled' && restoreHistoryResponse.value.status === 'success') {
        console.log('Restore history fetched:', restoreHistoryResponse.value.data.restores)
        setRestoreHistory(restoreHistoryResponse.value.data.restores || [])
      } else if (restoreHistoryResponse.status === 'rejected') {
        console.error('Failed to fetch restore history:', restoreHistoryResponse.reason)
      }

      if (statusResponse.status === 'fulfilled' && statusResponse.value.status === 'success') {
        console.log('Backup status fetched:', statusResponse.value.data)
        setBackupStatus(statusResponse.value.data)
      } else if (statusResponse.status === 'rejected') {
        console.error('Failed to fetch backup status:', statusResponse.reason)
      }
    } catch (error) {
      console.error('Failed to fetch backup data:', error)
      toast({
        title: "Error",
        description: "Failed to load backup data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackupData()
  }, [])

  // Create backup
  const handleCreateBackup = async () => {
    try {
      setActiveOperation('creating')
      
      const response = await apiRequest<{ status: string; data: any }>('admin/backup', {
        method: 'POST',
        body: createBackupForm,
        requireAuth: true
      })

      if (response.status === 'success') {
        toast({
          title: "✨ Backup Created",
          description: `${createBackupForm.type} backup completed successfully!`,
        })
        
        // Reset form
        setCreateBackupForm({
          type: 'full',
          collections: [],
          compress: true,
          description: ''
        })
        
        // Refresh data
        fetchBackupData(true)
      }
    } catch (error) {
      console.error('Backup creation failed:', error)
      toast({
        title: "Error",
        description: "Failed to create backup",
        variant: "destructive"
      })
    } finally {
      setActiveOperation(null)
    }
  }

  // Delete backup
  const handleDeleteBackup = async (backupId: string) => {
    try {
      setActiveOperation(`deleting-${backupId}`)
      
      const response = await apiRequest<{ status: string }>(`admin/backup/${backupId}`, {
        method: 'DELETE',
        requireAuth: true
      })

      if (response.status === 'success') {
        toast({
          title: "🗑️ Backup Deleted",
          description: "Backup deleted successfully",
        })
        fetchBackupData(true)
      }
    } catch (error) {
      console.error('Delete failed:', error)
      toast({
        title: "Error",
        description: "Failed to delete backup",
        variant: "destructive"
      })
    } finally {
      setActiveOperation(null)
    }
  }

  // Download backup
  const handleDownloadBackup = async (backupId: string, filename: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${baseUrl}/admin/backup/${backupId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: "📥 Download Started",
          description: `Downloading ${filename}`,
        })
      } else {
        throw new Error('Download failed')
      }
    } catch (error) {
      console.error('Download failed:', error)
      toast({
        title: "Error",
        description: "Failed to download backup",
        variant: "destructive"
      })
    }
  }

  // Get restore preview
  const handleGetRestorePreview = async (backupId: string) => {
    try {
      const response = await apiRequest<{ status: string; data: RestorePreview }>(`admin/backup/restore/preview?backupId=${backupId}`, {
        requireAuth: true
      })

      if (response.status === 'success') {
        setRestorePreview(response.data)
      }
    } catch (error) {
      console.error('Preview failed:', error)
      toast({
        title: "Error",
        description: "Failed to generate restore preview",
        variant: "destructive"
      })
    }
  }

  // Restore from backup
  const handleRestoreBackup = async () => {
    try {
      setActiveOperation('restoring')
      
      const response = await apiRequest<{ status: string; data: any }>('admin/backup/restore', {
        method: 'POST',
        body: restoreForm,
        requireAuth: true
      })

      if (response.status === 'success') {
        toast({
          title: "🔄 Restore Completed",
          description: `Database restored successfully!`,
        })
        
        // Reset form and refresh data
        setRestoreForm({
          backupId: '',
          collections: [],
          overwrite: false,
          createSafetyBackup: true
        })
        setRestorePreview(null)
        // Small delay to ensure database updates are complete
        setTimeout(() => fetchBackupData(true), 500)
      }
    } catch (error) {
      console.error('Restore failed:', error)
      toast({
        title: "Error",
        description: "Database restore failed",
        variant: "destructive"
      })
    } finally {
      setActiveOperation(null)
    }
  }

  // Upload and restore
  const handleUploadRestore = async () => {
    if (!uploadFile) return

    try {
      setActiveOperation('uploading')
      
      const formData = new FormData()
      formData.append('backup', uploadFile)
      formData.append('overwrite', restoreForm.overwrite.toString())
      formData.append('createSafetyBackup', restoreForm.createSafetyBackup.toString())
      if (restoreForm.collections.length > 0) {
        formData.append('collections', restoreForm.collections.join(','))
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${baseUrl}/backup/restore/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const result = await response.json()

      if (result.status === 'success') {
        toast({
          title: "📤 Upload & Restore Completed",
          description: "Database restored from uploaded file!",
        })
        
        setUploadFile(null)
        setRestoreForm({
          backupId: '',
          collections: [],
          overwrite: false,
          createSafetyBackup: true
        })
        // Small delay to ensure database updates are complete
        setTimeout(() => fetchBackupData(true), 500)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('Upload restore failed:', error)
      toast({
        title: "Error",
        description: "Upload and restore failed",
        variant: "destructive"
      })
    } finally {
      setActiveOperation(null)
    }
  }

  // Cleanup old backups
  const handleCleanupOldBackups = async () => {
    try {
      setActiveOperation('cleaning')
      
      console.log('Starting cleanup operation...')
      
      const response = await apiRequest<{ status: string; data: { deletedCount: number; message: string } }>('/backup/cleanup', {
        method: 'POST',
        body: { retentionDays: 30 },
        requireAuth: true
      })

      console.log('Cleanup response:', response)

      if (response.status === 'success') {
        toast({
          title: "🧹 Cleanup Completed",
          description: response.data.message || `Removed ${response.data.deletedCount} old backups`,
        })
        await fetchBackupData(true)
      } else {
        console.error('Cleanup failed - non-success status:', response)
        throw new Error(response.data?.message || 'Cleanup failed')
      }
    } catch (error: any) {
      console.error('Cleanup failed with error:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      })
      
      toast({
        title: "Error",
        description: error.message || "Cleanup failed. Please check console for details.",
        variant: "destructive"
      })
    } finally {
      setActiveOperation(null)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      completed: 'default',
      creating: 'secondary',
      failed: 'destructive',
      deleted: 'outline'
    }
    
    const icons = {
      completed: <CheckCircle className="w-3 h-3" />,
      creating: <RefreshCw className="w-3 h-3 animate-spin" />,
      failed: <XCircle className="w-3 h-3" />,
      deleted: <Trash2 className="w-3 h-3" />
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="gap-1">
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  // Get restore status badge
  const getRestoreStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      completed: 'default',
      in_progress: 'secondary',
      failed: 'destructive',
      cancelled: 'outline'
    }
    
    const icons = {
      completed: <CheckCircle className="w-3 h-3" />,
      in_progress: <RefreshCw className="w-3 h-3 animate-spin" />,
      failed: <XCircle className="w-3 h-3" />,
      cancelled: <XCircle className="w-3 h-3" />
    }

    const displayStatus = status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="gap-1">
        {icons[status as keyof typeof icons]}
        {displayStatus}
      </Badge>
    )
  }

  if (loading) {
    return <BackupSkeleton />
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 bg-clip-text text-transparent">
              Database Backup & Restore
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage database backups and restore operations safely
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => fetchBackupData(true)} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              onClick={handleCleanupOldBackups}
              variant="outline"
              size="sm"
              disabled={activeOperation === 'cleaning'}
            >
              {activeOperation === 'cleaning' ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              Cleanup
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Status Overview */}
      {backupStatus && (
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-pink-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Storage Used</CardTitle>
                <div className="text-2xl font-bold">{backupStatus.storage.totalSize}</div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HardDrive className="w-4 h-4" />
                  {backupStatus.storage.totalFiles} files
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Backups</CardTitle>
                <div className="text-2xl font-bold">{backupHistory.length}</div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Database className="w-4 h-4" />
                  Active backups
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-violet-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Last Backup</CardTitle>
                <div className="text-2xl font-bold">
                  {backupStatus.lastBackup ? formatDate(backupStatus.lastBackup.createdAt).split(',')[0] : 'None'}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {backupStatus.lastBackup ? formatDate(backupStatus.lastBackup.createdAt).split(',')[1] : 'No backups yet'}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="backup" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="backup">Create Backup</TabsTrigger>
            <TabsTrigger value="restore">Restore</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Create Backup Tab */}
          <TabsContent value="backup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Backup
                </CardTitle>
                <CardDescription>
                  Create a backup of your database collections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Backup Type */}
                  <div className="space-y-2">
                    <Label htmlFor="backup-type">Backup Type</Label>
                    <Select
                      value={createBackupForm.type}
                      onValueChange={(value: 'full' | 'incremental' | 'selective') => 
                        setCreateBackupForm(prev => ({ ...prev, type: value, collections: value === 'selective' ? prev.collections : [] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Full Backup - All collections
                          </div>
                        </SelectItem>
                        <SelectItem value="incremental">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Incremental - Only changes since last backup
                          </div>
                        </SelectItem>
                        <SelectItem value="selective">
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Selective - Choose specific collections
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Compression */}
                  <div className="space-y-2">
                    <Label>Options</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compress"
                        checked={createBackupForm.compress}
                        onCheckedChange={(checked) => 
                          setCreateBackupForm(prev => ({ ...prev, compress: !!checked }))
                        }
                      />
                      <Label htmlFor="compress" className="text-sm">
                        Compress backup file (recommended)
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Selective Collections */}
                {createBackupForm.type === 'selective' && (
                  <div className="space-y-2">
                    <Label>Select Collections to Backup</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {AVAILABLE_COLLECTIONS.map((collection) => (
                        <div key={collection} className="flex items-center space-x-2">
                          <Checkbox
                            id={collection}
                            checked={createBackupForm.collections.includes(collection)}
                            onCheckedChange={(checked) => {
                              setCreateBackupForm(prev => ({
                                ...prev,
                                collections: checked
                                  ? [...prev.collections, collection]
                                  : prev.collections.filter(c => c !== collection)
                              }))
                            }}
                          />
                          <Label htmlFor={collection} className="text-sm">
                            {collection}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter a description for this backup..."
                    value={createBackupForm.description}
                    onChange={(e) => setCreateBackupForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Create Button */}
                <Button
                  onClick={handleCreateBackup}
                  disabled={
                    activeOperation === 'creating' || 
                    (createBackupForm.type === 'selective' && createBackupForm.collections.length === 0)
                  }
                  className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 hover:from-pink-600 hover:via-purple-600 hover:to-violet-600"
                >
                  {activeOperation === 'creating' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Backup
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restore Tab */}
          <TabsContent value="restore" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Restore from Existing Backup */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Restore from Backup
                  </CardTitle>
                  <CardDescription>
                    Select an existing backup to restore
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Backup</Label>
                    <Select
                      value={restoreForm.backupId}
                      onValueChange={(value) => {
                        setRestoreForm(prev => ({ ...prev, backupId: value }))
                        if (value) {
                          handleGetRestorePreview(value)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a backup..." />
                      </SelectTrigger>
                      <SelectContent>
                        {backupHistory.filter(b => b.status === 'completed').map((backup) => (
                          <SelectItem key={backup._id} value={backup._id}>
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate">
                                {backup.originalName} ({backup.type})
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatDate(backup.createdAt).split(',')[0]}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Restore Preview */}
                  {restorePreview && (
                    <Alert>
                      <Eye className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <div><strong>Type:</strong> {restorePreview.backupInfo.type}</div>
                          <div><strong>Collections:</strong> {restorePreview.collectionsToRestore.length} (all available collections will be restored)</div>
                          <div><strong>Documents:</strong> {restorePreview.totalDocuments.toLocaleString()}</div>
                          <div><strong>Size:</strong> {restorePreview.estimatedSize}</div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Restore Options */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="overwrite"
                        checked={restoreForm.overwrite}
                        onCheckedChange={(checked) => 
                          setRestoreForm(prev => ({ ...prev, overwrite: !!checked }))
                        }
                      />
                      <Label htmlFor="overwrite" className="text-sm">
                        Overwrite existing data (destructive)
                      </Label>
                    </div>
                    
                    {restoreForm.overwrite && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="safety"
                          checked={restoreForm.createSafetyBackup}
                          onCheckedChange={(checked) => 
                            setRestoreForm(prev => ({ ...prev, createSafetyBackup: !!checked }))
                          }
                        />
                        <Label htmlFor="safety" className="text-sm">
                          Create safety backup before restore (recommended)
                        </Label>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleRestoreBackup}
                    disabled={!restoreForm.backupId || activeOperation === 'restoring'}
                    variant={restoreForm.overwrite ? "destructive" : "default"}
                    className="w-full"
                  >
                    {activeOperation === 'restoring' ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Restore Database
                      </>
                    )}
                  </Button>

                  {restoreForm.overwrite && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> This will overwrite existing data. Make sure you have a recent backup!
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Upload and Restore */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload & Restore
                  </CardTitle>
                  <CardDescription>
                    Upload a backup file and restore from it (all collections in backup will be restored)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Backup File</Label>
                    <Input
                      type="file"
                      accept=".json,.zip"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                    {uploadFile && (
                      <div className="text-sm text-muted-foreground">
                        Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                      </div>
                    )}
                  </div>

                  {/* Upload Options */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="upload-overwrite"
                        checked={restoreForm.overwrite}
                        onCheckedChange={(checked) => 
                          setRestoreForm(prev => ({ ...prev, overwrite: !!checked }))
                        }
                      />
                      <Label htmlFor="upload-overwrite" className="text-sm">
                        Overwrite existing data
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="upload-safety"
                        checked={restoreForm.createSafetyBackup}
                        onCheckedChange={(checked) => 
                          setRestoreForm(prev => ({ ...prev, createSafetyBackup: !!checked }))
                        }
                      />
                      <Label htmlFor="upload-safety" className="text-sm">
                        Create safety backup before restore
                      </Label>
                    </div>
                  </div>

                  <Button
                    onClick={handleUploadRestore}
                    disabled={!uploadFile || activeOperation === 'uploading'}
                    variant={restoreForm.overwrite ? "destructive" : "default"}
                    className="w-full"
                  >
                    {activeOperation === 'uploading' ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Uploading & Restoring...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload & Restore
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            {/* Backup History Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Backup History
                </CardTitle>
                <CardDescription>
                  View and manage your backup files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {backupHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No backups found</p>
                      <p className="text-sm">Create your first backup to get started</p>
                    </div>
                  ) : (
                    backupHistory.map((backup) => (
                      <div
                        key={backup._id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{backup.originalName}</span>
                            {getStatusBadge(backup.status)}
                            <Badge variant="outline" className="text-xs">
                              {backup.type}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>
                              Created: {formatDate(backup.createdAt)} by {typeof backup.createdBy === 'string' ? backup.createdBy : backup.createdBy?.name || backup.createdBy?.email || 'Unknown'}
                            </div>
                            <div>
                              Size: {formatFileSize(backup.size)} • 
                              Collections: {backup.metadata?.collections?.join(', ') || backup.collections?.join(', ') || 'Unknown'} •
                              {backup.compression && ' Compressed'}
                            </div>
                            {backup.description && (
                              <div className="italic">{backup.description}</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {backup.status === 'completed' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadBackup(backup._id, backup.filename)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRestoreForm(prev => ({ ...prev, backupId: backup._id }))
                                  handleGetRestorePreview(backup._id)
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteBackup(backup._id)}
                            disabled={activeOperation === `deleting-${backup._id}`}
                          >
                            {activeOperation === `deleting-${backup._id}` ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Restore History Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Restore History
                </CardTitle>
                <CardDescription>
                  View previous database restore operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {restoreHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No restore operations found</p>
                      <p className="text-sm">Restore operations will appear here</p>
                    </div>
                  ) : (
                    restoreHistory.map((restore) => (
                      <div
                        key={restore._id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {restore.sourceType === 'existing_backup' 
                                ? (restore.sourceBackupId?.originalName || restore.sourceBackupName || 'Unknown Backup')
                                : (restore.uploadedFileName || 'Uploaded File')
                              }
                            </span>
                            {getRestoreStatusBadge(restore.status)}
                            <Badge variant="outline" className="text-xs">
                              {restore.restoreType}
                            </Badge>
                            {restore.overwriteMode && (
                              <Badge variant="destructive" className="text-xs">
                                Overwrite
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>
                              Restored: {formatDate(restore.createdAt)} by {typeof restore.restoredBy === 'string' ? restore.restoredBy : restore.restoredBy?.name || restore.restoredBy?.email || 'Unknown'}
                            </div>
                            <div>
                              Collections: {restore.collectionsRestored.length > 0 
                                ? restore.collectionsRestored.join(', ')
                                : 'None'
                              } • 
                              Documents: {(restore.totalDocumentsRestored || 0).toLocaleString()}
                              {restore.collectionsSkipped.length > 0 && 
                                ` • Skipped: ${restore.collectionsSkipped.length}`
                              }
                            </div>
                            <div>
                              Source: {restore.sourceType === 'existing_backup' ? 'Database Backup' : 'Uploaded File'}
                              {restore.sourceBackupId?.type && ` (${restore.sourceBackupId.type})`}
                              {restore.safetyBackupId && ' • Safety backup created'}
                            </div>
                            {restore.errorMessage && (
                              <div className="text-red-600 italic">Error: {restore.errorMessage}</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {restore.status === 'completed' && restore.safetyBackupId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRestoreForm(prev => ({ ...prev, backupId: restore.safetyBackupId!._id }))
                                handleGetRestorePreview(restore.safetyBackupId!._id)
                              }}
                              title="View safety backup created before this restore"
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                          )}
                          {restore.sourceType === 'existing_backup' && restore.sourceBackupId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRestoreForm(prev => ({ ...prev, backupId: restore.sourceBackupId!._id }))
                                handleGetRestorePreview(restore.sourceBackupId!._id)
                              }}
                              title="View source backup"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}

function BackupSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default withAdminAuth(BackupManagement) 