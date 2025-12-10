'use client';

import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Search, MoreHorizontal, Edit, Trash, User, Shield, Eye, EyeOff, Calendar, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useUsers, type User as UserType, type CreateUserData, type UpdateUserData } from '@/hooks/useUsers';
import { toast } from 'sonner';
import { useTeams } from '@/hooks/useTeams';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New user form state
  const [newUser, setNewUser] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    role: 'team-owner',
    status: 'active',
    team: '' // Add team field
  });

  // Edit user form state
  const [editUser, setEditUser] = useState<UpdateUserData>({
    name: '',
    email: '',
    password: '',
    role: 'team-owner',
    status: 'active',
    team: '' // Add team field
  });

  // Use the custom hook
  const { users, loading, pagination, fetchUsers, createUser, updateUser, updateUserStatus } = useUsers({
    search: searchQuery,
    role: roleFilter,
    status: statusFilter,
    limit: 10
  });

  // Fetch teams when component mounts
  const { teams, loadingTeams, fetchTeams } = useTeams();

  // Add useEffect to fetch teams when needed
  useEffect(() => {
    if (isCreateDialogOpen || isEditDialogOpen) {
      fetchTeams();
    }
  }, [isCreateDialogOpen, isEditDialogOpen, fetchTeams]);
  
  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers({
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
        page: 1
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, roleFilter, statusFilter]);
  
  // Handle form input changes for new user
  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  // Handle form input changes for edit user
  const handleEditUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditUser(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes for new user
  const handleNewUserSelectChange = (field: keyof CreateUserData, value: string) => {
    setNewUser(prev => ({ ...prev, [field]: value as any }));
    if (field === 'role' && value === 'team-owner') {
      fetchTeams();
    }
  };

  // Handle select changes for edit user
  const handleEditUserSelectChange = (field: keyof UpdateUserData, value: string) => {
    console.log('Edit user select change:', { field, value });
    
    setEditUser(prev => ({ ...prev, [field]: value as any }));
    if (field === 'role') {
      if (value === 'team-owner') {
        console.log('Fetching teams for team owner role');
        fetchTeams();
      } else {
        // Clear team selection if role is not team-owner
        setEditUser(prev => ({ ...prev, [field]: value as any, team: '' }));
      }
    }
  };
  
  // Handle create user form submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Add validation for team owner
    if (newUser.role === 'team-owner' && !newUser.team) {
      toast.error('Team owners must have a team assigned');
      return;
    }

    setIsSubmitting(true);
    const success = await createUser(newUser);
    
    if (success) {
      setIsCreateDialogOpen(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'team-owner',
        status: 'active',
        team: ''
      });
    }
    setIsSubmitting(false);
  };

  // Handle edit user form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) {
      toast.error('No user selected for editing');
      return;
    }

    if (!editUser.name || !editUser.email) {
      toast.error('Name and email are required');
      return;
    }

    // Add validation for team owner
    if (editUser.role === 'team-owner' && !editUser.team) {
      toast.error('Team owners must have a team assigned');
      return;
    }

    setIsSubmitting(true);
    
    try {
    // Only send fields that have values
    const updateData: UpdateUserData = {};
    if (editUser.name) updateData.name = editUser.name;
    if (editUser.email) updateData.email = editUser.email;
    if (editUser.password) updateData.password = editUser.password;
    if (editUser.role) updateData.role = editUser.role;
    if (editUser.status) updateData.status = editUser.status;
    if (editUser.team) updateData.team = editUser.team;

      console.log('Updating user with data:', {
        userId: editingUser._id,
        ...updateData,
        team: updateData.team // Log team ID being sent
      });

    const success = await updateUser(editingUser._id, updateData);
    
    if (success) {
      setIsEditDialogOpen(false);
      setEditingUser(null);
      setEditUser({
        name: '',
        email: '',
        password: '',
        role: 'team-owner',
        status: 'active',
        team: ''
      });
    }
    } catch (error) {
      console.error('Error in handleEditSubmit:', error);
      toast.error('Failed to update user. Please try again.');
    } finally {
    setIsSubmitting(false);
    }
  };

  // Handle edit user click
  const handleEditClick = (user: UserType) => {
    console.log('Editing user:', {
      userId: user._id,
      currentTeam: user.team?._id,
      role: user.role
    });
    
    setEditingUser(user);
    setEditUser({
      name: user.name,
      email: user.email,
      password: '', // Don't pre-fill password
      role: user.role,
      status: user.status,
      team: user.team?._id || ''
    });
    setIsEditDialogOpen(true);
  };

  // Handle status change
  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    await updateUserStatus(userId, newStatus);
  };
  
  // Toggle password visibility for a specific user
  const togglePasswordVisibility = (userId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };
  
  const itemVariants:any = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
        <p className="text-gray-400">Manage user accounts and permissions</p>
      </motion.div>
      
      {/* Filters and actions */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center"
      >
        <div className="flex flex-1 w-full sm:w-auto gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input 
              placeholder="Search users..." 
              className="pl-10 bg-gray-900 border-gray-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[130px] bg-gray-900 border-gray-700">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="team-owner">Team Owner</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] bg-gray-900 border-gray-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Add User</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-sm:p-4 max-h-[90vh] overflow-y-auto bg-gray-900 text-white border border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create New User</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add a new user to the platform with specified role and permissions.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter user's full name"
                    value={newUser.name}
                    onChange={handleNewUserChange}
                    className="bg-gray-800 border-gray-700"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUser.email}
                    onChange={handleNewUserChange}
                    className="bg-gray-800 border-gray-700"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword["new"] ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={newUser.password}
                      onChange={handleNewUserChange}
                      className="bg-gray-800 border-gray-700 pr-10"
                      required
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      onClick={() => togglePasswordVisibility("new")}
                    >
                      {showPassword["new"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="role" className="text-gray-300">User Role</Label>
                    <Select 
                      value={newUser.role}
                      onValueChange={(value) => handleNewUserSelectChange('role', value)}
                    >
                      <SelectTrigger id="role" className="bg-gray-800 border-gray-700">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="team-owner">Team Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="status" className="text-gray-300">Status</Label>
                    <Select 
                      value={newUser.status}
                      onValueChange={(value) => handleNewUserSelectChange('status', value)}
                    >
                      <SelectTrigger id="status" className="bg-gray-800 border-gray-700">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add team selection for team owners */}
                {newUser.role === 'team-owner' && (
                  <div className="grid gap-2">
                    <Label htmlFor="team" className="text-gray-300">Assign Team</Label>
                    <Select 
                      value={newUser.team}
                      onValueChange={(value) => handleNewUserSelectChange('team', value)}
                    >
                      <SelectTrigger id="team" className="bg-gray-800 border-gray-700">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingTeams ? (
                          <SelectItem value="loading" disabled>Loading teams...</SelectItem>
                        ) : teams.length > 0 ? (
                          teams.map(team => (
                            <SelectItem key={team._id} value={team._id}>
                              {team.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No teams available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {newUser.role === 'team-owner' && !newUser.team && (
                      <p className="text-yellow-500 text-sm">
                        Team owner requires a team assignment
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <DialogFooter className="pt-4 gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-sm:p-4 max-h-[90vh] overflow-y-auto bg-gray-900 text-white border border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Edit User</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update user information and permissions.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name" className="text-gray-300">Full Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    placeholder="Enter user's full name"
                    value={editUser.name}
                    onChange={handleEditUserChange}
                    className="bg-gray-800 border-gray-700"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-email" className="text-gray-300">Email Address</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    placeholder="user@example.com"
                    value={editUser.email}
                    onChange={handleEditUserChange}
                    className="bg-gray-800 border-gray-700"
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-password" className="text-gray-300">Password (leave blank to keep current)</Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      name="password"
                      type={showPassword["edit"] ? "text" : "password"}
                      placeholder="Enter new password or leave blank"
                      value={editUser.password}
                      onChange={handleEditUserChange}
                      className="bg-gray-800 border-gray-700 pr-10"
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      onClick={() => togglePasswordVisibility("edit")}
                    >
                      {showPassword["edit"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-role" className="text-gray-300">User Role</Label>
                    <Select 
                      value={editUser.role}
                      onValueChange={(value) => handleEditUserSelectChange('role', value)}
                    >
                      <SelectTrigger id="edit-role" className="bg-gray-800 border-gray-700">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="team-owner">Team Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="edit-status" className="text-gray-300">Status</Label>
                    <Select 
                      value={editUser.status}
                      onValueChange={(value) => handleEditUserSelectChange('status', value)}
                    >
                      <SelectTrigger id="edit-status" className="bg-gray-800 border-gray-700">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add team selection for team owners */}
                {editUser.role === 'team-owner' && (
                  <div className="grid gap-2">
                    <Label htmlFor="edit-team" className="text-gray-300">Assign Team</Label>
                    <Select 
                      value={editUser.team}
                      onValueChange={(value) => handleEditUserSelectChange('team', value)}
                    >
                      <SelectTrigger id="edit-team" className="bg-gray-800 border-gray-700">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingTeams ? (
                          <SelectItem value="loading" disabled>Loading teams...</SelectItem>
                        ) : teams.length > 0 ? (
                          teams.map(team => (
                            <SelectItem key={team._id} value={team._id}>
                              {team.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No teams available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {editUser.role === 'team-owner' && !editUser.team && (
                      <p className="text-yellow-500 text-sm">
                        Team owner requires a team assignment
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <DialogFooter className="pt-4 gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update User'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
      
      {/* Users table */}
      <motion.div 
        variants={itemVariants}
        className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900/50 backdrop-blur-md"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-900/80">
              <TableRow className="hover:bg-gray-800/50 border-gray-800">
                <TableHead className="text-gray-400">Name</TableHead>
                <TableHead className="text-gray-400">Email</TableHead>
                <TableHead className="text-gray-400">Password</TableHead>
                <TableHead className="text-gray-400">Role</TableHead>
                <TableHead className="text-gray-400">Team</TableHead>
                <TableHead className="text-gray-400">Created</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading users...
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No users found matching the filters
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user, index) => (
                  <motion.tr
                    key={user._id}
                    className="hover:bg-gray-800/40 border-gray-800/50 text-white"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: index * 0.05 } 
                    }}
                  >
                    <TableCell className="font-medium flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-300" />
                      </div>
                      {user.name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="relative">
                      <div className="w-36 lg:w-48 truncate text-gray-500">
                        {showPassword[user._id] 
                          ? user.plainPassword 
                          : '••••••••••'
                        }
                      </div>
                      <button 
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        onClick={() => togglePasswordVisibility(user._id)}
                      >
                        {showPassword[user._id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      {user.role === 'team-owner' ? (
                        user.team ? (
                          <span className="text-blue-400">{user.team.name}</span>
                        ) : (
                          <span className="text-yellow-500">No team assigned</span>
                        )
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(user.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-gray-800" />
                          <DropdownMenuItem 
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => handleEditClick(user)}
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit User</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-800" />
                          <DropdownMenuItem 
                            className="flex items-center gap-2 cursor-pointer text-green-400"
                            onClick={() => handleStatusChange(user._id, 'active')}
                            disabled={user.status === 'active'}
                          >
                            <span>Set Active</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="flex items-center gap-2 cursor-pointer text-yellow-400"
                            onClick={() => handleStatusChange(user._id, 'inactive')}
                            disabled={user.status === 'inactive'}
                          >
                            <span>Set Inactive</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="flex items-center gap-2 cursor-pointer text-red-400"
                            onClick={() => handleStatusChange(user._id, 'suspended')}
                            disabled={user.status === 'suspended'}
                          >
                            <span>Suspend User</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap gap-3 items-center justify-between"
        >
          <div className="text-sm text-gray-400">
            Showing {users.length} of {pagination.total} users
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers({ page: pagination.page - 1 })}
              disabled={pagination.page <= 1}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers({ page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.pages}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Next
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Component for role badge
function RoleBadge({ role }: { role: string }) {
  const roleColors: Record<string, string> = {
    'admin': 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    'moderator': 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    'team-owner': 'bg-green-600/20 text-green-400 border-green-600/30'
  };
  
  const roleLabels: Record<string, string> = {
    'admin': 'Admin',
    'moderator': 'Moderator',
    'team-owner': 'Team Owner'
  };
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${roleColors[role]}`}>
      <Shield className="h-3 w-3" />
      {roleLabels[role]}
    </div>
  );
}

// Component for status badge
function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    'active': 'bg-green-600/20 text-green-400 border-green-600/30',
    'inactive': 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    'suspended': 'bg-red-600/20 text-red-400 border-red-600/30'
  };
  
  return (
    <div className={`inline-flex px-2.5 py-0.5 rounded-full text-xs border ${statusColors[status]}`}>
      <span className="capitalize">{status}</span>
    </div>
  );
} 