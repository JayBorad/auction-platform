const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://vaibhavgareja:8JEYG5lRkmxyvglR@vaibhav.nrfp7b4.mongodb.net/auction?retryWrites=true&w=majority&appName=Vaibhav';

// Define schemas for testing
const tournamentSchema = new mongoose.Schema({
  name: String,
  description: String,
  status: String,
  participatingTeams: [{
    team: mongoose.Schema.Types.ObjectId,
    registrationDate: Date,
    status: String,
    budget: {
      total: Number,
      used: Number,
      remaining: Number
    }
  }],
  playerPool: {
    totalPlayers: Number,
    availablePlayers: [{
      player: mongoose.Schema.Types.ObjectId,
      basePrice: Number,
      category: String,
      status: String
    }]
  }
}, { timestamps: true });

const teamSchema = new mongoose.Schema({
  name: String,
  shortName: String,
  city: String,
  state: String,
  country: String,
  budget: Number,
  isActive: Boolean
}, { timestamps: true });

const playerSchema = new mongoose.Schema({
  name: String,
  age: Number,
  role: String,
  basePrice: Number,
  status: String,
  nationality: String
}, { timestamps: true });

// Create models
const Tournament = mongoose.model('Tournament', tournamentSchema);
const Team = mongoose.model('Team', teamSchema);
const Player = mongoose.model('Player', playerSchema);

async function checkTournamentData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    // Get all tournaments
    const tournaments = await Tournament.find({}).lean();
    console.log(`\n📊 Found ${tournaments.length} tournaments:`);

    for (const tournament of tournaments) {
      console.log(`\n🏆 Tournament: ${tournament.name}`);
      console.log(`   Status: ${tournament.status}`);
      console.log(`   Participating Teams: ${tournament.participatingTeams?.length || 0}`);
      
      if (tournament.participatingTeams && tournament.participatingTeams.length > 0) {
        console.log('   Teams:');
        for (const teamEntry of tournament.participatingTeams) {
          const team = await Team.findById(teamEntry.team).lean();
          console.log(`     - ${team ? team.name : 'Unknown Team'} (${teamEntry.team})`);
          console.log(`       Budget: ₹${teamEntry.budget?.total?.toLocaleString() || 'N/A'}`);
          console.log(`       Status: ${teamEntry.status}`);
        }
      } else {
        console.log('   No teams registered');
      }

      if (tournament.playerPool) {
        console.log(`   Player Pool: ${tournament.playerPool.totalPlayers || 0} total players`);
        console.log(`   Available Players: ${tournament.playerPool.availablePlayers?.length || 0}`);
      }
    }

    // Get all teams
    const teams = await Team.find({}).lean();
    console.log(`\n🏟️ Found ${teams.length} teams in database:`);
    teams.forEach(team => {
      console.log(`   - ${team.name} (${team.shortName}) - ${team.city}`);
    });

    // Get all players
    const players = await Player.find({}).lean();
    console.log(`\n🏏 Found ${players.length} players in database:`);
    players.slice(0, 5).forEach(player => {
      console.log(`   - ${player.name} (${player.role}) - ₹${player.basePrice?.toLocaleString()}`);
    });
    if (players.length > 5) {
      console.log(`   ... and ${players.length - 5} more players`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkTournamentData(); 