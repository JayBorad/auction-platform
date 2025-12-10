import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Attempt to load environment variables from .env files
export function loadEnv() {
  // Try to load from different possible .env files
  const envFiles = ['.env.local', '.env', '.env.development.local', '.env.development'];
  
  let loaded = false;
  
  for (const file of envFiles) {
    try {
      const envPath = path.resolve(process.cwd(), file);
      if (fs.existsSync(envPath)) {
        config({ path: envPath });
        console.log(`Loaded environment variables from ${file}`);
        loaded = true;
        break;
      }
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }
  
  if (!loaded) {
    console.warn('No .env file found. Using environment variables from process.env');
  }
  
  // Validate essential environment variables
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI environment variable is not set!');
  } else {
    console.log('MONGODB_URI is set in environment');
  }
} 