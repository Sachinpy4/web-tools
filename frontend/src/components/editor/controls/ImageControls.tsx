import React, { useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { 
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minimize,
  Maximize,
  Trash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SelectedImage, ImageSize, ImageFloat } from '../types/editor'

interface ImageControlsProps {
  editor: Editor
  selectedImage: SelectedImage
}

export function ImageControls({ editor, selectedImage }: ImageControlsProps) {
  // Enhanced image control functions
  const setImageSize = useCallback((size: ImageSize) => {
    if (!editor || !selectedImage) return
    
    const sizeMap = {
      small: 200,
      medium: 400,
      large: 600,
      full: '100%'
    }
    
    const newSize = sizeMap[size]
    const attrs = selectedImage.node.attrs
    
    if (typeof newSize === 'number') {
      editor.chain().focus().updateAttributes('image', { 
        width: newSize,
        style: `${attrs.style?.replace(/width:\s*\d+px/, '') || ''}width: ${newSize}px;` 
      }).run()
    } else {
      editor.chain().focus().updateAttributes('image', { 
        width: null,
        style: `${attrs.style?.replace(/width:\s*\d+px/, '') || ''}width: ${newSize};` 
      }).run()
    }
  }, [editor, selectedImage])

  const setImageFloat = useCallback((float: ImageFloat) => {
    if (!editor || !selectedImage) return
    
    const floatStyles = {
      none: 'display: block; margin-left: auto; margin-right: auto;',
      left: 'float: left; margin-right: 1rem; margin-bottom: 0.5rem;',
      right: 'float: right; margin-left: 1rem; margin-bottom: 0.5rem;'
    }
    
    editor.chain().focus().updateAttributes('image', { 
      float,
      display: float === 'none' ? 'block' : 'inline',
      style: floatStyles[float]
    }).run()
  }, [editor, selectedImage])

  const increaseImageSize = useCallback(() => {
    if (!editor || !selectedImage) return
    
    const attrs = selectedImage.node.attrs
    const width = attrs.width ? parseInt(attrs.width) : 300
    const newWidth = width + 50
    
    editor.chain().focus().updateAttributes('image', { 
      width: newWidth,
      style: `${attrs.style?.replace(/width:\s*\d+px/, '') || ''}width: ${newWidth}px;` 
    }).run()
  }, [editor, selectedImage])

  const decreaseImageSize = useCallback(() => {
    if (!editor || !selectedImage) return
    
    const attrs = selectedImage.node.attrs
    const width = attrs.width ? parseInt(attrs.width) : 300
    const newWidth = Math.max(50, width - 50)
    
    editor.chain().focus().updateAttributes('image', { 
      width: newWidth,
      style: `${attrs.style?.replace(/width:\s*\d+px/, '') || ''}width: ${newWidth}px;` 
    }).run()
  }, [editor, selectedImage])

  const deleteImage = useCallback(() => {
    if (!editor || !selectedImage) return
    
    const pos = selectedImage.getPos()
    editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run()
  }, [editor, selectedImage])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 gap-1"
        >
          <Move className="h-4 w-4" />
          Image
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col space-y-4">
          <div>
            <p className="text-sm font-medium">Image Settings</p>
            <p className="text-xs text-muted-foreground">Adjust size, alignment, and position</p>
          </div>
          
          {/* Size presets */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Size</div>
            <div className="grid grid-cols-4 gap-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setImageSize('small')}
                className="text-xs h-7"
              >
                Small
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setImageSize('medium')}
                className="text-xs h-7"
              >
                Medium
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setImageSize('large')}
                className="text-xs h-7"
              >
                Large
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setImageSize('full')}
                className="text-xs h-7"
              >
                Full
              </Button>
            </div>
          </div>
          
          {/* Alignment */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Alignment</div>
            <div className="grid grid-cols-3 gap-1">
              <Button 
                variant={selectedImage.node.attrs.float === 'left' ? "default" : "outline"}
                size="sm"
                onClick={() => setImageFloat('left')}
                className="text-xs h-7"
              >
                <AlignLeft className="mr-1 h-3 w-3" />
                Left
              </Button>
              <Button 
                variant={selectedImage.node.attrs.float === 'none' ? "default" : "outline"}
                size="sm"
                onClick={() => setImageFloat('none')}
                className="text-xs h-7"
              >
                <AlignCenter className="mr-1 h-3 w-3" />
                Center
              </Button>
              <Button 
                variant={selectedImage.node.attrs.float === 'right' ? "default" : "outline"}
                size="sm"
                onClick={() => setImageFloat('right')}
                className="text-xs h-7"
              >
                <AlignRight className="mr-1 h-3 w-3" />
                Right
              </Button>
            </div>
          </div>
          
          {/* Fine adjustments */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Fine Adjustments</div>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={decreaseImageSize}
                className="text-xs h-7 flex-1"
              >
                <Minimize className="mr-1 h-3 w-3" />
                Smaller
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={increaseImageSize}
                className="text-xs h-7 flex-1"
              >
                <Maximize className="mr-1 h-3 w-3" />
                Larger
              </Button>
            </div>
          </div>
          
          {/* Delete */}
          <Button 
            variant="destructive" 
            size="sm"
            onClick={deleteImage}
            className="w-full text-xs"
          >
            <Trash className="mr-2 h-3 w-3" />
            Delete Image
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
} 