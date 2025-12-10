const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auction-platform');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Tournament schema (simplified for migration)
const tournamentSchema = new mongoose.Schema({}, { strict: false });
const Tournament = mongoose.model('Tournament', tournamentSchema);

const migrateTournaments = async () => {
  try {
    console.log('Starting tournament migration...');

    // Get all tournaments
    const tournaments = await Tournament.find({});
    console.log(`Found ${tournaments.length} tournaments to migrate`);

    for (const tournament of tournaments) {
      let needsUpdate = false;
      const updateData = {};

      // Add participatingTeams if it doesn't exist
      if (!tournament.participatingTeams) {
        updateData.participatingTeams = [];
        needsUpdate = true;
      }

      // Add playerPool if it doesn't exist
      if (!tournament.playerPool) {
        updateData.playerPool = {
          totalPlayers: 0,
          availablePlayers: [],
          soldPlayers: [],
          unsoldPlayers: []
        };
        needsUpdate = true;
      }

      // Add teamConfiguration if it doesn't exist
      if (!tournament.teamConfiguration) {
        updateData.teamConfiguration = {
          maxTeams: tournament.maxTeams || 8,
          minPlayersPerTeam: 11,
          maxPlayersPerTeam: 25,
          maxForeignPlayers: 4,
          captainRequired: true,
          wicketKeeperRequired: true
        };
        needsUpdate = true;
      }

      // Add auctions array if it doesn't exist
      if (!tournament.auctions) {
        updateData.auctions = [];
        needsUpdate = true;
      }

      // Add financial data if it doesn't exist
      if (!tournament.financial) {
        updateData.financial = {
          totalBudget: tournament.prizePool || 100000000,
          prizeDistribution: {
            winner: (tournament.prizePool || 100000000) * 0.4,
            runnerUp: (tournament.prizePool || 100000000) * 0.25,
            thirdPlace: (tournament.prizePool || 100000000) * 0.15,
            fourthPlace: (tournament.prizePool || 100000000) * 0.1,
            others: (tournament.prizePool || 100000000) * 0.1
          },
          sponsorshipDeals: [],
          expenses: {
            venue: 0,
            marketing: 0,
            operations: 0,
            other: 0
          }
        };
        needsUpdate = true;
      }

      // Add settings if it doesn't exist
      if (!tournament.settings) {
        updateData.settings = {
          auctionSettings: {
            bidIncrement: 100000,
            timePerBid: 30,
            maxBidsPerPlayer: 50,
            rtmpEnabled: true
          },
          matchSettings: {
            oversPerInning: tournament.format === 'T20' ? 20 : tournament.format === 'ODI' ? 50 : 90,
            powerplayOvers: tournament.format === 'T20' ? 6 : 10,
            drsReviews: 2
          },
          broadcastSettings: {
            liveStreaming: false,
            commentaryLanguages: ['English'],
            socialMediaIntegration: true
          }
        };
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Tournament.updateOne(
          { _id: tournament._id },
          { $set: updateData }
        );
        console.log(`Updated tournament: ${tournament.name}`);
      } else {
        console.log(`Tournament already up to date: ${tournament.name}`);
      }
    }

    console.log('Tournament migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
};

const main = async () => {
  await connectDB();
  await migrateTournaments();
  await mongoose.connection.close();
  console.log('Migration completed and database connection closed.');
};

main().catch(console.error); 