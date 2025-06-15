import React from 'react'
import { 
  Save,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AutoSaveStatus as AutoSaveStatusType } from '../types/editor'

interface AutoSaveStatusProps {
  autoSaveStatus: AutoSaveStatusType
  lastSaved: Date | null
  onManualSave: () => void
  enableAutoSave: boolean
}

export function AutoSaveStatus({ 
  autoSaveStatus, 
  lastSaved, 
  onManualSave, 
  enableAutoSave 
}: AutoSaveStatusProps) {
  if (!enableAutoSave) return null

  return (
    <>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      
      {/* Manual save button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 gap-1"
        onClick={onManualSave}
        disabled={autoSaveStatus === 'saving'}
      >
        <Save className="h-4 w-4" />
        Save
      </Button>
      
      {/* Auto-save status indicator */}
      <div className="flex items-center gap-2 px-2 py-1 rounded-md text-xs">
        {autoSaveStatus === 'saving' && (
          <>
            <Clock className="h-3 w-3 animate-spin text-blue-500" />
            <span className="text-blue-600">Saving...</span>
          </>
        )}
        {autoSaveStatus === 'saved' && (
          <>
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span className="text-green-600">
              Saved {lastSaved ? lastSaved.toLocaleTimeString() : ''}
            </span>
          </>
        )}
        {autoSaveStatus === 'error' && (
          <>
            <AlertCircle className="h-3 w-3 text-red-500" />
            <span className="text-red-600">Save failed</span>
          </>
        )}
        {autoSaveStatus === 'idle' && lastSaved && (
          <>
            <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              Last saved {lastSaved.toLocaleTimeString()}
            </span>
          </>
        )}
      </div>
    </>
  )
} 