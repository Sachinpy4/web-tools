import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/lib/apiClient'
import { toast } from '@/components/ui/use-toast'
import { BlogPost, HeadingInfo } from './types'
import { getRelatedPosts, extractHeadings } from './utils'

export function useBlogPostData(blogId: string) {
  const router = useRouter()
  
  // State for blog post data
  const [post, setPost] = useState<BlogPost | null>(null)
  const [processedContent, setProcessedContent] = useState<string>('')
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [headings, setHeadings] = useState<HeadingInfo[]>([])
  
  // State for like functionality
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  
  // State for sidebar data
  const [categories, setCategories] = useState<string[]>([])
  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([])

  // Handle liking a post with persistence
  const handleLike = async () => {
    if (!post) return;
    
    // If already liked, don't allow unliking
    if (liked) {
      toast({
        title: "Already liked",
        description: "You've already liked this article!",
        duration: 2000,
      });
      return;
    }
    
    // Set new state to true (only allow liking, not unliking)
    const newLikedState = true;
    
    // Optimistically update the UI
    setLiked(newLikedState);
    setLikeCount(prevCount => prevCount + 1);
    
    try {
      // Make real API call to update like status
      const response = await apiRequest<{
        status: string;
        data: { likes: number; hasLiked: boolean };
      }>(`/blogs/${post._id}/like`, {
        method: 'POST',
        body: { liked: newLikedState },
      });
      
      if (response.status === 'success') {
        // Update with the actual count from the server
        setLikeCount(response.data.likes);
        setLiked(response.data.hasLiked);
        
        toast({
          title: "Thanks for your like!",
          description: "We're glad you enjoyed this article!",
          duration: 2000,
        });
      } else {
        throw new Error('Failed to update like');
      }
    } catch (error) {
      // If the API call fails, revert the optimistic update
      console.error('Error updating like on server:', error);
      setLiked(false);
      setLikeCount(prevCount => prevCount - 1);
      
      toast({
        title: 'Error',
        description: 'Failed to update like status. Please try again.',
        variant: 'destructive',
      });
    }
  }

  // Fetch blog post data
  useEffect(() => {
    const fetchBlogPost = async () => {
      try {
        setLoading(true)
        setError(false)
        
        // First try to fetch by slug using the new endpoint
        try {
          // This is likely a slug if it doesn't look like a MongoDB ID
          const isSlug = !blogId.match(/^[0-9a-fA-F]{24}$/);
          
          if (isSlug) {
            const response = await apiRequest<{
              status: string;
              data: BlogPost;
            }>(`/blogs/slug/${encodeURIComponent(blogId)}`, { 
              noRedirect: true 
            });
            
            if (response.data) {
              // Set the post data after processing
              setPost(response.data);
              
              // Process headings and update content
              const { headingsData, updatedContent } = extractHeadings(response.data.content);
              setHeadings(headingsData);
              setProcessedContent(updatedContent);
              
              // Set the actual like count from the database
              setLikeCount(response.data.likes || 0);
              
              // Check if user has already liked via API
              const likeStatusResponse = await apiRequest<{
                status: string;
                data: { hasLiked: boolean; likes: number };
              }>(`/blogs/${response.data._id}/like`, {
                method: 'GET',
                noRedirect: true
              });
              
              if (likeStatusResponse.status === 'success') {
                setLiked(likeStatusResponse.data.hasLiked);
              }
              
              // Fetch related posts (posts with similar tags)
              if (response.data.tags && response.data.tags.length > 0) {
                const allPostsResponse = await apiRequest<{
                  status: string;
                  data: BlogPost[];
                }>('/blogs/public', { 
                  noRedirect: true 
                });
                
                if (allPostsResponse.data) {
                  const related = getRelatedPosts(response.data, allPostsResponse.data);
                  setRelatedPosts(related);
                }
              }
              
              return; // Exit early if found by slug
            }
          }
        } catch (slugError) {
          // Not found by slug, will try by ID
        }
        
        // If not found by slug or it's a MongoDB ID, try to fetch by ID
        const response = await apiRequest<{
          status: string;
          data: BlogPost;
        }>(`/blogs/${blogId}`, { 
          noRedirect: true 
        });
        
        setPost(response.data);
        
        // Process headings and update content
        const { headingsData, updatedContent } = extractHeadings(response.data.content);
        setHeadings(headingsData);
        setProcessedContent(updatedContent);
        
        // Set the actual like count from the database
        setLikeCount(response.data.likes || 0);
        
        // Check if user has already liked via API
        const likeStatusResponse = await apiRequest<{
          status: string;
          data: { hasLiked: boolean; likes: number };
        }>(`/blogs/${response.data._id}/like`, {
          method: 'GET',
          noRedirect: true
        });
        
        if (likeStatusResponse.status === 'success') {
          setLiked(likeStatusResponse.data.hasLiked);
        }
        
        // Update URL to use slug if available (for better SEO)
        // But don't cause a page reload - just update the address bar
        if (response.data.slug && blogId !== response.data.slug) {
          window.history.pushState(
            { id: response.data._id, slug: response.data.slug },
            '',
            `/blog/${response.data.slug}`
          );
        }
        
        // Fetch related posts (posts with similar tags)
        if (response.data.tags && response.data.tags.length > 0) {
          const allPostsResponse = await apiRequest<{
            status: string;
            data: BlogPost[];
          }>('/blogs/public', { 
            noRedirect: true 
          });
          
          if (allPostsResponse.data) {
            const related = getRelatedPosts(response.data, allPostsResponse.data);
            setRelatedPosts(related);
          }
        }
      } catch (error) {
        console.error('Error fetching blog post:', error);
        setError(true);
        toast({
          title: 'Error',
          description: 'Failed to load the blog post. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (blogId) {
      fetchBlogPost();
    }
  }, [blogId, router]);

  // Fetch categories and latest posts
  useEffect(() => {
    const fetchCategoriesAndLatest = async () => {
      try {
        // Fetch all blog posts to extract categories
        const allPostsResponse = await apiRequest<{
          status: string;
          data: BlogPost[];
        }>('/blogs/public?limit=20', { 
          noRedirect: true 
        });
        
        if (allPostsResponse.data) {
          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set(allPostsResponse.data.map(post => post.category))
          ).sort();
          setCategories(uniqueCategories);
          
          // Get latest posts (sorted by date)
          const latest = [...allPostsResponse.data]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 3); // Show only 3 latest posts
          setLatestPosts(latest);
        }
      } catch (error) {
        console.error('Error fetching categories and latest posts:', error);
      }
    };
    
    fetchCategoriesAndLatest();
  }, []);

  return {
    // Blog post data
    post,
    processedContent,
    relatedPosts,
    loading,
    error,
    headings,
    
    // Like functionality
    liked,
    likeCount,
    handleLike,
    
    // Sidebar data
    categories,
    latestPosts
  }
} 