import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema({
  // Basic Tournament Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  // Tournament Dates
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  registrationStartDate: {
    type: Date,
    required: true
  },
  registrationEndDate: {
    type: Date,
    required: true
  },
  
  // Tournament Status & Configuration
  status: {
    type: String,
    enum: ['draft', 'registration_open', 'registration_closed', 'team_selection', 'auction_phase', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  format: {
    type: String,
    required: true,
    enum: ['T20', 'ODI', 'Test', 'T10', 'The Hundred']
  },
  
  // Team Management
  teamConfiguration: {
    maxTeams: {
      type: Number,
      required: true,
      min: 2,
      max: 32,
      default: 8
    },
    minPlayersPerTeam: {
      type: Number,
      default: 11,
      min: 11
    },
    maxPlayersPerTeam: {
      type: Number,
      default: 25,
      max: 30
    },
    maxForeignPlayers: {
      type: Number,
      default: 4,
      max: 8
    },
    captainRequired: {
      type: Boolean,
      default: true
    },
    wicketKeeperRequired: {
      type: Boolean,
      default: true
    }
  },
  
  // Participating Teams
  participatingTeams: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'confirmed', 'withdrawn', 'disqualified'],
      default: 'registered'
    },
    budget: {
      total: {
        type: Number,
        default: 50000000 // 5 crores
      },
      used: {
        type: Number,
        default: 0
      },
      remaining: {
        type: Number,
        default: 50000000
      }
    },
    squadPlayers: [{
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
      },
      acquisitionPrice: {
        type: Number,
        default: 0
      },
      acquisitionDate: {
        type: Date,
        default: Date.now
      },
      role: {
        type: String,
        enum: ['captain', 'vice_captain', 'wicket_keeper', 'regular'],
        default: 'regular'
      },
      status: {
        type: String,
        enum: ['active', 'injured', 'suspended', 'released'],
        default: 'active'
      }
    }],
    teamStats: {
      matchesPlayed: { type: Number, default: 0 },
      matchesWon: { type: Number, default: 0 },
      matchesLost: { type: Number, default: 0 },
      matchesTied: { type: Number, default: 0 },
      points: { type: Number, default: 0 }
    }
  }],
  
  // Player Pool Management
  playerPool: {
    totalPlayers: {
      type: Number,
      default: 0
    },
    availablePlayers: [{
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
      },
      basePrice: {
        type: Number,
        required: true,
        min: 100000 // 1 lakh minimum
      },
      category: {
        type: String,
        enum: ['marquee', 'premium', 'standard', 'emerging'],
        default: 'standard'
      },
      addedDate: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['available', 'sold', 'unsold', 'withdrawn'],
        default: 'available'
      }
    }],
    soldPlayers: [{
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
      },
      soldTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
      },
      soldPrice: {
        type: Number,
        required: true
      },
      soldDate: {
        type: Date,
        default: Date.now
      }
    }],
    unsoldPlayers: [{
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
      },
      basePrice: {
        type: Number
      },
      reason: {
        type: String,
        enum: ['no_bids', 'reserve_not_met', 'team_budget_exceeded'],
        default: 'no_bids'
      }
    }]
  },
  
  // Auction Management
  auctions: [{
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction'
    },
    phase: {
      type: String,
      enum: ['marquee', 'premium', 'standard', 'emerging', 'final'],
      required: true
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    playersAuctioned: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    }
  }],
  
  // Financial Management
  financial: {
    entryFee: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrizePool: {
      type: Number,
      required: true,
      min: 0
    },
    prizeDistribution: {
      winner: {
        type: Number,
        default: 0
      },
      runnerUp: {
        type: Number,
        default: 0
      },
      thirdPlace: {
        type: Number,
        default: 0
      },
      fourthPlace: {
        type: Number,
        default: 0
      },
      other: {
        type: Number,
        default: 0
      }
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    expenses: [{
      category: {
        type: String,
        enum: ['venue', 'equipment', 'officials', 'marketing', 'prizes', 'other']
      },
      amount: {
        type: Number,
        required: true
      },
      description: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Tournament Rules & Settings
  rules: {
    auctionRules: {
      bidIncrement: {
        type: Number,
        default: 100000 // 1 lakh
      },
      bidTimeout: {
        type: Number,
        default: 30 // seconds
      },
      maxBidsPerPlayer: {
        type: Number,
        default: 50
      },
      allowRTM: { // Right to Match
        type: Boolean,
        default: false
      }
    },
    matchRules: {
      oversPerInning: {
        type: Number,
        default: 20
      },
      powerplayOvers: {
        type: Number,
        default: 6
      },
      drsReviews: {
        type: Number,
        default: 2
      },
      substituteAllowed: {
        type: Boolean,
        default: true
      }
    },
    generalRules: {
      type: String,
      maxlength: 5000
    }
  },
  
  // Location & Contact
  venue: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'India'
    },
    capacity: {
      type: Number,
      min: 0
    }
  },
  
  // Contact & Organization
  organizer: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      // required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  
  // Media & Branding
  media: {
    logo: {
      type: String, // URL to logo image
      trim: true
    },
    banner: {
      type: String, // URL to banner image
      trim: true
    },
    gallery: [{
      url: String,
      caption: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }],
    socialMedia: {
      twitter: String,
      instagram: String,
      facebook: String,
      youtube: String
    }
  },
  
  // Settings & Permissions
  settings: {
    isPublic: {
      type: Boolean,
      default: true
    },
    allowSpectators: {
      type: Boolean,
      default: true
    },
    liveStreaming: {
      type: Boolean,
      default: false
    },
    broadcastPartner: {
      type: String,
      trim: true
    },
    sponsorshipTiers: [{
      tier: {
        type: String,
        enum: ['title', 'presenting', 'official', 'associate']
      },
      sponsor: {
        name: String,
        logo: String,
        website: String
      },
      amount: Number
    }]
  },
  
  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ startDate: 1 });
