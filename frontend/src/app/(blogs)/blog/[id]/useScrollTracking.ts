import { useState, useEffect, useRef } from 'react'
import { HeadingInfo } from './types'
import { scrollToTop } from './utils'

export function useScrollTracking(headings: HeadingInfo[]) {
  const [activeHeading, setActiveHeading] = useState<string>('')
  const [readingProgress, setReadingProgress] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isTocOpen, setIsTocOpen] = useState(false)
  
  const articleRef = useRef<HTMLDivElement>(null)

  // Track reading progress and active heading
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleScroll = () => {
      try {
        // Calculate reading progress based on document scroll
        const scrollTop = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        
        // How far scrolled in the page in percentage
        const scrolled = (scrollTop / (documentHeight - windowHeight)) * 100;
        setReadingProgress(Math.min(Math.max(scrolled, 0), 100));
        
        // Show scroll to top button after 20% progress (more responsive)
        setShowScrollTop(scrolled > 20);
        
        // Track active heading - safer implementation
        if (headings.length > 0) {
          // Find all heading elements that exist in the DOM
          let foundActiveHeading = false;
          
          for (let i = headings.length - 1; i >= 0; i--) {
            const headingElement = document.getElementById(headings[i].id);
            
            if (headingElement && headingElement.getBoundingClientRect().top <= 150) {
              setActiveHeading(headings[i].id);
              foundActiveHeading = true;
              break;
            }
          }
          
          // If no active heading found (maybe at very top of page)
          if (!foundActiveHeading && headings.length > 0) {
            setActiveHeading(headings[0].id);
          }
        }
      } catch (error) {
        console.error('Error in scroll handler:', error);
      }
    };
    
    // Call once to set initial state
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  return {
    // Scroll state
    activeHeading,
    readingProgress,
    showScrollTop,
    isTocOpen,
    setIsTocOpen,
    
    // Refs
    articleRef,
    
    // Actions
    handleScrollToTop: scrollToTop
  }
} 