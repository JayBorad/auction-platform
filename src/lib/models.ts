import mongoose from 'mongoose';
import '../models/Tournament';
import '../models/Auction';
import '../models/Bid';
import '../models/Player';
import '../models/Team';
import '../models/User';
import '../models/SystemSettings';

export function registerModels() {
  // This function will be called to ensure all models are registered
  // The imports above will execute the model definitions
  console.log('Models registered:', Object.keys(mongoose.models).join(', '));
} 