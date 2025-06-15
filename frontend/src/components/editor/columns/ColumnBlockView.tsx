'use client'

import React from 'react'
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import { Trash, GripVertical } from 'lucide-react'

export function ColumnBlockView({ node, getPos, editor }: NodeViewProps) {
  // Check if this is the first column by examining its position in parent
  const isFirstColumn = typeof getPos === 'function' && editor?.state.doc.resolve(getPos()).index() === 0;
  
  // Get the parent column layout to determine total columns
  const pos = typeof getPos === 'function' ? getPos() : 0;
  const resolvedPos = editor?.state.doc.resolve(pos);
  const parent = resolvedPos?.parent;
  const totalColumns = parent?.childCount || 2;
  const currentColumnIndex = (typeof getPos === 'function' ? resolvedPos?.index() || 0 : 0) + 1;

  // Function to delete the entire column layout
  const deleteColumnLayout = () => {
    if (editor) {
      editor.commands.deleteColumnLayout();
    }
  };

  return (
    <NodeViewWrapper className="column-block-wrapper relative flex-1 min-w-0">
      <div className="absolute -top-7 left-0 right-0 flex items-center justify-between text-xs text-muted-foreground bg-background px-2 py-1 rounded-t-md border border-b-0 border-muted">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3 w-3" />
          <span>Column {currentColumnIndex} of {totalColumns}</span>
        </div>
        {isFirstColumn && (
          <button
            type="button"
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={deleteColumnLayout}
            title="Delete entire column layout"
          >
            <Trash className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="column-block relative group">
        <NodeViewContent className="column-content min-h-[60px] outline-none" />
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md border-2 border-primary/30"></div>
        {/* Placeholder text when empty */}
        {!node.textContent.trim() && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-muted-foreground/60 text-sm italic">
              Click here to add content...
            </span>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
} 