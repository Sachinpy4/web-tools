import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ColumnBlockView } from './ColumnBlockView'

// Add TypeScript declarations for the custom commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columnLayout: {
      /**
       * Insert a two-column layout
       */
      insertColumnLayout: (attributes?: { columns?: number }) => ReturnType,
      /**
       * Insert a three-column layout
       */
      insertThreeColumnLayout: () => ReturnType,
      /**
       * Delete a column layout
       */
      deleteColumnLayout: () => ReturnType,
      /**
       * Convert column layout between 2 and 3 columns
       */
      toggleColumnCount: () => ReturnType,
    }
  }
}

// Column container extension
export const ColumnLayout = Node.create({
  name: 'columnLayout',
  group: 'block',
  content: 'columnBlock{2,3}', // Allow 2 or 3 columns
  defining: true,
  isolating: true,
  
  addAttributes() {
    return {
      columns: {
        default: 2, // Default column count
        parseHTML: element => parseInt(element.getAttribute('data-columns') || '2', 10),
        renderHTML: attributes => {
          return {
            'data-columns': attributes.columns,
          }
        },
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="column-layout"]',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div', 
      mergeAttributes(
        HTMLAttributes,
        {
          'data-type': 'column-layout',
          class: 'column-layout-container',
          style: `display: flex; flex-direction: row; gap: 1rem;`,
        },
      ),
      0, // Content placeholder
    ]
  },
  
  addCommands() {
    return {
      insertColumnLayout: (attributes = {}) => ({ chain, commands }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: attributes,
            content: [
              {
                type: 'columnBlock',
                content: [{ type: 'paragraph' }],
              },
              {
                type: 'columnBlock',
                content: [{ type: 'paragraph' }],
              },
            ],
          })
          .run()
      },
      
      insertThreeColumnLayout: () => ({ chain, commands }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: { columns: 3 },
            content: [
              {
                type: 'columnBlock',
                content: [{ type: 'paragraph' }],
              },
              {
                type: 'columnBlock',
                content: [{ type: 'paragraph' }],
              },
              {
                type: 'columnBlock',
                content: [{ type: 'paragraph' }],
              },
            ],
          })
          .run()
      },
      
      deleteColumnLayout: () => ({ commands, state, tr }) => {
        // Find the column layout node that contains the current selection
        const { selection } = state
        const { $from } = selection
        
        // Find the closest column layout node
        let depth = $from.depth
        let foundColumnLayout = false
        let pos = 0
        
        // Look through the ancestor nodes to find a columnLayout
        while (depth > 0 && !foundColumnLayout) {
          const node = $from.node(depth)
          if (node.type.name === 'columnLayout') {
            foundColumnLayout = true
            pos = $from.before(depth)
          }
          depth--
        }
        
        if (foundColumnLayout) {
          return commands.deleteRange({ from: pos, to: pos + $from.node(depth + 1).nodeSize })
        }
        
        return false
      },
      
      toggleColumnCount: () => ({ chain, commands, state }) => {
        const { selection } = state
        const { $from } = selection
        
        // Find the closest column layout node
        let depth = $from.depth
        let foundColumnLayout = false
        let pos = 0
        let layoutNode = null
        
        // Look through the ancestor nodes to find a columnLayout
        while (depth > 0 && !foundColumnLayout) {
          const node = $from.node(depth)
          if (node.type.name === 'columnLayout') {
            foundColumnLayout = true
            pos = $from.before(depth)
            layoutNode = node
          }
          depth--
        }
        
        if (foundColumnLayout && layoutNode) {
          const currentColumns = layoutNode.attrs.columns || 2
          const newColumns = currentColumns === 2 ? 3 : 2
          
          // Create new content with appropriate number of columns
          const content = []
          for (let i = 0; i < newColumns; i++) {
            content.push({
              type: 'columnBlock',
              content: [{ type: 'paragraph' }],
            })
          }
          
          return chain()
            .deleteRange({ from: pos, to: pos + layoutNode.nodeSize })
            .insertContentAt(pos, {
              type: 'columnLayout',
              attrs: { columns: newColumns },
              content: content,
            })
            .run()
        }
        
        return false
      }
    }
  },
})

// Individual column block extension
export const ColumnBlock = Node.create({
  name: 'columnBlock',
  group: 'columnBlock',
  content: 'block+', // Each column can contain multiple block elements (paragraphs, lists, etc.)
  defining: true,
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="column-block"]',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div', 
      mergeAttributes(
        HTMLAttributes,
        {
          'data-type': 'column-block',
          class: 'column-block p-2 border border-dashed border-muted-foreground/20 rounded-md',
        },
      ),
      0, // Content placeholder
    ]
  },
  
  // Use ReactNodeViewRenderer to provide interactive features to columns
  addNodeView() {
    return ReactNodeViewRenderer(ColumnBlockView)
  },
}) 