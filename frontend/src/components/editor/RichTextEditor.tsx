'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { lowlight } from 'lowlight'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo, 
  Link as LinkIcon, 
  UnlinkIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Image as ImageIcon,
  Columns as ColumnsIcon,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getApiUrl } from '@/lib/apiClient'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColumnLayout, ColumnBlock } from './columns'
import { MediaLibrary } from '@/components/media/MediaLibrary'

// Import our modular components
import { useAutoSave } from './hooks/useAutoSave'
import { TableControls } from './controls/TableControls'
import { CodeBlockControls } from './controls/CodeBlockControls'
import { ImageControls } from './controls/ImageControls'
import { AutoSaveStatus } from './controls/AutoSaveStatus'
import { EditorStyles } from './styles/EditorStyles'
import { RichTextEditorProps, SelectedImage } from './types/editor'

  // lowlight v2 is already initialized with common languages

// Extended Image extension with custom attributes for alignment
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      display: {
        default: 'inline',
      },
      float: {
        default: 'none',
      },
    }
  },
})

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder,
  enableAutoSave = false,
  autoSaveInterval = 30000,
  onAutoSave,
  autoSaveKey 
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState<string>('')
  const [imageUrl, setImageUrl] = useState<string>('')
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null)
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the default codeBlock to avoid conflicts with CodeBlockLowlight
        codeBlock: false,
      }),
      CustomImage.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          class: 'text-primary underline'
        }
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write your content here...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.extend({
        renderHTML({ node, HTMLAttributes }) {
          const language = node.attrs.language || 'text'
          return [
            'pre',
            {
              ...HTMLAttributes,
              'data-language': language,
              class: `${HTMLAttributes.class || 'hljs'}`.trim(),
            },
            ['code', { class: `language-${language}` }, 0]
          ]
        },
      }).configure({
        lowlight: lowlight,
        HTMLAttributes: {
          class: 'hljs',
        },
      }),
      ColumnLayout,
      ColumnBlock,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    immediatelyRender: false,
    onSelectionUpdate: ({ editor }) => {
      // Check if the selection is an image
      const { state } = editor
      const { selection } = state
      const { ranges } = selection
      const from = ranges[0].$from

      const node = from.nodeAfter
      
      if (node?.type.name === 'image') {
        setSelectedImage({
          node,
          pos: from.pos,
          getPos: () => from.pos,
        })
      } else {
        setSelectedImage(null)
      }
    },
    onFocus: ({ editor }) => {
      const { state } = editor
      const { selection } = state
      const { ranges } = selection
      const from = ranges[0].$from

      const node = from.nodeAfter
      
      if (node?.type.name === 'image') {
        setSelectedImage({
          node,
          pos: from.pos,
          getPos: () => from.pos,
        })
      } else {
        setSelectedImage(null)
      }
    },
    onBlur: () => {
      // Keep selected image state to allow interaction with controls
    }
  })

  // Auto-save functionality
  const { autoSaveStatus, lastSaved, manualSave, loadAutoSavedContent } = useAutoSave(
    editor, 
    { enableAutoSave, autoSaveInterval, onAutoSave, autoSaveKey }
  )

  // Sync outside value to editor
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  // Load auto-saved content on mount
  useEffect(() => {
    loadAutoSavedContent(onChange, value)
  }, [loadAutoSavedContent, onChange, value])

  const addImage = useCallback(() => {
    if (!imageUrl || !editor) return
    
    editor.chain().focus().setImage({ src: imageUrl }).run()
    setImageUrl('')
  }, [editor, imageUrl])

  const setLink = useCallback(() => {
    if (!linkUrl || !editor) return
    
    // Check if URL is valid
    try {
      new URL(linkUrl)
      
      // First check if there's selected text
      const { state } = editor
      const { selection } = state
      const { empty } = selection
      
      // If no text is selected, insert the URL as text and make it a link
      if (empty) {
        // Insert the URL as text first, then convert to link
        editor.chain()
          .focus()
          .insertContent(linkUrl)
          .setTextSelection({
            from: selection.from,
            to: selection.from + linkUrl.length,
          })
          .setLink({ href: linkUrl })
          .run()
      } else {
        // Text is selected, just add link to selection
        editor.chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: linkUrl })
          .run()
      }
      
      setLinkUrl('')
    } catch (e) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL including http:// or https://',
        variant: 'destructive',
      })
    }
  }, [editor, linkUrl])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    
    // Validate file is an image
    if (!file.type.includes('image')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPEG, PNG, etc.)',
        variant: 'destructive',
      })
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      })
      return
    }
    
    try {
      // Create FormData
      const formData = new FormData()
      formData.append('image', file)
      
      // Add query parameter to indicate this is a blog image
      const queryParams = new URLSearchParams({ type: 'blog' }).toString()
      
      // Get auth token
      const token = localStorage.getItem('token')
      
      // Upload to backend
      const response = await fetch(`${getApiUrl().replace('/api', '')}/api/upload?${queryParams}`, {
        method: 'POST',
        body: formData,
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : undefined
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload image')
      }
      
      const data = await response.json()
      const fileUrl = data.fileUrl || data.data?.fileUrl
      
      if (!fileUrl) {
        throw new Error('No file URL returned from server')
      }
      
      editor.chain().focus().setImage({ src: fileUrl }).run()
      
      toast({
        title: 'Image inserted',
        description: 'Your image has been inserted into the editor.',
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your image. Please try again.',
        variant: 'destructive',
      })
    }
  }

    // Column layout functions
  const addTwoColumnLayout = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertColumnLayout().run()
  }, [editor])
  
  const addThreeColumnLayout = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertThreeColumnLayout().run()
  }, [editor])
  
  const toggleColumnCount = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleColumnCount().run()
  }, [editor])
  
  // Check if cursor is inside a column layout
  const isInColumnLayout = editor?.isActive('columnLayout') || false

  const handleMediaSelect = useCallback((media: any) => {
    if (!editor) return
    
    // Make sure the URL is absolute with the correct backend domain
    const baseApiUrl = getApiUrl().replace('/api', '')
    let fullUrl = media.url
    if (media.url.startsWith('/')) {
      fullUrl = `${baseApiUrl}${media.url}`
    }
    
    // Insert the image into the editor
    editor.chain().focus().setImage({ src: fullUrl }).run()
    
    toast({
      title: 'Image inserted',
      description: 'The selected image has been inserted into the editor.',
    })
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-md">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
        {/* Text formatting */}
        <Toggle
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
          size="sm"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
          size="sm"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
          size="sm"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Strikethrough"
          size="sm"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive('code')}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          aria-label="Code"
          size="sm"
        >
          <Code className="h-4 w-4" />
        </Toggle>
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        {/* Headings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
              {editor.isActive('heading', { level: 1 }) ? 'H1' : 
               editor.isActive('heading', { level: 2 }) ? 'H2' : 
               editor.isActive('heading', { level: 3 }) ? 'H3' : 
               editor.isActive('heading', { level: 4 }) ? 'H4' : 
               'Normal'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem 
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={editor.isActive('paragraph') ? 'bg-accent' : ''}
            >
              Normal
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}
            >
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
            >
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}
            >
              Heading 3
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
              className={editor.isActive('heading', { level: 4 }) ? 'bg-accent' : ''}
            >
              Heading 4
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        {/* Lists */}
        <Toggle
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet List"
          size="sm"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Ordered List"
          size="sm"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Quote"
          size="sm"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        {/* Text alignment */}
        <Toggle
          pressed={editor.isActive({ textAlign: 'left' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
          aria-label="Align Left"
          size="sm"
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive({ textAlign: 'center' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
          aria-label="Align Center"
          size="sm"
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive({ textAlign: 'right' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
          aria-label="Align Right"
          size="sm"
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={editor.isActive({ textAlign: 'justify' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
          aria-label="Align Justify"
          size="sm"
        >
          <AlignJustify className="h-4 w-4" />
        </Toggle>
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        {/* Link */}
        <Popover>
          <PopoverTrigger asChild>
            <Toggle
              pressed={editor.isActive('link')}
              aria-label="Link"
              size="sm"
            >
              <LinkIcon className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium">Insert Link</p>
              <div className="flex space-x-2">
                <Input 
                  placeholder="https://example.com" 
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      setLink()
                    }
                  }}
                />
                <Button onClick={setLink} size="sm">Add</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {editor.isActive('link') && (
          <Toggle
            pressed={false}
            onPressedChange={() => editor.chain().focus().unsetLink().run()}
            aria-label="Remove Link"
            size="sm"
          >
            <UnlinkIcon className="h-4 w-4" />
          </Toggle>
        )}
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        {/* Image upload and URL */}
        <Popover>
          <PopoverTrigger asChild>
            <Toggle
              aria-label="Insert Image"
              size="sm"
            >
              <ImageIcon className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="flex flex-col space-y-4">
              <p className="text-sm font-medium">Insert Image</p>
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Upload from your device</p>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Select from Media Library</p>
                <MediaLibrary
                  onSelect={handleMediaSelect}
                  allowedTypes={['image/*']}
                  triggerButton={
                    <Button variant="outline" className="w-full">
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Select from Media Library
                    </Button>
                  }
                  contextType="blog"
                />
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Or insert from URL</p>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="https://example.com/image.jpg" 
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                  />
                  <Button onClick={addImage} size="sm">Add</Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        {/* New modular controls */}
        <TableControls editor={editor} />
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        <CodeBlockControls editor={editor} />
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        {/* Show image controls when an image is selected */}
        {selectedImage && (
          <>
            <div className="w-px h-6 bg-border mx-1 self-center" />
            <ImageControls editor={editor} selectedImage={selectedImage} />
          </>
        )}
        
        {/* Add a new section for layout controls */}
        <div className="w-full mt-2 pt-2 border-t flex items-center">
          <span className="text-xs text-muted-foreground mr-2">Layout:</span>
          
          {/* Column Layout button with improved styling */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 gap-1 border-dashed bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:hover:bg-amber-900 text-xs"
              >
                <ColumnsIcon className="h-4 w-4 mr-1" />
                Insert Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="flex flex-col space-y-3">
                <div>
                  <p className="text-sm font-medium">Insert Columns</p>
                  <p className="text-xs text-muted-foreground">Add a multi-column layout to organize your content</p>
                </div>
                
                {isInColumnLayout ? (
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                      onClick={toggleColumnCount}
                    >
                      Toggle Column Count
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Switch between 2 and 3 columns for the current layout
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-col h-auto py-4 gap-2"
                      onClick={addTwoColumnLayout}
                    >
                      <div className="flex justify-center w-full space-x-1">
                        <div className="w-8 h-12 bg-muted/50 rounded"></div>
                        <div className="w-8 h-12 bg-muted/50 rounded"></div>
                      </div>
                      <span className="text-xs">Two Columns</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-col h-auto py-4 gap-2"
                      onClick={addThreeColumnLayout}
                    >
                      <div className="flex justify-center w-full space-x-1">
                        <div className="w-5 h-12 bg-muted/50 rounded"></div>
                        <div className="w-5 h-12 bg-muted/50 rounded"></div>
                        <div className="w-5 h-12 bg-muted/50 rounded"></div>
                      </div>
                      <span className="text-xs">Three Columns</span>
                    </Button>
                  </div>
                )}
                
                <div className="text-xs p-2 bg-muted/20 rounded border border-muted">
                  <p className="font-medium">How to use columns:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Each column is a separate content area</li>
                    <li>Click inside a column to add content to it</li>
                    <li>Add text, images, and lists inside each column</li>
                    <li>Use the delete button in the first column to remove the entire layout</li>
                  </ul>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="w-px h-6 bg-border mx-1 self-center" />
        
        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
        
        {/* Auto-save status */}
        <AutoSaveStatus 
          autoSaveStatus={autoSaveStatus}
          lastSaved={lastSaved}
          onManualSave={manualSave}
          enableAutoSave={enableAutoSave}
        />
      </div>
      
      <div className="relative">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[300px] focus-visible:outline-none"
        />
        
        {/* Global CSS styles */}
        <EditorStyles />
      </div>
    </div>
  )
} 