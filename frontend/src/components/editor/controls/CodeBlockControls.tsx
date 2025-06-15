import React, { useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from '@/components/ui/use-toast'

interface CodeBlockControlsProps {
  editor: Editor
}

const POPULAR_LANGUAGES = ['javascript', 'typescript', 'python', 'html', 'css', 'json']
const ALL_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 
  'html', 'css', 'json', 'xml',
  'bash', 'sql', 'php', 'go',
  'rust', 'cpp', 'csharp', 'ruby'
]

export function CodeBlockControls({ editor }: CodeBlockControlsProps) {
  // Code block control functions
  const insertCodeBlock = useCallback((language?: string) => {
    if (!editor) return
    
    if (language) {
      editor.chain().focus().toggleCodeBlock({ language }).run()
    } else {
      editor.chain().focus().toggleCodeBlock().run()
    }
    
    toast({
      title: 'Code block inserted',
      description: language ? `Code block with ${language} syntax highlighting added.` : 'Code block added.'
    })
  }, [editor])

  const setCodeBlockLanguage = useCallback((language: string) => {
    if (!editor) return
    editor.chain().focus().updateAttributes('codeBlock', { language }).run()
  }, [editor])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Toggle
          pressed={editor.isActive('codeBlock')}
          aria-label="Code Block"
          size="sm"
        >
          <FileCode className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col space-y-4">
          <div>
            <p className="text-sm font-medium">Code Block</p>
            <p className="text-xs text-muted-foreground">Insert code with syntax highlighting</p>
          </div>
          
          {!editor.isActive('codeBlock') && (
            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={() => insertCodeBlock()}
                className="w-full"
              >
                <FileCode className="mr-2 h-4 w-4" />
                Insert Code Block
              </Button>
              
              <div className="text-xs text-muted-foreground">Popular languages:</div>
              <div className="grid grid-cols-3 gap-1">
                {POPULAR_LANGUAGES.map((lang) => (
                  <Button 
                    key={lang}
                    variant="ghost" 
                    size="sm"
                    onClick={() => insertCodeBlock(lang)}
                    className="text-xs h-7"
                  >
                    {lang}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {editor.isActive('codeBlock') && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">Change language:</div>
              <div className="grid grid-cols-2 gap-1">
                {ALL_LANGUAGES.map((lang) => (
                  <Button 
                    key={lang}
                    variant={editor.getAttributes('codeBlock').language === lang ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCodeBlockLanguage(lang)}
                    className="text-xs h-7"
                  >
                    {lang}
                  </Button>
                ))}
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className="w-full text-xs"
              >
                Remove Code Block
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
} 