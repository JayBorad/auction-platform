import mongoose from 'mongoose';
import { loadEnv } from './loadEnv';
import { registerModels } from './models';

// Load environment variables
loadEnv();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vaibhavgareja:8JEYG5lRkmxyvglR@vaibhav.nrfp7b4.mongodb.net/auction';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  throw new Error('Please define the MONGODB_URI environment variable');
}

console.log('MongoDB URI is defined in environment variables');

// Connection options optimized for MongoDB Atlas M0 clusters
// M0 clusters have a connection limit of ~500 connections
const connectionOptions = {
  maxPoolSize: 10, // Limit concurrent connections per instance
  minPoolSize: 0, // Allow connections to close when idle
  serverSelectionTimeoutMS: 5000, // How long to try selecting a server
  socketTimeoutMS: 45000, // How long to wait for socket operations
  connectTimeoutMS: 10000, // How long to wait for initial connection
  retryWrites: true, // Retry write operations on network errors
};

// Configure mongoose to disable buffering (prevents connection issues)
mongoose.set('bufferCommands', false);

// Simple connection function with connection pooling
async function connectDB() {
  try {
    if (mongoose.connection.readyState >= 1) {
      console.log('Using existing database connection');
      registerModels(); // Register models even with existing connection
      return mongoose.connection;
    }
    
    console.log('Establishing new database connection with connection pooling...');
    await mongoose.connect(MONGODB_URI as string, connectionOptions);
    console.log('MongoDB connection established successfully');
    registerModels(); // Register models after new connection
    
    // Log connection pool info
    console.log(`Connection pool configured: maxPoolSize=${connectionOptions.maxPoolSize}`);
    
    return mongoose.connection;
  } catch (error) {
    console.error('Failed to establish database connection:', error);
    throw error;
  }
}

export default connectDB; 