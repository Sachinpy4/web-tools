'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Pencil,
  Trash,
  MoreHorizontal,
  UserCog,
  Key
} from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { apiRequest } from '@/lib/apiClient'
import { toast } from '@/components/ui/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { withAdminAuth } from '@/middleware/authCheck'

interface User {
  _id: string
  name: string
  email: string
  role: string
  createdAt: string
}

function UsersPage() {
  // State for users data
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  
  // State for dialogs
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false)
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false)
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  })
  
  // Fetch users on mount
  useEffect(() => {
    fetchUsers()
  }, [])
  
  // Function to fetch users from API
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await apiRequest<{status: string, count: number, data: User[]}>('/auth/users', {
        requireAuth: true
      })
      
      setUsers(response.data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle dialog form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // Handle role select change
  const handleRoleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      role: value
    }))
  }
  
  // Filter function for users
  const handleFilterChange = (role: string | null) => {
    setSelectedRole(role)
  }
  
  // Open edit user dialog
  const openEditUserDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    })
    setIsEditUserDialogOpen(true)
  }
  
  // Open delete confirmation dialog
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setIsDeleteUserDialogOpen(true)
  }
  
  // Open change password dialog
  const openChangePasswordDialog = (user: User) => {
    setSelectedUser(user)
    setFormData(prev => ({
      ...prev,
      password: ''
    }))
    setIsChangePasswordDialogOpen(true)
  }
  
  // Reset form data
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user'
    })
    setSelectedUser(null)
  }
  
  // Handle add user form submission
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (!formData.name || !formData.email || !formData.password) {
        toast({
          title: 'Error',
          description: 'Please fill all required fields',
          variant: 'destructive'
        })
        return
      }
      
      await apiRequest('/auth/register', {
        method: 'POST',
        body: formData,
        requireAuth: true
      })
      
      toast({
        title: 'Success',
        description: 'User added successfully'
      })
      
      // Refetch users and close dialog
      await fetchUsers()
      setIsAddUserDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add user. Please try again.',
        variant: 'destructive'
      })
    }
  }
  
  // Handle edit user form submission
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (!selectedUser || !formData.name || !formData.email) {
        toast({
          title: 'Error',
          description: 'Please fill all required fields',
          variant: 'destructive'
        })
        return
      }
      
      await apiRequest(`/auth/users/${selectedUser._id}`, {
        method: 'PUT',
        body: {
          name: formData.name,
          email: formData.email,
          role: formData.role
        },
        requireAuth: true
      })
      
      toast({
        title: 'Success',
        description: 'User updated successfully'
      })
      
      // Refetch users and close dialog
      await fetchUsers()
      setIsEditUserDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user. Please try again.',
        variant: 'destructive'
      })
    }
  }
  
  // Handle password change submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (!selectedUser || !formData.password) {
        toast({
          title: 'Error',
          description: 'Please enter a password',
          variant: 'destructive'
        })
        return
      }
      
      await apiRequest(`/auth/users/${selectedUser._id}/password`, {
        method: 'PUT',
        body: {
          password: formData.password
        },
        requireAuth: true
      })
      
      toast({
        title: 'Success',
        description: 'Password changed successfully'
      })
      
      setIsChangePasswordDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change password. Please try again.',
        variant: 'destructive'
      })
    }
  }
  
  // Handle delete user
  const handleDeleteUser = async () => {
    try {
      if (!selectedUser) return
      
      await apiRequest(`/auth/users/${selectedUser._id}`, {
        method: 'DELETE',
        requireAuth: true
      })
      
      toast({
        title: 'Success',
        description: 'User deleted successfully'
      })
      
      // Refetch users and close dialog
      await fetchUsers()
      setIsDeleteUserDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user. Please try again.',
        variant: 'destructive'
      })
    }
  }
  
  // Filter users based on search query and selected role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = !selectedRole || user.role === selectedRole
    
    return matchesSearch && matchesRole
  })
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (e) {
      return dateString
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <Button onClick={() => setIsAddUserDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>
      
      {/* Filters and controls */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedRole === null ? "default" : "outline"} 
              size="sm" 
              className="h-7 px-2 text-xs"
              onClick={() => handleFilterChange(null)}
            >
              All <span className="ml-1 bg-primary/10 text-primary-foreground px-1 rounded">{users.length}</span>
            </Button>
            <Button 
              variant={selectedRole === 'admin' ? "default" : "outline"} 
              size="sm" 
              className="h-7 px-2 text-xs"
              onClick={() => handleFilterChange('admin')}
            >
              Admins <span className="ml-1 bg-primary/10 text-primary-foreground px-1 rounded">{users.filter(u => u.role === 'admin').length}</span>
            </Button>
            <Button 
              variant={selectedRole === 'user' ? "default" : "outline"} 
              size="sm" 
              className="h-7 px-2 text-xs"
              onClick={() => handleFilterChange('user')}
            >
              Users <span className="ml-1 bg-primary/10 text-primary-foreground px-1 rounded">{users.filter(u => u.role === 'user').length}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* User table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400'
                        }`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditUserDialog(user)}>
                              <UserCog className="mr-2 h-4 w-4" />
                              <span>Edit User</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openChangePasswordDialog(user)}>
                              <Key className="mr-2 h-4 w-4" />
                              <span>Change Password</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddUser}>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with specific permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsAddUserDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditUserDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleChangePassword}>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedUser?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsChangePasswordDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Change Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsDeleteUserDialogOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDeleteUser}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default withAdminAuth(UsersPage); 