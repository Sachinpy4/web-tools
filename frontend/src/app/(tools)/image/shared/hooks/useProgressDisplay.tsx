import React from 'react'
import { QueueStatusIndicator } from '@/components/ui/QueueStatusIndicator'

interface BackgroundJobProgressProps {
  selectedFileIndex: number | null
  results: any[]
  fileJobMapping: Record<number, string>
  jobProgress: Record<string, number>
  queueStatus: Record<string, any>
  toolTheme?: ToolTheme
}

interface VisualProgressProps {
  selectedFileIndex: number | null
  processingFiles: Set<number>
  visualProgress: Record<number, number>
  actionText: string
  toolTheme?: ToolTheme
}

interface BatchProgressProps {
  processingFiles: Set<number>
  visualProgress: Record<number, number>
  files: File[]
  actionText: string
  toolTheme?: ToolTheme
}

// Define tool-specific color themes
export interface ToolTheme {
  name: string
  primaryColor: string
  primaryHover: string
  progressGradient: string
  progressBackground: string
  progressText: string
  buttonGradient: string
  buttonHover: string
  accent: string
  accentLight: string
}

export const toolThemes: Record<string, ToolTheme> = {
  compress: {
    name: 'compress',
    primaryColor: 'rgb(236, 72, 153)', // pink-500
    primaryHover: 'rgb(219, 39, 119)', // pink-600
    progressGradient: 'from-pink-500 to-rose-500',
    progressBackground: 'bg-pink-50 dark:bg-pink-950/20',
    progressText: 'text-pink-700 dark:text-pink-300',
    buttonGradient: 'from-pink-500 to-rose-500',
    buttonHover: 'from-pink-600 to-rose-600',
    accent: 'pink-500',
    accentLight: 'pink-100'
  },
  resize: {
    name: 'resize',
    primaryColor: 'rgb(147, 51, 234)', // purple-600
    primaryHover: 'rgb(126, 34, 206)', // purple-700
    progressGradient: 'from-purple-500 to-violet-500',
    progressBackground: 'bg-purple-50 dark:bg-purple-950/20',
    progressText: 'text-purple-700 dark:text-purple-300',
    buttonGradient: 'from-purple-500 to-violet-500',
    buttonHover: 'from-purple-600 to-violet-600',
    accent: 'purple-500',
    accentLight: 'purple-100'
  },
  convert: {
    name: 'convert',
    primaryColor: 'rgb(249, 115, 22)', // orange-500
    primaryHover: 'rgb(234, 88, 12)', // orange-600
    progressGradient: 'from-orange-500 to-amber-500',
    progressBackground: 'bg-orange-50 dark:bg-orange-950/20',
    progressText: 'text-orange-700 dark:text-orange-300',
    buttonGradient: 'from-orange-500 to-amber-500',
    buttonHover: 'from-orange-600 to-amber-600',
    accent: 'orange-500',
    accentLight: 'orange-100'
  },
  crop: {
    name: 'crop',
    primaryColor: 'rgb(16, 185, 129)', // emerald-500
    primaryHover: 'rgb(5, 150, 105)', // emerald-600
    progressGradient: 'from-emerald-500 to-teal-500',
    progressBackground: 'bg-emerald-50 dark:bg-emerald-950/20',
    progressText: 'text-emerald-700 dark:text-emerald-300',
    buttonGradient: 'from-emerald-500 to-teal-500',
    buttonHover: 'from-emerald-600 to-teal-600',
    accent: 'emerald-500',
    accentLight: 'emerald-100'
  },
  metadata: {
    name: 'metadata',
    primaryColor: 'rgb(59, 130, 246)', // blue-500
    primaryHover: 'rgb(37, 99, 235)', // blue-600
    progressGradient: 'from-blue-500 to-indigo-500',
    progressBackground: 'bg-blue-50 dark:bg-blue-950/20',
    progressText: 'text-blue-700 dark:text-blue-300',
    buttonGradient: 'from-blue-500 to-indigo-500',
    buttonHover: 'from-blue-600 to-indigo-600',
    accent: 'blue-500',
    accentLight: 'blue-100'
  },
  'background-removal': {
    name: 'background-removal',
    primaryColor: 'rgb(236, 72, 153)', // pink-500
    primaryHover: 'rgb(219, 39, 119)', // pink-600
    progressGradient: 'from-pink-500 to-rose-500',
    progressBackground: 'bg-pink-50 dark:bg-pink-950/20',
    progressText: 'text-pink-700 dark:text-pink-300',
    buttonGradient: 'from-pink-500 to-rose-500',
    buttonHover: 'from-pink-600 to-rose-600',
    accent: 'pink-500',
    accentLight: 'pink-100'
  }
}

