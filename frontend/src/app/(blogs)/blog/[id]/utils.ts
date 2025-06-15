import { BlogPost, HeadingInfo } from './types'
import { getProxiedImageUrl } from '@/lib/imageProxy'
import { toast } from '@/components/ui/use-toast'

// Get related posts based on tags
export const getRelatedPosts = (currentPost: BlogPost, allPosts: BlogPost[]) => {
  if (!currentPost) return []
  
  // Filter out the current post and get posts with matching tags
  return allPosts
    .filter(post => post._id !== currentPost._id)
    .map(post => {
      // Count matching tags
      const matchingTags = post.tags.filter(tag => 
        currentPost.tags.includes(tag)
      ).length
      
      return { ...post, matchingTags }
    })
    .filter(post => post.matchingTags > 0) // Only include posts with at least one matching tag
    .sort((a, b) => b.matchingTags - a.matchingTags) // Sort by number of matching tags
    .slice(0, 3) // Get top 3 related posts
}

// Format author name
export const getAuthorName = (author: { name: string; email: string } | string): string => {
  if (typeof author === 'string') {
    return 'Anonymous'
  }
  return author.name
}

// Format author initials
export const getAuthorInitials = (author: { name: string; email: string } | string): string => {
  if (typeof author === 'string') {
    return 'A'
  }
  return author.name.split(' ').map(n => n[0]).join('')
}

// Copy current URL to clipboard
export const copyToClipboard = () => {
  const url = window.location.href
  navigator.clipboard.writeText(url)
  toast({
    title: "Link copied!",
    description: "The link has been copied to your clipboard.",
    duration: 2000,
  })
}

// Scroll to top function
export const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// Extract headings from HTML content
export const extractHeadings = (htmlContent: string) => {
  try {
    // Parse the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Find all heading elements
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    const headingsData: HeadingInfo[] = Array.from(headingElements).map((el, index) => {
      const text = el.textContent || '';
      const id = text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .trim() + `-${index}`; // Add index to ensure uniqueness
      
      // Set the ID on the element so the TOC links work
      el.id = id;
      
      return {
        id,
        text,
        level: parseInt(el.tagName.substring(1), 10) || 2 // Default to h2 if parsing fails
      };
    });
    
    return { 
      headingsData, 
      updatedContent: doc.body.innerHTML 
    };
  } catch (error) {
    console.error('Error extracting headings:', error);
    return { headingsData: [], updatedContent: htmlContent };
  }
}

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check if text contains URLs
export const containsUrl = (text: string): boolean => {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([^\s]+\.[a-z]{2,})/i;
  return urlRegex.test(text);
}

// Format comment date
export const formatCommentDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // Calculate the difference in milliseconds
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Convert to different units
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Format based on how recent the comment is
    if (diffSecs < 60) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      // For older comments, show the actual date
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown date';
  }
}

// Process blog content and replace backend URLs with proxied ones
export const processContentImages = (htmlContent: string): string => {
  if (!htmlContent) return htmlContent
  
  // Replace backend image URLs in the HTML content with proxied URLs
  return htmlContent.replace(
    /src="([^"]*\/api\/media\/file\/[^"]*)"/g,
    (match, url) => {
      const proxiedUrl = getProxiedImageUrl(url)
      return `src="${proxiedUrl || url}"`
    }
  ).replace(
    /src='([^']*\/api\/media\/file\/[^']*)'/g,
    (match, url) => {
      const proxiedUrl = getProxiedImageUrl(url)
      return `src='${proxiedUrl || url}'`
    }
  )
}

// Helper function to get proxied featured image URL
export const getProxiedFeaturedImage = (imageUrl: string): string => {
  if (!imageUrl) return imageUrl
  return getProxiedImageUrl(imageUrl) || imageUrl
}

// Share on social media platforms
export const shareOnSocial = (platform: string, post: BlogPost | null) => {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = post?.title || 'Check out this article';
  
  let shareUrl = '';
  
  switch (platform) {
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      break;
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      break;
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
      break;
    case 'whatsapp':
      shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
      break;
    case 'instagram':
      // Instagram doesn't have a direct share URL, so we'll copy the link instead
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Share this link on Instagram.",
        duration: 2000,
      });
      return;
    default:
      return;
  }
  
  if (shareUrl) {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }
} 