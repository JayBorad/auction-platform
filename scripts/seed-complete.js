const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vaibhavgareja:8JEYG5lRkmxyvglR@vaibhav.nrfp7b4.mongodb.net/auction';

// Define schemas (simplified for seeding)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  plainPassword: String,
  role: String,
  status: String
}, { timestamps: true });

const tournamentSchema = new mongoose.Schema({
  name: String,
  description: String,
  startDate: Date,
  endDate: Date,
  registrationStartDate: Date,
  registrationEndDate: Date,
  status: String,
  maxTeams: Number,
  entryFee: Number,
  prizePool: Number,
  format: String,
  venue: String,
  city: String,
  country: String,
  organizer: String,
  contactEmail: String,
  contactPhone: String,
  isActive: Boolean,
  createdBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const teamSchema = new mongoose.Schema({
  name: String,
  shortName: String,
  city: String,
  state: String,
  country: String,
  budget: Number,
  isActive: Boolean,
  tournaments: [mongoose.Schema.Types.ObjectId]
}, { timestamps: true });

const playerSchema = new mongoose.Schema({
  name: String,
  age: Number,
  role: String,
  basePrice: Number,
  status: String,
  nationality: String,
  battingHand: String,
  bowlingHand: String,
  recentForm: String
}, { timestamps: true });

const auctionSchema = new mongoose.Schema({
  name: String,
  tournament: mongoose.Schema.Types.ObjectId,
  startDate: Date,
  endDate: Date,
  status: String,
  totalBudget: Number,
  totalPlayers: Number,
  participants: [{
    team: mongoose.Schema.Types.ObjectId,
    remainingBudget: Number,
    playersWon: [mongoose.Schema.Types.ObjectId]
  }],
  playerQueue: [mongoose.Schema.Types.ObjectId],
  rules: {
    maxBidIncrement: Number,
    bidTimeout: Number,
    maxPlayersPerTeam: Number,
    maxForeignPlayers: Number
  },
  createdBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

// Create models
const User = mongoose.model('User', userSchema);
const Tournament = mongoose.model('Tournament', tournamentSchema);
const Team = mongoose.model('Team', teamSchema);
const Player = mongoose.model('Player', playerSchema);
const Auction = mongoose.model('Auction', auctionSchema);

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Tournament.deleteMany({});
    await Team.deleteMany({});
    await Player.deleteMany({});
    await Auction.deleteMany({});

    // Create admin user
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@auction.com',
      password: hashedPassword,
      plainPassword: 'admin123',
      role: 'admin',
      status: 'active'
    });

    // Create moderator user
    const moderatorUser = await User.create({
      name: 'Moderator User',
      email: 'moderator@auction.com',
      password: await bcrypt.hash('mod123', 12),
      plainPassword: 'mod123',
      role: 'moderator',
      status: 'active'
    });

    // Create sample team owners
    const teamOwners = [];
    for (let i = 1; i <= 8; i++) {
      const owner = await User.create({
        name: `Team Owner ${i}`,
        email: `owner${i}@example.com`,
        password: await bcrypt.hash('owner123', 12),
        plainPassword: 'owner123',
        role: 'team-owner',
        status: 'active'
      });
      teamOwners.push(owner);
    }

    // Create tournaments
    console.log('Creating tournaments...');
    const tournaments = [];
    const tournamentData = [
      {
        name: 'Premier Cricket League 2024',
        description: 'The biggest cricket tournament of the year',
        format: 'T20',
        venue: 'Wankhede Stadium',
        city: 'Mumbai',
        maxTeams: 8,
        entryFee: 5000000,
        prizePool: 100000000
      },
      {
        name: 'Champions Trophy 2024',
        description: 'Elite cricket championship',
        format: 'ODI',
        venue: 'Eden Gardens',
        city: 'Kolkata',
        maxTeams: 6,
        entryFee: 3000000,
        prizePool: 60000000
      }
    ];

    for (const tData of tournamentData) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 30);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 15);

      const tournament = await Tournament.create({
        ...tData,
        startDate,
        endDate,
        registrationStartDate: new Date(),
        registrationEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'upcoming',
        country: 'India',
        organizer: 'Cricket Board',
        contactEmail: 'contact@cricket.com',
        contactPhone: '+91-9876543210',
        isActive: true,
        createdBy: adminUser._id
      });
      tournaments.push(tournament);
    }

    // Create teams
    console.log('Creating teams...');
    const teams = [];
    const teamData = [
      { name: 'Mumbai Warriors', shortName: 'MW', city: 'Mumbai', state: 'Maharashtra' },
      { name: 'Delhi Capitals', shortName: 'DC', city: 'Delhi', state: 'Delhi' },
      { name: 'Chennai Super Kings', shortName: 'CSK', city: 'Chennai', state: 'Tamil Nadu' },
      { name: 'Kolkata Knight Riders', shortName: 'KKR', city: 'Kolkata', state: 'West Bengal' },
      { name: 'Royal Challengers', shortName: 'RCB', city: 'Bangalore', state: 'Karnataka' },
      { name: 'Rajasthan Royals', shortName: 'RR', city: 'Jaipur', state: 'Rajasthan' },
      { name: 'Punjab Kings', shortName: 'PBKS', city: 'Mohali', state: 'Punjab' },
      { name: 'Sunrisers Hyderabad', shortName: 'SRH', city: 'Hyderabad', state: 'Telangana' }
    ];

    for (let i = 0; i < teamData.length; i++) {
      const team = await Team.create({
        ...teamData[i],
        country: 'India',
        budget: 50000000, // 5 crore budget
        isActive: true,
        tournaments: [tournaments[0]._id] // Add to first tournament
      });
      teams.push(team);
    }

    // Create players
    console.log('Creating players...');
    const players = [];
    const playerData = [
      // Batsmen
      { name: 'Virat Kohli', age: 35, role: 'batsman', basePrice: 15000000, nationality: 'Indian', battingHand: 'Right', recentForm: 'excellent' },
      { name: 'Rohit Sharma', age: 36, role: 'batsman', basePrice: 14000000, nationality: 'Indian', battingHand: 'Right', recentForm: 'good' },
      { name: 'KL Rahul', age: 31, role: 'batsman', basePrice: 12000000, nationality: 'Indian', battingHand: 'Right', recentForm: 'good' },
      { name: 'Shubman Gill', age: 24, role: 'batsman', basePrice: 10000000, nationality: 'Indian', battingHand: 'Right', recentForm: 'excellent' },
      { name: 'Shreyas Iyer', age: 29, role: 'batsman', basePrice: 8000000, nationality: 'Indian', battingHand: 'Right', recentForm: 'good' },
      
      // Bowlers
      { name: 'Jasprit Bumrah', age: 30, role: 'bowler', basePrice: 16000000, nationality: 'Indian', bowlingHand: 'Right', recentForm: 'excellent' },
      { name: 'Mohammed Shami', age: 33, role: 'bowler', basePrice: 11000000, nationality: 'Indian', bowlingHand: 'Right', recentForm: 'good' },
      { name: 'Yuzvendra Chahal', age: 33, role: 'bowler', basePrice: 9000000, nationality: 'Indian', bowlingHand: 'Right', recentForm: 'good' },
      { name: 'Rashid Khan', age: 25, role: 'bowler', basePrice: 13000000, nationality: 'Afghan', bowlingHand: 'Right', recentForm: 'excellent' },
      { name: 'Trent Boult', age: 34, role: 'bowler', basePrice: 10000000, nationality: 'New Zealand', bowlingHand: 'Left', recentForm: 'good' },
      
      // All-rounders
      { name: 'Hardik Pandya', age: 30, role: 'all-rounder', basePrice: 18000000, nationality: 'Indian', battingHand: 'Right', bowlingHand: 'Right', recentForm: 'excellent' },
      { name: 'Ravindra Jadeja', age: 35, role: 'all-rounder', basePrice: 14000000, nationality: 'Indian', battingHand: 'Left', bowlingHand: 'Left', recentForm: 'good' },
      { name: 'Andre Russell', age: 35, role: 'all-rounder', basePrice: 12000000, nationality: 'West Indies', battingHand: 'Right', bowlingHand: 'Right', recentForm: 'good' },
      { name: 'Ben Stokes', age: 32, role: 'all-rounder', basePrice: 15000000, nationality: 'England', battingHand: 'Left', bowlingHand: 'Right', recentForm: 'excellent' },
      
      // Wicket-keepers
      { name: 'MS Dhoni', age: 42, role: 'wicket-keeper', basePrice: 20000000, nationality: 'Indian', battingHand: 'Right', recentForm: 'good' },
      { name: 'Rishabh Pant', age: 26, role: 'wicket-keeper', basePrice: 13000000, nationality: 'Indian', battingHand: 'Left', recentForm: 'excellent' },
      { name: 'Quinton de Kock', age: 31, role: 'wicket-keeper', basePrice: 11000000, nationality: 'South Africa', battingHand: 'Left', recentForm: 'good' },
      { name: 'Jos Buttler', age: 33, role: 'wicket-keeper', basePrice: 12000000, nationality: 'England', battingHand: 'Right', recentForm: 'good' }
    ];

    // Add more players to reach 50+
    const additionalPlayers = [];
    for (let i = 1; i <= 30; i++) {
      const roles = ['batsman', 'bowler', 'all-rounder', 'wicket-keeper'];
      const role = roles[Math.floor(Math.random() * roles.length)];
      const basePrice = Math.floor(Math.random() * 8000000) + 2000000; // 2-10 crore
      
      additionalPlayers.push({
        name: `Player ${i}`,
        age: Math.floor(Math.random() * 15) + 20, // 20-35 years
        role,
        basePrice,
        nationality: Math.random() > 0.7 ? 'Foreign' : 'Indian',
        battingHand: Math.random() > 0.5 ? 'Right' : 'Left',
        bowlingHand: role === 'bowler' || role === 'all-rounder' ? (Math.random() > 0.5 ? 'Right' : 'Left') : null,
        recentForm: ['excellent', 'good', 'average'][Math.floor(Math.random() * 3)]
      });
    }

    const allPlayerData = [...playerData, ...additionalPlayers];
    
    for (const pData of allPlayerData) {
      const player = await Player.create({
        ...pData,
        status: 'available'
      });
      players.push(player);
    }

    // Create auctions
    console.log('Creating auctions...');
    for (const tournament of tournaments) {
      const auction = await Auction.create({
        name: `${tournament.name} Player Auction`,
        tournament: tournament._id,
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        status: 'upcoming',
        totalBudget: 50000000,
        totalPlayers: players.length,
        participants: teams.slice(0, tournament.maxTeams).map(team => ({
          team: team._id,
          remainingBudget: 50000000,
          playersWon: []
        })),
        playerQueue: players.map(p => p._id),
        rules: {
          maxBidIncrement: 500000,
          bidTimeout: 30000,
          maxPlayersPerTeam: 15,
          maxForeignPlayers: 4
        },
        createdBy: adminUser._id
      });
      
      console.log(`Created auction: ${auction.name}`);
    }

    console.log('✅ Database seeded successfully!');
    console.log(`✅ Created ${teamOwners.length + 2} users`);
    console.log(`✅ Created ${tournaments.length} tournaments`);
    console.log(`✅ Created ${teams.length} teams`);
    console.log(`✅ Created ${players.length} players`);
    console.log(`✅ Created ${tournaments.length} auctions`);

    console.log('\n🔐 Login Credentials:');
    console.log('Admin: admin@auction.com / admin123');
    console.log('Moderator: moderator@auction.com / mod123');
    console.log('Team Owner: owner1@example.com / owner123 (or owner2, owner3, etc.)');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seeding
seedDatabase(); 