import { UserRole } from '@/constants/roles';

export interface Team {
  _id: string;
  name: string;
  logo: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  team?: Team;
}

export interface AuthSession {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
} 