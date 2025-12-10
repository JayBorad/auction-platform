/**
 * Script to seed players data into MongoDB database
 * Run with: node src/db/seed-players.js
 */

const mongoose = require('mongoose');
const players = require('./seeds/players-seed');
require('dotenv').config();
const { MongoClient } = require('mongodb');

// MongoDB connection URL
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/auction-app';

// Player schema definition
const playerSchema = new mongoose.Schema({
  name: String,
  age: Number,
  role: String,
  basePrice: Number,
  soldPrice: Number,
  team: mongoose.Schema.Types.ObjectId,
  tournaments: [mongoose.Schema.Types.ObjectId],
  image: String,
  status: String,
  battingHand: String,
  battingStrikeRate: Number,
  bestBowlingStats: String,
  bowlingAverage: Number,
  bowlingHand: String,
  bowlingStrikeRate: Number,
  economy: Number,
  highestScore: Number,
  ipl2025Team: String,
  runs: Number,
  wickets: Number
}, { timestamps: true });

// Create Player model
const Player = mongoose.model('Player', playerSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Clear existing players if needed
    await Player.deleteMany({});
    console.log('Cleared existing players');
    
    // Insert players with predefined IDs
    for (const player of players) {
      // Convert string ID to ObjectId
      const _id = new mongoose.Types.ObjectId(player._id.$oid);
      
      // Convert dates from string to Date objects
      const createdAt = new Date(player.createdAt.$date);
      const updatedAt = new Date(player.updatedAt.$date);
      
      // Convert team ID to ObjectId if it exists
      const team = player.team ? new mongoose.Types.ObjectId(player.team) : null;
      
      // Create player with transformed data
      await Player.create({
        ...player,
        _id,
        createdAt,
        updatedAt,
        team
      });
    }
    
    console.log('Successfully seeded players data');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
})
.catch(err => console.error('Could not connect to MongoDB:', err));

async function seedPlayers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db();
    const collection = db.collection('players');
    
    // Clear existing players
    console.log('Clearing existing players...');
    await collection.deleteMany({});
    
    // Insert new players
    console.log('Inserting new players...');
    const result = await collection.insertMany(players);
    console.log(`✅ Successfully inserted ${result.insertedCount} players`);
    
    // Display inserted players
    console.log('\n📋 Inserted Players:');
    players.forEach((player, index) => {
      console.log(`${index + 1}. ${player.name} (${player.role}) - ₹${player.basePrice.toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding players:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the seed function
if (require.main === module) {
  seedPlayers().catch(console.error);
}

module.exports = { seedPlayers, players }; 