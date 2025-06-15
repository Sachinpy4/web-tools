import React, { useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { 
  Table as TableIcon,
  Plus,
  Minus,
  Trash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from '@/components/ui/use-toast'

interface TableControlsProps {
  editor: Editor
}

export function TableControls({ editor }: TableControlsProps) {
  // Table control functions
  const insertTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    
    toast({
      title: 'Table inserted',
      description: 'A 3x3 table has been added to your content.'
    })
  }, [editor])

  const addColumnBefore = useCallback(() => {
    if (!editor) return
    editor.chain().focus().addColumnBefore().run()
  }, [editor])

  const addColumnAfter = useCallback(() => {
    if (!editor) return
    editor.chain().focus().addColumnAfter().run()
  }, [editor])

  const deleteColumn = useCallback(() => {
    if (!editor) return
    editor.chain().focus().deleteColumn().run()
  }, [editor])

  const addRowBefore = useCallback(() => {
    if (!editor) return
    editor.chain().focus().addRowBefore().run()
  }, [editor])

  const addRowAfter = useCallback(() => {
    if (!editor) return
    editor.chain().focus().addRowAfter().run()
  }, [editor])

  const deleteRow = useCallback(() => {
    if (!editor) return
    editor.chain().focus().deleteRow().run()
  }, [editor])

  const deleteTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().deleteTable().run()
    
    toast({
      title: 'Table deleted',
      description: 'The table has been removed from your content.'
    })
  }, [editor])

  const toggleHeaderColumn = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleHeaderColumn().run()
  }, [editor])

  const toggleHeaderRow = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleHeaderRow().run()
  }, [editor])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 gap-1"
        >
          <TableIcon className="h-4 w-4" />
          Table
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col space-y-4">
          <div>
            <p className="text-sm font-medium">Table Operations</p>
            <p className="text-xs text-muted-foreground">Insert and manage tables in your content</p>
          </div>
          
          {!editor.isActive('table') && (
            <Button 
              variant="outline" 
              onClick={insertTable}
              className="w-full"
            >
              <TableIcon className="mr-2 h-4 w-4" />
              Insert Table (3x3)
            </Button>
          )}
          
          {editor.isActive('table') && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={addColumnBefore}
                  className="text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Col Before
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={addColumnAfter}
                  className="text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Col After
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={addRowBefore}
                  className="text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Row Before
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={addRowAfter}
                  className="text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Row After
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={deleteColumn}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <Minus className="mr-1 h-3 w-3" />
                  Delete Col
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={deleteRow}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <Minus className="mr-1 h-3 w-3" />
                  Delete Row
                </Button>
              </div>
              
              <div className="border-t pt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Button 
                    variant={editor.isActive('table') && editor.getAttributes('tableHeader').colspan ? "default" : "outline"}
                    size="sm"
                    onClick={toggleHeaderRow}
                    className="text-xs flex-1"
                  >
                    Header Row
                  </Button>
                  <Button 
                    variant={editor.isActive('table') && editor.getAttributes('tableHeader').rowspan ? "default" : "outline"}
                    size="sm"
                    onClick={toggleHeaderColumn}
                    className="text-xs flex-1"
                  >
                    Header Col
                  </Button>
                </div>  
                
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={deleteTable}
                  className="w-full text-xs"
                >
                  <Trash className="mr-2 h-3 w-3" />
                  Delete Table
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
} 