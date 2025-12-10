export type UserRole = 'admin' | 'moderator' | 'team-owner';
 
export const ROLE_PATHS = {
  admin: '/admin/dashboard',
  moderator: '/moderator/dashboard',
  teamOwner: '/team-owner/dashboard',
}; 