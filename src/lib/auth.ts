import { cookies } from 'next/headers';

// Function to get user from cookies on the server side
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  
  if (!userCookie?.value) {
    return null;
  }
  
  try {
    return JSON.parse(decodeURIComponent(userCookie.value));
  } catch (e) {
    console.error('Error parsing user cookie:', e);
    return null;
  }
} 