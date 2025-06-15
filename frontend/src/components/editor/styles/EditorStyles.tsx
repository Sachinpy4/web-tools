import React from 'react'

export function EditorStyles() {
  return (
    <style jsx global>{`
      .ProseMirror {
        position: relative;
      }
      
      .ProseMirror img {
        max-width: 100%;
        height: auto;
        cursor: pointer;
        border-radius: 0.5rem;
      }
      
      .ProseMirror img.ProseMirror-selectednode {
        outline: 2px solid hsl(var(--primary));
        border-radius: 0.5rem;
      }
      
      /* Table styles - Enhanced for both editor and public view */
      .ProseMirror table,
      .prose table {
        border-collapse: collapse;
        table-layout: auto !important; /* Allow text wrapping */
        width: 100%;
        margin: 1.5rem 0 !important;
        overflow: hidden;
        border-radius: 0.5rem;
        border: 1px solid hsl(var(--border));
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
      }

      .ProseMirror table td,
      .ProseMirror table th,
      .prose table td,
      .prose table th {
        min-width: 1em;
        border: 1px solid hsl(var(--border));
        padding: 0.75rem 1rem; /* Better spacing */
        vertical-align: top;
        box-sizing: border-box;
        position: relative;
        background-color: hsl(var(--background));
        word-wrap: break-word !important; /* Enable text wrapping */
        word-break: break-word !important;
        hyphens: auto;
        line-height: 1.5;
      }

      .ProseMirror table th,
      .prose table th {
        font-weight: 600;
        text-align: left;
        background-color: hsl(var(--muted)/50%);
        padding: 0.5rem 1rem !important; /* Reduced vertical padding for headers */
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        color: hsl(var(--foreground)/90%);
      }

      .ProseMirror table .selectedCell:after {
        z-index: 2;
        position: absolute;
        content: "";
        left: 0; right: 0; top: 0; bottom: 0;
        background: hsl(var(--primary)/20%);
        pointer-events: none;
      }

      .ProseMirror table .column-resize-handle {
        position: absolute;
        right: -2px;
        top: 0;
        bottom: -2px;
        width: 4px;
        background-color: hsl(var(--primary));
        pointer-events: none;
      }

      .ProseMirror table p,
      .prose table p {
        margin: 0;
        line-height: 1.4;
      }

      /* Responsive table styles */
      @media (max-width: 768px) {
        .ProseMirror table,
        .prose table {
          font-size: 0.875rem;
          display: block;
          overflow-x: auto;
          white-space: nowrap;
          border-radius: 0.5rem;
          -webkit-overflow-scrolling: touch;
        }
        
        .ProseMirror table td,
        .ProseMirror table th,
        .prose table td,
        .prose table th {
          padding: 0.5rem 0.75rem;
          white-space: normal; /* Allow wrapping on mobile */
          min-width: 120px; /* Minimum width for readability */
        }
        
        .ProseMirror table th,
        .prose table th {
          padding: 0.375rem 0.75rem !important;
          font-size: 0.8125rem;
        }
      }

      /* Table hover effects */
      .prose table tbody tr:hover {
        background-color: hsl(var(--muted)/30%);
        transition: background-color 0.2s ease;
      }

      /* Improved table borders */
      .prose table tbody tr:last-child td {
        border-bottom: none;
      }

      .prose table thead tr th:first-child,
      .prose table tbody tr td:first-child {
        border-left: none;
      }

      .prose table thead tr th:last-child,
      .prose table tbody tr td:last-child {
        border-right: none;
      }

      /* Table text alignment utilities */
      .prose table td[align="center"],
      .prose table th[align="center"] {
        text-align: center;
      }

      .prose table td[align="right"],
      .prose table th[align="right"] {
        text-align: right;
      }

      /* Better table container for scrolling */
      .prose .table-container {
        overflow-x: auto;
        margin: 1.5rem 0;
        border-radius: 0.5rem;
        border: 1px solid hsl(var(--border));
      }

      .prose .table-container table {
        margin: 0 !important;
        border: none;
        border-radius: 0;
      }
      
      /* Code block styles - Enhanced for public view */
      .ProseMirror pre,
      .prose pre {
        background: hsl(var(--muted)) !important;
        border-radius: 0.5rem !important;
        color: hsl(var(--foreground)) !important;
        font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace !important;
        padding: 1rem !important;
        white-space: pre-wrap !important;
        margin: 1rem 0 !important;
        overflow-x: auto !important;
        border: 1px solid hsl(var(--border)) !important;
        font-size: 0.875rem !important;
        line-height: 1.5 !important;
        position: relative;
      }

      .ProseMirror pre code,
      .prose pre code {
        color: inherit !important;
        padding: 0 !important;
        background: none !important;
        font-size: inherit !important;
        line-height: inherit !important;
        border-radius: 0 !important;
        font-family: inherit !important;
      }

      /* Language label for code blocks */
      .ProseMirror pre[data-language]:before,
      .prose pre[data-language]:before {
        content: attr(data-language);
        position: absolute;
        top: 0.5rem;
        right: 3.5rem; /* Adjusted to not overlap with copy button */
        font-size: 0.75rem;
        font-weight: 500;
        color: hsl(var(--muted-foreground));
        text-transform: uppercase;
        letter-spacing: 0.05em;
        background: hsl(var(--background)/80%);
        backdrop-filter: blur(8px);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        border: 1px solid hsl(var(--border));
        z-index: 10;
        user-select: none;
        pointer-events: none;
        transition: all 0.2s ease;
      }
      
      /* Hide language label when it's just 'text' or empty */
      .ProseMirror pre[data-language="text"]:before,
      .prose pre[data-language="text"]:before,
      .ProseMirror pre[data-language=""]:before,
      .prose pre[data-language=""]:before {
        display: none;
      }

      /* Code block hover effects for better UX */
      .prose pre:hover {
        border-color: hsl(var(--border)) !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        transition: all 0.2s ease !important;
      }

      /* Copy button styling for code blocks - using real DOM elements now */
      .prose pre {
        position: relative !important;
      }

      /* Enhanced mobile support for copy buttons */
      @media (hover: none) and (pointer: coarse) {
        .prose pre .copy-button-container {
          opacity: 0.7 !important;
        }
        
        .prose pre:hover .copy-button-container,
        .prose pre:focus-within .copy-button-container {
          opacity: 1 !important;
        }
      }

      /* Better code block styling integration */
      .prose pre:hover {
        border-color: hsl(var(--border)) !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        transition: all 0.2s ease !important;
      }

      /* Copy button focus styles */
      .prose pre button:focus-visible {
        outline: 2px solid hsl(var(--ring)) !important;
        outline-offset: 2px !important;
      }

      /* Ensure code blocks render properly in prose context */
      .prose pre.hljs,
      .prose pre code.hljs {
        display: block !important;
        background: hsl(var(--muted)) !important;
        color: hsl(var(--foreground)) !important;
        padding: 1rem !important;
        border-radius: 0.5rem !important;
        overflow-x: auto !important;
        border: 1px solid hsl(var(--border)) !important;
      }

      /* Reset any conflicting prose styles */
      .prose code:not(pre code) {
        color: hsl(var(--foreground)) !important;
        background: hsl(var(--muted)/80%) !important;
        padding: 0.125rem 0.25rem !important;
        border-radius: 0.25rem !important;
        font-size: 0.875em !important;
        font-weight: 400 !important;
        border: none !important;
      }

      /* Specific HTML code improvements */
      .prose pre code.language-html,
      .prose pre code.language-xml {
        color: hsl(var(--foreground)) !important;
      }

      .prose pre code.language-html .hljs-tag,
      .prose pre code.language-xml .hljs-tag {
        color: #22863a !important;
      }

      .prose pre code.language-html .hljs-name,
      .prose pre code.language-xml .hljs-name {
        color: #d73a49 !important;
        font-weight: 600 !important;
      }

      /* Enhanced Syntax highlighting - Works in both editor and public view */
      .hljs-comment,
      .hljs-quote {
        color: hsl(var(--muted-foreground)) !important;
        font-style: italic;
      }

      .hljs-keyword,
      .hljs-selector-tag,
      .hljs-subst {
        color: #d73a49 !important;
        font-weight: 500;
      }

      .hljs-number,
      .hljs-literal,
      .hljs-variable,
      .hljs-template-variable,
      .hljs-tag .hljs-attr {
        color: #005cc5 !important;
      }

      .hljs-string,
      .hljs-doctag {
        color: #032f62 !important;
      }

      .hljs-title,
      .hljs-section,
      .hljs-selector-id {
        color: #6f42c1 !important;
        font-weight: 600;
      }

      .hljs-type,
      .hljs-class .hljs-title {
        color: #d73a49 !important;
      }

      /* HTML-specific highlighting */
      .hljs-tag,
      .hljs-name,
      .hljs-attribute {
        color: #22863a !important;
        font-weight: 500;
      }

      .hljs-tag .hljs-name {
        color: #d73a49 !important;
        font-weight: 600;
      }

      .hljs-attr {
        color: #6f42c1 !important;
      }

      .hljs-string.hljs-attr-value {
        color: #032f62 !important;
      }

      .hljs-regexp,
      .hljs-link {
        color: #032f62 !important;
      }

      .hljs-symbol,
      .hljs-bullet {
        color: #e36209 !important;
      }

      .hljs-built_in,
      .hljs-builtin-name {
        color: #005cc5 !important;
        font-weight: 500;
      }

      .hljs-meta {
        color: #6f42c1 !important;
      }

      .hljs-deletion {
        background: #ffeef0 !important;
        color: #b31d28 !important;
      }

      .hljs-addition {
        background: #f0fff4 !important;
        color: #22863a !important;
      }

      .hljs-emphasis {
        font-style: italic;
      }

      .hljs-strong {
        font-weight: bold;
      }

      /* Special styling for HTML tags */
      .hljs-tag .hljs-attr-name {
        color: #6f42c1 !important;
        font-weight: 500;
      }

      .hljs-tag .hljs-attr-value {
        color: #032f62 !important;
      }

      /* CSS-specific */
      .hljs-selector-class {
        color: #6f42c1 !important;
        font-weight: 600;
      }

      .hljs-property {
        color: #005cc5 !important;
      }

      .hljs-value {
        color: #032f62 !important;
      }

      /* JavaScript-specific */
      .hljs-function {
        color: #6f42c1 !important;
        font-weight: 600;
      }

      .hljs-params {
        color: #e36209 !important;
      }
      
      /* Column layout styles */
      .column-layout-container {
        margin: 2rem 0;
        min-height: 100px;
        background-color: hsl(var(--muted)/10%);
        border: 1px solid hsl(var(--border));
        border-radius: 0.5rem;
        padding: 1rem;
        display: flex !important;
        flex-direction: row !important;
        gap: 1rem !important;
        position: relative;
      }
      
      .column-layout-container > * {
        flex: 1;
        min-width: 0;
      }
      
      .column-layout-container::before {
        content: "Column Layout (" attr(data-columns) " columns)";
        display: block;
        position: absolute;
        top: -0.75rem;
        left: 0.5rem;
        font-size: 0.75rem;
        color: hsl(var(--muted-foreground));
        background: hsl(var(--background));
        padding: 0.125rem 0.5rem;
        border-radius: 0.25rem;
        border: 1px solid hsl(var(--border));
        line-height: 1.2;
        z-index: 10;
      }
      
      .column-layout-container[data-columns="2"]::before {
        content: "2-Column Layout";
      }
      
      .column-layout-container[data-columns="3"]::before {
        content: "3-Column Layout";
      }
      
      .column-block-wrapper {
        padding: 0.5rem;
        flex: 1;
        min-width: 0;
        width: 100%;
      }
      
      .column-block {
        padding: 0.75rem;
        border: 2px dashed hsl(var(--muted-foreground)/20%);
        border-radius: 0.375rem;
        min-height: 100px;
        background-color: hsl(var(--background));
        transition: all 0.2s ease;
      }
      
      .column-block:hover {
        border-color: hsl(var(--muted-foreground)/40%);
        background-color: hsl(var(--accent)/50%);
      }
      
      .ProseMirror-focused .column-block:focus-within {
        border-color: hsl(var(--primary));
        border-style: solid;
        background-color: hsl(var(--background));
      }

      /* Responsive column layout */
      @media (max-width: 768px) {
        .column-layout-container {
          flex-direction: column !important;
          gap: 0.75rem !important;
        }
        
        .column-layout-container::before {
          content: "Column Layout (Stacked)";
        }
        
        .column-block-wrapper {
          width: 100%;
        }
      }

      /* Public side column styling - Clean and professional */
      .prose .column-layout-container {
        margin: 2.5rem 0 !important;
        padding: 0 !important;
        background: none !important;
        border: none !important;
        border-radius: 0 !important;
        display: flex !important;
        gap: 2rem !important;
        position: relative;
      }

      .prose .column-layout-container > div[data-type="column-block"] {
        flex: 1 !important;
        min-width: 0 !important;
        padding: 0 !important;
        border: none !important;
        border-radius: 0 !important;
        background: none !important;
      }

      /* Remove the "Column Layout" label on public side */
      .prose .column-layout-container::before {
        display: none !important;
      }

      /* Ensure proper text flow and spacing in public columns */
      .prose .column-layout-container p,
      .prose .column-layout-container h1,
      .prose .column-layout-container h2,
      .prose .column-layout-container h3,
      .prose .column-layout-container h4,
      .prose .column-layout-container h5,
      .prose .column-layout-container h6 {
        margin-top: 0;
        margin-bottom: 1rem;
      }

      .prose .column-layout-container p:last-child {
        margin-bottom: 0;
      }

      .prose .column-layout-container img {
        width: 100% !important;
        height: auto !important;
        border-radius: 0.5rem;
        margin: 0 !important;
      }

      .prose .column-layout-container ul,
      .prose .column-layout-container ol {
        margin: 1rem 0;
        padding-left: 1.5rem;
      }

      /* Responsive behavior for public side */
      @media (max-width: 768px) {
        .prose .column-layout-container {
          flex-direction: column !important;
          gap: 1.5rem !important;
        }
        
        .prose .column-layout-container > div[data-type="column-block"] {
          width: 100% !important;
        }
      }

      /* Better mobile spacing */
      @media (max-width: 640px) {
        .prose .column-layout-container {
          margin: 1.5rem 0 !important;
          gap: 1rem !important;
        }
      }
    `}</style>
  )
} 