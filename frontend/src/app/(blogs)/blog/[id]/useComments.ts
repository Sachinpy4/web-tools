import { useState, useEffect } from 'react'
import { apiRequest } from '@/lib/apiClient'
import { toast } from '@/components/ui/use-toast'
import { BlogPost, Comment } from './types'
import { isValidEmail, containsUrl } from './utils'

export function useComments(post: BlogPost | null) {
  // Comment form state
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentName, setCommentName] = useState('')
  const [commentEmail, setCommentEmail] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  
  // Pagination state
  const [commentPage, setCommentPage] = useState(1)
  const [hasMoreComments, setHasMoreComments] = useState(false)
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false)
  
  // IP restriction state
  const [hasSubmittedComment, setHasSubmittedComment] = useState(false)

  // Load comments when post changes
  useEffect(() => {
    if (!post) return;
    
    // Only check localStorage if this post has IP-based comment limiting enabled
    if (post.limitCommentsPerIp) {
      const submittedComments = JSON.parse(localStorage.getItem('submittedComments') || '[]');
      if (submittedComments.includes(post._id)) {
        setHasSubmittedComment(true);
      }
    } else {
      // If IP limiting is disabled, always allow comments
      setHasSubmittedComment(false);
    }
    
    const fetchComments = async () => {
      try {
        const response = await apiRequest<{ status: string; data: Comment[]; total: number; page: number; pages: number }>(
          `/blogs/${post._id}/comments?limit=5`, 
          { requireAuth: false }
        );
        
        setComments(response.data);
        setCommentCount(response.total);
        setCommentPage(1);
        setHasMoreComments(response.pages > 1);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setComments([]);
        setCommentCount(0);
        setHasMoreComments(false);
      }
    };
    
    fetchComments();
  }, [post]);

  // Function to load more comments
  const handleLoadMoreComments = async () => {
    if (!post || isLoadingMoreComments) return;
    
    setIsLoadingMoreComments(true);
    
    try {
      const nextPage = commentPage + 1;
      const response = await apiRequest<{ status: string; data: Comment[]; total: number; page: number; pages: number }>(
        `/blogs/${post._id}/comments?page=${nextPage}&limit=5`, 
        { requireAuth: false }
      );
      
      // Append new comments to existing ones
      setComments(prevComments => [...prevComments, ...response.data]);
      setCommentPage(nextPage);
      setHasMoreComments(nextPage < response.pages);
    } catch (error) {
      console.error('Error loading more comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load more comments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMoreComments(false);
    }
  };

  // Handle submitting a comment
  const handleSubmitComment = async () => {
    // Validate required fields
    if (!commentText.trim() || !commentName.trim() || !commentEmail.trim() || !post) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate email format
    if (!isValidEmail(commentEmail.trim())) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }
    
    // Check for URLs in the comment text
    if (containsUrl(commentText)) {
      toast({
        title: 'Links not allowed',
        description: 'Please remove any URLs or web addresses from your comment',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }
    
    setIsSubmittingComment(true);
    
    try {
      // Call the API to post the comment
      const submitResponse = await apiRequest(`/blogs/${post._id}/comments`, {
        method: 'POST',
        body: {
          name: commentName,
          email: commentEmail,
          text: commentText
        },
        requireAuth: false
      });
      
      // Clear the form
      setCommentText('');
      setCommentName('');
      setCommentEmail('');
      
      // Refresh comments (reset to first page)
      const commentsResponse = await apiRequest<{ status: string; data: Comment[]; total: number; page: number; pages: number }>(
        `/blogs/${post._id}/comments?limit=5`, 
        { requireAuth: false }
      );
      
      setComments(commentsResponse.data);
      setCommentCount(commentsResponse.total);
      setCommentPage(1);
      setHasMoreComments(commentsResponse.pages > 1);
      
      // Mark this post as having a submitted comment only if IP limiting is enabled
      if (post.limitCommentsPerIp) {
        setHasSubmittedComment(true);
        const submittedComments = JSON.parse(localStorage.getItem('submittedComments') || '[]');
        if (!submittedComments.includes(post._id)) {
          submittedComments.push(post._id);
          localStorage.setItem('submittedComments', JSON.stringify(submittedComments));
        }
      }
      
      // Show success message
      toast({
        title: 'Comment submitted',
        description: post.requireCommentApproval ? 
          'Your comment has been submitted and is awaiting approval.' :
          'Your comment has been posted successfully.',
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Error posting comment:', error);
      
      // Handle specific duplicate comment error first
      if (error.message && error.message.includes('already submitted a comment')) {
        // Only apply client-side restrictions if IP limiting is enabled
        if (post.limitCommentsPerIp) {
          setHasSubmittedComment(true);
          // Also store in localStorage for future visits
          const submittedComments = JSON.parse(localStorage.getItem('submittedComments') || '[]');
          if (!submittedComments.includes(post._id)) {
            submittedComments.push(post._id);
            localStorage.setItem('submittedComments', JSON.stringify(submittedComments));
          }
        }
        toast({
          title: 'Comment Already Submitted',
          description: 'You have already posted a comment on this article. Only one comment per person is allowed.',
          variant: 'destructive',
          duration: 7000,
        });
        return;
      }
      
      // Display specific validation error messages from the API
      let errorMessage = 'Failed to post your comment. Please try again.';
      
      if (error.validation && error.message) {
        // If it's a validation error, show the specific message
        errorMessage = error.message;
        
        // Highlight the specific field with error if possible
        if (error.message.toLowerCase().includes('email')) {
          toast({
            title: 'Invalid Email',
            description: errorMessage,
            variant: 'destructive',
            duration: 5000,
          });
          return;
        } else if (error.message.toLowerCase().includes('link') || error.message.toLowerCase().includes('url')) {
          toast({
            title: 'Links Not Allowed',
            description: errorMessage,
            variant: 'destructive',
            duration: 5000,
          });
          return;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return {
    // Comment data
    comments,
    commentCount,
    
    // Form state
    commentText,
    setCommentText,
    commentName,
    setCommentName,
    commentEmail,
    setCommentEmail,
    showComments,
    setShowComments,
    
    // Submission state
    isSubmittingComment,
    hasSubmittedComment,
    
    // Pagination
    commentPage,
    hasMoreComments,
    isLoadingMoreComments,
    handleLoadMoreComments,
    
    // Actions
    handleSubmitComment
  }
} 