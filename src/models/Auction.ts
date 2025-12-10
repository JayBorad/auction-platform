import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'paused', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  totalBudget: {
    type: Number,
    required: true,
    min: 0
  },
  totalPlayers: {
    type: Number,
    default: 0
  },
  soldPlayers: {
    type: Number,
    default: 0
  },
  unsoldPlayers: {
    type: Number,
    default: 0
  },
  currentPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  currentBid: {
    amount: {
      type: Number,
      default: 0
    },
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null
    },
    bidderName: {
      type: String,
      default: ''
    }
  },
  participants: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    remainingBudget: {
      type: Number,
      required: true
    },
    playersWon: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    }]
  }],
  playerQueue: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  rules: {
    maxBidIncrement: {
      type: Number,
      default: 500000 // 5 lakh minimum increment
    },
    bidTimeout: {
      type: Number,
      default: 30000 // 30 seconds timeout
    },
    maxPlayersPerTeam: {
      type: Number,
      default: 25
    },
    maxForeignPlayers: {
      type: Number,
      default: 8
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Index for efficient queries
auctionSchema.index({ status: 1 });
auctionSchema.index({ tournament: 1 });
auctionSchema.index({ startDate: 1 });

// Virtual for calculating statistics
auctionSchema.virtual('stats').get(function() {
  const totalSpent = this.participants.reduce((sum, participant) => {
    return sum + (this.totalBudget - participant.remainingBudget);
  }, 0);
  
  return {
    totalSpent,
    averagePlayerPrice: this.soldPlayers > 0 ? totalSpent / this.soldPlayers : 0,
    completionPercentage: this.totalPlayers > 0 ? (this.soldPlayers / this.totalPlayers) * 100 : 0
  };
});

// Method to add player to queue
auctionSchema.methods.addPlayerToQueue = function(playerId:any) {
  if (!this.playerQueue.includes(playerId)) {
    this.playerQueue.push(playerId);
  }
  return this.save();
};

// Method to get next player
auctionSchema.methods.getNextPlayer = function() {
  return this.playerQueue.shift();
};

// Method to update auction status
auctionSchema.methods.updateStatus = function(newStatus:any) {
  this.status = newStatus;
  return this.save();
};

const Auction = mongoose.models.Auction || mongoose.model('Auction', auctionSchema);

export default Auction; 