tournamentSchema.index({ 'participatingTeams.team': 1 });
tournamentSchema.index({ 'playerPool.availablePlayers.player': 1 });
tournamentSchema.index({ name: 'text', description: 'text' });
tournamentSchema.index({ createdAt: -1 });
tournamentSchema.index({ 'venue.city': 1 });

// Virtual fields
tournamentSchema.virtual('registrationStatus').get(function() {
  const now = new Date();
  if (now < this.registrationStartDate) return 'not_started';
  if (now > this.registrationEndDate) return 'closed';
  return 'open';
});

tournamentSchema.virtual("spotsRemaining").get(function () {
  const teams = this.participatingTeams || [];
  const maxTeams = this.teamConfiguration?.maxTeams ?? 0;
  return maxTeams - teams.length;
});

tournamentSchema.virtual("totalBudgetAllocated").get(function () {
  const teams = this.participatingTeams || [];
  return teams.reduce((total, team) => total + (team.budget?.used || 0), 0);
});

tournamentSchema.virtual("playersRemaining").get(function () {
  const players = this.playerPool?.availablePlayers || [];
  return players.filter((p) => p.status === "available").length;
});

// Pre-save middleware
tournamentSchema.pre('save', function(next) {
  // Validate dates
  if (this.startDate >= this.endDate) {
    return next(new Error('End date must be after start date'));
  }
  if (this.registrationStartDate >= this.registrationEndDate) {
    return next(new Error('Registration end date must be after registration start date'));
  }
  if (this.registrationEndDate > this.startDate) {
    return next(new Error('Registration must end before tournament starts'));
  }
  
  // Update last modified
  this.lastModified = new Date();

  // Calculate prize distribution amounts only if not explicitly set
  if (this.financial?.totalPrizePool && this.financial.totalPrizePool > 0 && this.financial.prizeDistribution) {
    const total = this.financial.totalPrizePool;

    // Only calculate amounts if they haven't been explicitly set (are 0)
    if (this.financial.prizeDistribution.winner === 0) {
      this.financial.prizeDistribution.winner = (total * 40) / 100;
    }
    if (this.financial.prizeDistribution.runnerUp === 0) {
      this.financial.prizeDistribution.runnerUp = (total * 25) / 100;
    }
    if (this.financial.prizeDistribution.thirdPlace === 0) {
      this.financial.prizeDistribution.thirdPlace = (total * 15) / 100;
    }
    if (this.financial.prizeDistribution.fourthPlace === 0) {
      this.financial.prizeDistribution.fourthPlace = (total * 10) / 100;
    }
    if (this.financial.prizeDistribution.other === 0) {
      this.financial.prizeDistribution.other = (total * 10) / 100;
    }
  }
  
  next();
});

// Instance methods
tournamentSchema.methods.addTeam = function(teamId: any, budget = 50000000) {
  if (this.participatingTeams.length >= this.teamConfiguration.maxTeams) {
    throw new Error('Tournament is full');
  }
  const existingTeam = this.participatingTeams.find((t:any) => t.team.toString() === teamId.toString());
  if (existingTeam) {
    throw new Error('Team already registered');
  }
  
  this.participatingTeams.push({
    team: teamId,
    budget: {
      total: budget,
      used: 0,
      remaining: budget
    }
  });
  
  return this.save();
};

tournamentSchema.methods.removeTeam = function(teamId:any) {
  this.participatingTeams = this.participatingTeams.filter((t:any) => t.team.toString() !== teamId.toString());
  return this.save();
};

tournamentSchema.methods.addPlayer = function(playerId:any, basePrice:any, category = 'standard') {
  const existingPlayer = this.playerPool.availablePlayers.find((p:any) => p.player.toString() === playerId.toString());
  if (existingPlayer) {
    throw new Error('Player already in tournament');
  }
  
  this.playerPool.availablePlayers.push({
    player: playerId,
    basePrice: basePrice,
    category: category
  });
  
  this.playerPool.totalPlayers = this.playerPool.availablePlayers.length;
  return this.save();
};

tournamentSchema.methods.removePlayer = function(playerId:any) {
  this.playerPool.availablePlayers = this.playerPool.availablePlayers.filter((p:any) => p.player.toString() !== playerId.toString());
  this.playerPool.totalPlayers = this.playerPool.availablePlayers.length;
  return this.save();
};

// Clear any existing model to force schema recompilation
if (mongoose.models.Tournament) {
  delete mongoose.models.Tournament;
}

// Export the model
export default mongoose.model('Tournament', tournamentSchema); 