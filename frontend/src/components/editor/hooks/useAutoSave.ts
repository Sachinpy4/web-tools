import { useState, useEffect, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { toast } from '@/components/ui/use-toast'
import { AutoSaveStatus, AutoSaveProps } from '../types/editor'

export function useAutoSave(
  editor: Editor | null,
  { enableAutoSave, autoSaveInterval = 30000, onAutoSave, autoSaveKey }: AutoSaveProps
) {
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveTimeoutId, setAutoSaveTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // Auto-save functionality
  const performAutoSave = useCallback(async (content: string) => {
    if (!enableAutoSave || !content.trim()) return
    
    try {
      setAutoSaveStatus('saving')
      
      if (onAutoSave) {
        await onAutoSave(content)
      } else if (autoSaveKey) {
        // Fallback to localStorage
        localStorage.setItem(`autosave_${autoSaveKey}`, JSON.stringify({
          content,
          timestamp: new Date().toISOString()
        }))
      }
      
      setAutoSaveStatus('saved')
      setLastSaved(new Date())
      
      // Reset status after 3 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Auto-save failed:', error)
      setAutoSaveStatus('error')
      
      // Try localStorage fallback on error
      if (autoSaveKey) {
        try {
          localStorage.setItem(`autosave_${autoSaveKey}`, JSON.stringify({
            content,
            timestamp: new Date().toISOString()
          }))
          setAutoSaveStatus('saved')
          setLastSaved(new Date())
        } catch (e) {
          console.error('Auto-save localStorage fallback failed:', e)
        }
      }
      
      // Reset error status after 5 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 5000)
    }
  }, [enableAutoSave, onAutoSave, autoSaveKey])

  // Debounced auto-save effect
  useEffect(() => {
    if (!enableAutoSave || !editor) return

    const content = editor.getHTML()
    
    // Clear existing timeout
    if (autoSaveTimeoutId) {
      clearTimeout(autoSaveTimeoutId)
    }
    
    // Set new timeout for auto-save
    const timeoutId = setTimeout(() => {
      performAutoSave(content)
    }, autoSaveInterval)
    
    setAutoSaveTimeoutId(timeoutId)
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [editor, enableAutoSave, autoSaveInterval, performAutoSave])

  // Manual save function
  const manualSave = useCallback(() => {
    if (!editor) return
    const content = editor.getHTML()
    performAutoSave(content)
  }, [editor, performAutoSave])

  // Load auto-saved content on mount
  const loadAutoSavedContent = useCallback((onChange: (content: string) => void, currentValue: string) => {
    if (!enableAutoSave || !autoSaveKey || currentValue) return
    
    try {
      const saved = localStorage.getItem(`autosave_${autoSaveKey}`)
      if (saved) {
        const { content, timestamp } = JSON.parse(saved)
        const savedDate = new Date(timestamp)
        
        // Only load if saved within last 24 hours
        if (Date.now() - savedDate.getTime() < 24 * 60 * 60 * 1000) {
          onChange(content)
          setLastSaved(savedDate)
          
          toast({
            title: 'Auto-saved Content Restored',
            description: `Restored content from ${savedDate.toLocaleString()}`,
          })
        }
      }
    } catch (error) {
      console.error('Failed to load auto-saved content:', error)
    }
  }, [enableAutoSave, autoSaveKey])

  return {
    autoSaveStatus,
    lastSaved,
    manualSave,
    loadAutoSavedContent
  }
} 