export function useProgressDisplay(toolName?: string) {
  const theme = toolName ? toolThemes[toolName] : toolThemes.compress // Default fallback

  const renderBackgroundJobProgress = ({
    selectedFileIndex,
    results,
    fileJobMapping,
    jobProgress,
    queueStatus,
    toolTheme = theme
  }: BackgroundJobProgressProps) => {
    if (selectedFileIndex === null || 
        results[selectedFileIndex] || 
        !fileJobMapping[selectedFileIndex]) {
      return null
    }

    const progress = jobProgress[fileJobMapping[selectedFileIndex]] || 0

    return (
      <div className="mt-3 pt-3 border-t">
        <div className={`font-medium ${toolTheme.progressText} mb-2 flex items-center gap-2`}>
          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${toolTheme.progressGradient} animate-pulse`}></div>
          Processing Image...
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2 shadow-inner">
          <div
            className={`h-full bg-gradient-to-r ${toolTheme.progressGradient} transition-all duration-500 ease-out relative`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
          <span>
            {progress > 0 
              ? `${Math.round(progress)}% complete` 
              : 'Starting process...'}
          </span>
          {progress > 0 && (
            <span className={`text-xs font-medium ${toolTheme.progressText}`}>
              {progress.toFixed(1)}%
            </span>
          )}
        </p>
        
        {/* Show queue status if available */}
        {fileJobMapping[selectedFileIndex] && queueStatus[fileJobMapping[selectedFileIndex]] && (
          <div className="mt-2">
            <QueueStatusIndicator
              queuePosition={queueStatus[fileJobMapping[selectedFileIndex]]?.position}
              estimatedWaitTime={queueStatus[fileJobMapping[selectedFileIndex]]?.waitTime}
              isProcessing={queueStatus[fileJobMapping[selectedFileIndex]]?.isProcessing}
            />
          </div>
        )}
      </div>
    )
  }

  const renderVisualProgress = ({
    selectedFileIndex,
    processingFiles,
    visualProgress,
    actionText,
    toolTheme = theme
  }: VisualProgressProps) => {
    if (selectedFileIndex === null || !processingFiles.has(selectedFileIndex)) {
      return null
    }

    const progress = visualProgress[selectedFileIndex] || 0

    return (
      <div className={`space-y-3 p-4 rounded-lg ${toolTheme.progressBackground} border border-${toolTheme.accent}/20`}>
        <div className="flex justify-between items-center text-sm">
          <span className={`${toolTheme.progressText} font-medium flex items-center gap-2`}>
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${toolTheme.progressGradient} animate-pulse`}></div>
            {actionText}...
          </span>
          <span className={`font-bold ${toolTheme.progressText} text-lg`}>
            {progress}%
          </span>
        </div>
        <div className="h-3 bg-white/50 dark:bg-gray-800/50 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full bg-gradient-to-r ${toolTheme.progressGradient} transition-all duration-300 ease-out relative shadow-sm`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
            {progress > 15 && (
              <div className="absolute right-2 top-0 h-full flex items-center">
                <span className="text-xs font-bold text-white/90 drop-shadow">
                  {progress}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderBatchProgress = ({
    processingFiles,
    visualProgress,
    files,
    actionText,
    toolTheme = theme
  }: BatchProgressProps) => {
    if (processingFiles.size <= 1) {
      return null
    }

    const averageProgress = Object.keys(visualProgress).length > 0 
      ? Math.round(Object.values(visualProgress).reduce((a, b) => a + b, 0) / Object.values(visualProgress).length)
      : 0

    return (
      <div className={`space-y-4 p-4 rounded-lg ${toolTheme.progressBackground} border border-${toolTheme.accent}/20`}>
        <div className="flex justify-between items-center text-sm">
          <span className={`${toolTheme.progressText} font-medium flex items-center gap-2`}>
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${toolTheme.progressGradient} animate-pulse`}></div>
            {actionText} {processingFiles.size} images...
          </span>
          <span className={`font-bold ${toolTheme.progressText} text-lg`}>
            {averageProgress}%
          </span>
        </div>
        
        {/* Overall progress bar */}
        <div className="h-3 bg-white/50 dark:bg-gray-800/50 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full bg-gradient-to-r ${toolTheme.progressGradient} transition-all duration-300 ease-out relative shadow-sm`}
            style={{ width: `${averageProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
          </div>
        </div>
        
        {/* Individual file progress */}
        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
          {Array.from(processingFiles).map(fileIndex => {
            const fileProgress = visualProgress[fileIndex] || 0
            return (
              <div key={fileIndex} className="space-y-1.5 p-2 bg-white/30 dark:bg-gray-800/30 rounded-md">
                <div className="flex justify-between text-xs">
                  <span className="truncate text-muted-foreground flex-1 mr-2 font-medium" title={files[fileIndex]?.name}>
                    {files[fileIndex]?.name || `File ${fileIndex + 1}`}
                  </span>
                  <span className={`font-bold flex-shrink-0 ${toolTheme.progressText}`}>
                    {fileProgress}%
                  </span>
                </div>
                <div className="h-2 bg-white/40 dark:bg-gray-700/40 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full bg-gradient-to-r ${toolTheme.progressGradient} transition-all duration-300 ease-out relative`}
                    style={{ width: `${fileProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return {
    renderBackgroundJobProgress,
    renderVisualProgress,
    renderBatchProgress,
    toolTheme: theme
  }
} 