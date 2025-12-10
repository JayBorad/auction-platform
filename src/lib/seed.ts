import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'Moderator User',
    email: 'moderator@example.com',
    password: 'moderator123',
    role: 'moderator',
  },
];

export async function seedUsers() {
  try {
    await connectDB();
    
    // Check if users already exist
    const adminExists = await User.findOne({ email: users[0].email });
    const moderatorExists = await User.findOne({ email: users[1].email });
    
    // If both users exist, return
    if (adminExists && moderatorExists) {
      console.log('Seed users already exist. Skipping seed operation.');
      return { success: true, message: 'Users already seeded' };
    }
    
    // Create users if they don't exist
    for (const user of users) {
      const existingUser = await User.findOne({ email: user.email });
      
      if (!existingUser) {
        // Hash password
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Create user
        await User.create({
          ...user,
          password: hashedPassword,
        });
        
        console.log(`Created user: ${user.email} with role: ${user.role}`);
      } else {
        console.log(`User ${user.email} already exists. Skipping.`);
      }
    }
    
    return { success: true, message: 'Database seeded successfully' };
  } catch (error) {
    console.error('Error seeding database:', error);
    return { success: false, message: 'Error seeding database' };
  }
} 