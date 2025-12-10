import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface User {
  _id: string;
  name: string;
  email: string;
  plainPassword: string;
  role: 'admin' | 'moderator' | 'team-owner';
  status: 'active' | 'inactive' | 'suspended';
  team?: {
    _id: string;
    name: string;
    logo?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'moderator' | 'team-owner';
  status: 'active' | 'inactive' | 'suspended';
  team?: string; // Team ID
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'moderator' | 'team-owner';
  status?: 'active' | 'inactive' | 'suspended';
  team?: string; // Team ID
}

export interface UsersResponse {
  success: boolean;
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export function useUsers(filters: UserFilters = {}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const fetchUsers = async (newFilters: UserFilters = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      const finalFilters = { ...filters, ...newFilters };
      
      if (finalFilters.page) params.append('page', finalFilters.page.toString());
      if (finalFilters.limit) params.append('limit', finalFilters.limit.toString());
      if (finalFilters.search) params.append('search', finalFilters.search);
      if (finalFilters.role && finalFilters.role !== 'all') params.append('role', finalFilters.role);
      if (finalFilters.status && finalFilters.status !== 'all') params.append('status', finalFilters.status);

      const response = await fetch(`/api/users?${params.toString()}`);
      const result: UsersResponse = await response.json();

      if (result.success) {
        setUsers(result.data);
        setPagination(result.pagination);
      } else {
        toast.error(result.error || 'Failed to fetch users');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: CreateUserData): Promise<boolean> => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('User created successfully');
        fetchUsers(); // Refresh the list
        return true;
      } else {
        console.error('Failed to create user:', result.error);
        toast.error(result.error || 'Failed to create user');
        return false;
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
      return false;
    }
  };

  const updateUser = async (userId: string, userData: UpdateUserData): Promise<boolean> => {
    try {
      // Validate team assignment for team owners
      if (userData.role === 'team-owner' && !userData.team) {
        toast.error('Team assignment is required for team owners');
        return false;
      }

      // Clear team if role is changed from team-owner
      if (userData.role && userData.role !== 'team-owner') {
        userData.team = null;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!result.success) {
        console.error('Failed to update user:', result);
        toast.error(result.error || 'Failed to update user');
        return false;
      }

      toast.success('User updated successfully');
      fetchUsers(); // Refresh the list
      return true;
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
      return false;
    }
  };

  const updateUserStatus = async (userId: string, status: 'active' | 'inactive' | 'suspended'): Promise<boolean> => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('User status updated successfully');
        fetchUsers(); // Refresh the list
        return true;
      } else {
        console.error('Failed to update user status:', result.error);
        toast.error(result.error || 'Failed to update user status');
        return false;
      }
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast.error(error.message || 'Failed to update user status');
      return false;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    pagination,
    fetchUsers,
    createUser,
    updateUser,
    updateUserStatus,
  };
} 