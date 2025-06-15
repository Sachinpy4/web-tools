'use client'

import React, { useState, useEffect } from 'react'
import { withAdminAuth } from '@/middleware/authCheck'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { apiRequest } from '@/lib/apiClient'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pagination } from '@/components/ui/pagination'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle, AlertCircle, Trash, MoreHorizontal, Search, RefreshCw, Check, X } from 'lucide-react'
import Link from 'next/link'

interface Comment {
  _id: string;
  blog: {
    _id: string;
    title: string;
  } | null;
  name: string;
  email: string;
  text: string;
  approved: boolean;
  ipAddress: string;
  createdAt: string;
  replies?: Comment[];
}

function CommentsManagementPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | string[]>('');
  const [isApproving, setIsApproving] = useState(false);
  const [blogFilter, setBlogFilter] = useState<string | null>(null);
  
  // Get URL search params
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  
  // Check for blog param on initial load
  useEffect(() => {
    const blogId = searchParams.get('blog');
    if (blogId) {
      setBlogFilter(blogId);
    }
  }, []);
  
  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // Define query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', '10');
      
      if (searchQuery) {
        queryParams.append('search', searchQuery);
      }
      
      if (filter !== 'all') {
        queryParams.append('approved', filter === 'approved' ? 'true' : 'false');
      }
      
      // Add blog filter if present
      if (blogFilter) {
        queryParams.append('blog', blogFilter);
      }
      
      // Make the API request
      const response = await apiRequest<{
        status: string;
        data: Comment[];
        total: number;
        page: number;
        pages: number;
      }>(`/comments?${queryParams.toString()}`, {
        requireAuth: true
      });
      
      setComments(response.data);
      setTotalComments(response.total);
      setTotalPages(response.pages);
      
      // Reset selection when fetching new comments
      setSelectedComments([]);
      setIsSelectAll(false);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchComments();
  }, [page, filter, blogFilter]);
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 when searching
    fetchComments();
  };
  
  // Handle filter change
  const handleFilterChange = (value: string) => {
    setFilter(value as 'all' | 'pending' | 'approved');
    setPage(1); // Reset to page 1 when changing filters
  };
  
  // Toggle selection of a comment
  const toggleSelect = (commentId: string) => {
    if (selectedComments.includes(commentId)) {
      setSelectedComments(prev => prev.filter(id => id !== commentId));
    } else {
      setSelectedComments(prev => [...prev, commentId]);
    }
  };
  
  // Toggle select all comments
  const toggleSelectAll = () => {
    if (isSelectAll || selectedComments.length === comments.length) {
      setSelectedComments([]);
      setIsSelectAll(false);
    } else {
      setSelectedComments(comments.map(comment => comment._id));
      setIsSelectAll(true);
    }
  };
  
  // Approve a comment
  const approveComment = async (commentId: string) => {
    try {
      setIsApproving(true);
      
      await apiRequest(`/comments/${commentId}/approve`, {
        method: 'PATCH',
        requireAuth: true
      });
      
      toast({
        title: 'Comment approved',
        description: 'The comment has been approved and is now publicly visible.'
      });
      
      // Update local state
      setComments(prevComments => 
        prevComments.map(comment => 
          comment._id === commentId 
            ? { ...comment, approved: true } 
            : comment
        )
      );
    } catch (error) {
      console.error('Error approving comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve comment',
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
  };
  
  // Approve multiple comments
  const approveSelectedComments = async () => {
    if (selectedComments.length === 0) return;
    
    try {
      setIsApproving(true);
      
      await apiRequest('/comments/approve-batch', {
        method: 'PATCH',
        body: { commentIds: selectedComments },
        requireAuth: true
      });
      
      toast({
        title: 'Comments approved',
        description: `${selectedComments.length} comments have been approved.`
      });
      
      // Update local state
      setComments(prevComments => 
        prevComments.map(comment => 
          selectedComments.includes(comment._id) 
            ? { ...comment, approved: true } 
            : comment
        )
      );
      
      // Reset selection
      setSelectedComments([]);
      setIsSelectAll(false);
    } catch (error) {
      console.error('Error approving comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve comments',
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
  };
  
  // Delete a comment
  const deleteComment = async (commentId: string) => {
    try {
      setIsDeleting(true);
      
      await apiRequest(`/comments/${commentId}`, {
        method: 'DELETE',
        requireAuth: true
      });
      
      toast({
        title: 'Comment deleted',
        description: 'The comment has been permanently deleted.'
      });
      
      // Remove from local state
      setComments(prevComments => 
        prevComments.filter(comment => comment._id !== commentId)
      );
      
      // Remove from selected comments if it was selected
      if (selectedComments.includes(commentId)) {
        setSelectedComments(prev => prev.filter(id => id !== commentId));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setConfirmDelete('');
    }
  };
  
  // Delete multiple comments
  const deleteSelectedComments = async () => {
    if (selectedComments.length === 0) return;
    
    try {
      setIsDeleting(true);
      
      await apiRequest('/comments/delete-batch', {
        method: 'DELETE',
        body: { commentIds: selectedComments },
        requireAuth: true
      });
      
      toast({
        title: 'Comments deleted',
        description: `${selectedComments.length} comments have been permanently deleted.`
      });
      
      // Remove from local state
      setComments(prevComments => 
        prevComments.filter(comment => !selectedComments.includes(comment._id))
      );
      
      // Reset selection
      setSelectedComments([]);
      setIsSelectAll(false);
    } catch (error) {
      console.error('Error deleting comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comments',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setConfirmDelete([]);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comment Management</h1>
        <p className="text-muted-foreground mt-1">
          View, approve, and manage comments across all blog posts.
        </p>
      </div>
      
      {/* Active blog filter indicator */}
      {blogFilter && (
        <div className="bg-muted p-3 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <Badge variant="outline" className="mr-2">Blog Filter Active</Badge>
            <p className="text-sm">Showing comments for a specific blog post</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setBlogFilter(null);
              // Update URL without the blog parameter
              const url = new URL(window.location.href);
              url.searchParams.delete('blog');
              window.history.pushState({}, '', url.toString());
            }}
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filter
          </Button>
        </div>
      )}
      
      {/* Filters and Actions */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex w-full lg:w-1/3 gap-2">
          <Input
            placeholder="Search comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" size="icon">
            <Search className="h-4 w-4" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setSearchQuery('');
              fetchComments();
            }}
            title="Reset search"
          >
            <X className="h-4 w-4" />
          </Button>
        </form>
        
        <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter comments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Comments</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchComments}
              title="Refresh comments"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            {selectedComments.length > 0 && (
              <>
                <Button 
                  variant="secondary" 
                  onClick={() => approveSelectedComments()}
                  disabled={isApproving}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve ({selectedComments.length})
                </Button>
                
                <Button 
                  variant="destructive" 
                  onClick={() => setConfirmDelete(selectedComments)}
                  disabled={isDeleting}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete ({selectedComments.length})
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalComments.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comments.filter(c => !c.approved).length} 
              <span className="text-sm font-normal text-muted-foreground ml-1">
                (this page)
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comments.filter(c => c.approved).length}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                (this page)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Comments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading comments...</p>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium mb-2">No comments found</h3>
              <p className="text-muted-foreground">
                {filter !== 'all' 
                  ? `No ${filter === 'pending' ? 'pending' : 'approved'} comments found.` 
                  : 'No comments match your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isSelectAll || (comments.length > 0 && selectedComments.length === comments.length)} 
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all comments"
                      />
                    </TableHead>
                    <TableHead className="w-56">Author</TableHead>
                    <TableHead className="max-w-md">Comment</TableHead>
                    <TableHead className="w-48">Post</TableHead>
                    <TableHead className="w-40">Date</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comments.map((comment) => (
                    <TableRow key={comment._id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedComments.includes(comment._id)} 
                          onCheckedChange={() => toggleSelect(comment._id)}
                          aria-label={`Select comment by ${comment.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{comment.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {comment.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            IP: {comment.ipAddress}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2">{comment.text}</p>
                      </TableCell>
                      <TableCell>
                        {comment.blog ? (
                          <Link 
                            href={`/dashboard/blogs/edit/${comment.blog._id}`}
                            className="text-sm hover:underline truncate block"
                          >
                            {comment.blog.title}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Blog post deleted
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm" title={new Date(comment.createdAt).toLocaleString()}>
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </p>
                      </TableCell>
                      <TableCell>
                        {comment.approved ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!comment.approved && (
                              <DropdownMenuItem 
                                onClick={() => approveComment(comment._id)}
                                disabled={isApproving}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => setConfirmDelete(comment._id)}
                              disabled={isDeleting}
                              className="text-destructive"
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {comment.blog && (
                              <DropdownMenuItem asChild>
                                <Link href={`/blog/${comment.blog._id}`} target="_blank">
                                  View On Blog
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
              <p className="text-center text-sm text-muted-foreground mt-2">
                Showing {comments.length} of {totalComments} comments
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!confirmDelete} 
        onOpenChange={(open) => !open && setConfirmDelete('')}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              {Array.isArray(confirmDelete) 
                ? `Are you sure you want to delete ${confirmDelete.length} comments? This action cannot be undone.`
                : "Are you sure you want to delete this comment? This action cannot be undone."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (Array.isArray(confirmDelete)) {
                  deleteSelectedComments();
                } else {
                  deleteComment(confirmDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default withAdminAuth(CommentsManagementPage); 