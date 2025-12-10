const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/auction-app';

const players = [
  {
    name: 'Virat Kohli',
    age: 35,
    role: 'batsman',
    battingHand: 'Right',
    bowlingHand: null,
    basePrice: 15000000,
    soldPrice: null,
    nationality: 'Indian',
    team: null,
    status: 'available',
    tournaments: [],
    image: '',
    // Batting stats
    battingStrikeRate: 93.17,
    runs: 12169,
    highestScore: 183,
    // Bowling stats
    bowlingStrikeRate: 0,
    bowlingAverage: 0,
    economy: 8.5,
    wickets: 4,
    bestBowlingStats: '1/15',
    // Additional fields
    ipl2025Team: '',
    recentForm: 'excellent',
    marketValue: 17000000,
    auctionHistory: []
  },
  {
    name: 'Jasprit Bumrah',
    age: 30,
    role: 'bowler',
    battingHand: 'Right',
    bowlingHand: 'Right',
    basePrice: 12000000,
    soldPrice: null,
    nationality: 'Indian',
    team: null,
    status: 'available',
    tournaments: [],
    image: '',
    // Batting stats
    battingStrikeRate: 7.28,
    runs: 29,
    highestScore: 10,
    // Bowling stats
    bowlingStrikeRate: 53.62,
    bowlingAverage: 24.43,
    economy: 7.28,
    wickets: 145,
    bestBowlingStats: '6/19',
    // Additional fields
    ipl2025Team: '',
    recentForm: 'excellent',
    marketValue: 14000000,
    auctionHistory: []
  },
  {
    name: 'MS Dhoni',
    age: 42,
    role: 'wicket-keeper',
    battingHand: 'Right',
    bowlingHand: 'Right',
    basePrice: 20000000,
    soldPrice: null,
    nationality: 'Indian',
    team: null,
    status: 'retired',
    tournaments: [],
    image: '',
    // Batting stats
    battingStrikeRate: 87.56,
    runs: 10773,
    highestScore: 183,
    // Bowling stats
    bowlingStrikeRate: 0,
    bowlingAverage: 0,
    economy: 8.2,
    wickets: 1,
    bestBowlingStats: '1/9',
    // Additional fields
    ipl2025Team: '',
    recentForm: 'good',
    marketValue: 20000000,
    auctionHistory: []
  },
  {
    name: 'Hardik Pandya',
    age: 30,
    role: 'all-rounder',
    battingHand: 'Right',
    bowlingHand: 'Right',
    basePrice: 11000000,
    soldPrice: null,
    nationality: 'Indian',
    team: null,
    status: 'injured',
    tournaments: [],
    image: '',
    // Batting stats
    battingStrikeRate: 113.91,
    runs: 1476,
    highestScore: 91,
    // Bowling stats
    bowlingStrikeRate: 27.12,
    bowlingAverage: 31.27,
    economy: 9.22,
    wickets: 42,
    bestBowlingStats: '4/38',
    // Additional fields
    ipl2025Team: '',
    recentForm: 'average',
    marketValue: 15000000,
    auctionHistory: []
  },
  {
    name: 'Rohit Sharma',
    age: 36,
    role: 'batsman',
    battingHand: 'Right',
    bowlingHand: 'Right',
    basePrice: 16000000,
    soldPrice: null,
    nationality: 'Indian',
    team: null,
    status: 'available',
    tournaments: [],
    image: '',
    // Batting stats
    battingStrikeRate: 90.23,
    runs: 9115,
    highestScore: 264,
    // Bowling stats
    bowlingStrikeRate: 0,
    bowlingAverage: 0,
    economy: 7.8,
    wickets: 8,
    bestBowlingStats: '2/27',
    // Additional fields
    ipl2025Team: '',
    recentForm: 'good',
    marketValue: 16000000,
    auctionHistory: []
  },
  {
    name: 'Ravindra Jadeja',
    age: 35,
    role: 'all-rounder',
    battingHand: 'Left',
    bowlingHand: 'Left',
    basePrice: 12000000,
    soldPrice: null,
    nationality: 'Indian',
    team: null,
    status: 'available',
    tournaments: [],
    image: '',
    // Batting stats
    battingStrikeRate: 86.23,
    runs: 2756,
    highestScore: 175,
    // Bowling stats
    bowlingStrikeRate: 52.85,
    bowlingAverage: 34.16,
    economy: 7.68,
    wickets: 187,
    bestBowlingStats: '7/48',
    // Additional fields
    ipl2025Team: '',
    recentForm: 'good',
    marketValue: 13000000,
    auctionHistory: []
  },
  {
    name: 'KL Rahul',
    age: 31,
    role: 'wicket-keeper',
    battingHand: 'Right',
    bowlingHand: null,
    basePrice: 11000000,
    soldPrice: null,
    nationality: 'Indian',
    team: null,
    status: 'available',
    tournaments: [],
    image: '',
    // Batting stats
    battingStrikeRate: 86.24,
    runs: 2321,
    highestScore: 199,
    // Bowling stats
    bowlingStrikeRate: 0,
    bowlingAverage: 0,
    economy: 0,
    wickets: 0,
    bestBowlingStats: '',
    // Additional fields
    ipl2025Team: '',
    recentForm: 'good',
    marketValue: 12000000,
    auctionHistory: []
  },
  {
    name: 'Mohammed Shami',
    age: 33,
    role: 'bowler',
    battingHand: 'Right',
    bowlingHand: 'Right',
    basePrice: 10000000,
    soldPrice: null,
    nationality: 'Indian',
    team: null,
    status: 'available',
    tournaments: [],
    image: '',
    // Batting stats
    battingStrikeRate: 16.4,
    runs: 91,
    highestScore: 25,
    // Bowling stats
    bowlingStrikeRate: 54.8,
    bowlingAverage: 32.56,
    economy: 8.03,
    wickets: 180,
    bestBowlingStats: '7/57',
    // Additional fields
    ipl2025Team: '',
    recentForm: 'excellent',
    marketValue: 12000000,
    auctionHistory: []
  },
  {
    name: 'Rishabh Pant',
    age: 26,
    role: 'wicket-keeper',
    battingHand: 'Left',
    bowlingHand: null,
    basePrice: 14000000,
    soldPrice: null,
    nationality: 'Indian',
    team: null,
    status: 'available',
    tournaments: [],
    image: '',
    // Batting stats
    battingStrikeRate: 126.13,
    runs: 1736,
    highestScore: 159,
    // Bowling stats
    bowlingStrikeRate: 0,
    bowlingAverage: 0,
    economy: 0,
    wickets: 0,
    bestBowlingStats: '',
    // Additional fields
    ipl2025Team: '',
    recentForm: 'excellent',
    marketValue: 16000000,
    auctionHistory: []
  },
  {
    name: 'Yuzvendra Chahal',
    age: 33,
    role: 'bowler',
    battingHand: 'Right',
    bowlingHand: 'Right',
    basePrice: 8000000,
    soldPrice: null,
    nationality: 'Indian',
    team: null,
    status: 'available',
    tournaments: [],
    image: '',
    // Batting stats
    battingStrikeRate: 113.04,
    runs: 92,
    highestScore: 18,
    // Bowling stats
    bowlingStrikeRate: 21.5,
    bowlingAverage: 25.95,
    economy: 8.17,
    wickets: 72,
    bestBowlingStats: '6/42',
    // Additional fields
    ipl2025Team: '',
    recentForm: 'good',
    marketValue: 9000000,
    auctionHistory: []
  }
];

async function seedPlayers() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🏏 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db();
    const collection = db.collection('players');
    
    // Clear existing players
    console.log('🗑️  Clearing existing players...');
    await collection.deleteMany({});
    
    // Insert new players
    console.log('📊 Inserting famous cricket players...');
    const result = await collection.insertMany(players);
    console.log(`✅ Successfully inserted ${result.insertedCount} players`);
    
    // Display inserted players
    console.log('\n📋 Inserted Cricket Stars:');
    players.forEach((player, index) => {
      const statusEmoji = player.status === 'available' ? '🟢' : 
                         player.status === 'injured' ? '🟡' : 
                         player.status === 'retired' ? '🔴' : '⚪';
      console.log(`${index + 1}. ${statusEmoji} ${player.name} (${player.role}) - ₹${player.basePrice.toLocaleString()}`);
    });
    
    console.log('\n🎉 Database seeded with famous cricket players!');
    
  } catch (error) {
    console.error('❌ Error seeding players:', error);
  } finally {
    await client.close();
    console.log('🔐 Disconnected from MongoDB');
  }
}

// Run the seed function
if (require.main === module) {
  seedPlayers().catch(console.error);
}

module.exports = { seedPlayers, players }; 