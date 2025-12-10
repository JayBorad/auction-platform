const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vaibhavgareja:8JEYG5lRkmxyvglR@vaibhav.nrfp7b4.mongodb.net/auction';

// User Schema - matching the updated model
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  plainPassword: {
    type: String,
    required: false, // Make it optional for backward compatibility
  },
  role: {
    type: String,
    enum: ['admin', 'moderator', 'team-owner'],
    default: 'team-owner',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@auction.com',
    password: 'admin123',
    role: 'admin',
    status: 'active'
  },
  {
    name: 'John Moderator',
    email: 'moderator@auction.com',
    password: 'moderator123',
    role: 'moderator',
    status: 'active'
  },
  {
    name: 'Team Owner 1',
    email: 'team1@auction.com',
    password: 'team123',
    role: 'team-owner',
    status: 'active'
  },
  {
    name: 'Team Owner 2',
    email: 'team2@auction.com',
    password: 'team456',
    role: 'team-owner',
    status: 'inactive'
  },
  {
    name: 'Suspended User',
    email: 'suspended@auction.com',
    password: 'suspended123',
    role: 'team-owner',
    status: 'suspended'
  },
  {
    name: 'Alice Johnson',
    email: 'alice@auction.com',
    password: 'alice123',
    role: 'team-owner',
    status: 'active'
  },
  {
    name: 'Bob Smith',
    email: 'bob@auction.com',
    password: 'bob123',
    role: 'moderator',
    status: 'active'
  },
  {
    name: 'Charlie Brown',
    email: 'charlie@auction.com',
    password: 'charlie123',
    role: 'team-owner',
    status: 'inactive'
  }
];

async function seedUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Clear existing users
    console.log('Clearing existing users...');
    await User.deleteMany({});

    // Create users with hashed passwords
    console.log('Creating sample users...');
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = new User({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        plainPassword: userData.password, // Store plain password for admin viewing
        role: userData.role,
        status: userData.status
      });

      await user.save();
      console.log(`Created user: ${userData.name} (${userData.email}) - Role: ${userData.role}, Status: ${userData.status}, PlainPassword: ${userData.password}`);
    }

    console.log(`Successfully seeded ${sampleUsers.length} users`);
    
  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedUsers(); 