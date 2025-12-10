import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@/constants/roles';

interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  plainPassword?: string;
  role: 'admin' | 'moderator' | 'team-owner';
  status: 'active' | 'inactive' | 'suspended';
  team?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    // required: [true, 'Email is required'],
    // unique: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  plainPassword: {
    type: String,
    required: false,
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
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
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

// Update timestamps on save
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Clear team field if role is not team-owner
UserSchema.pre('save', function(this: IUser & { team: any }, next) {
  if (this.role !== 'team-owner') {
    this.team = null;
  }
  next();
});

// Don't return password in queries
UserSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.plainPassword;
    return ret;
  },
});

// Indexes for performance
// UserSchema.index({ email: 1 }); // Uncomment if email is unique
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ team: 1 });

const User =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
