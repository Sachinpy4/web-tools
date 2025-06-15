export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface AutoSaveProps {
  enableAutoSave?: boolean
  autoSaveInterval?: number // in milliseconds
  onAutoSave?: (content: string) => Promise<void>
  autoSaveKey?: string // unique key for localStorage fallback
}

export interface RichTextEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
  // Auto-save props
  enableAutoSave?: boolean
  autoSaveInterval?: number
  onAutoSave?: (content: string) => Promise<void>
  autoSaveKey?: string
}

export interface SelectedImage {
  node: any;
  pos: number;
  getPos: () => number;
}

export type ImageSize = 'small' | 'medium' | 'large' | 'full'
export type ImageFloat = 'none' | 'left' | 'right' 