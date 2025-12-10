import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  age: {
    type: Number,
    required: true,
    min: 16,
    max: 45
  },
  role: {
    type: String,
    required: true,
    enum: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper']
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  soldPrice: {
    type: Number,
    default: null
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  tournaments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  }],
  image: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'unsold', 'injured', 'retired'],
    default: 'available'
  },
  // Batting Statistics
  battingHand: {
    type: String,
    enum: ['Left', 'Right'],
    default: 'Right'
  },
  battingStrikeRate: {
    type: Number,
    default: 0
  },
  runs: {
    type: Number,
    default: 0
  },
  highestScore: {
    type: Number,
    default: 0
  },
  // Bowling Statistics
  bowlingHand: {
    type: String,
    enum: ['Left', 'Right', null],
    default: null
  },
  bowlingStrikeRate: {
    type: Number,
    default: 0
  },
  bowlingAverage: {
    type: Number,
    default: 0
  },
  economy: {
    type: Number,
    default: 0
  },
  wickets: {
    type: Number,
    default: 0
  },
  bestBowlingStats: {
    type: String,
    default: ''
  },
  // Additional Fields
  ipl2025Team: {
    type: String,
    default: ''
  },
  nationality: {
    type: String,
    default: 'Indian'
  },
  // Performance Metrics
  recentForm: {
    type: String,
    enum: ['excellent', 'good', 'average', 'poor'],
    default: 'average'
  },
  marketValue: {
    type: Number,
    default: 0
  },
  // Auction specific fields
  auctionHistory: [{
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction'
    },
    finalPrice: Number,
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    status: {
      type: String,
      enum: ['sold', 'unsold']
    },
    year: Number,
    requeuedAt: {
      type: Date,
      default: null
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
playerSchema.index({ role: 1 });
playerSchema.index({ status: 1 });
playerSchema.index({ basePrice: 1 });
playerSchema.index({ name: 'text' });
playerSchema.index({ team: 1 });

// Virtual for player rating based on statistics
playerSchema.virtual('rating').get(function() {
  let rating = 0;
  
  // Base rating on role
  switch (this.role) {
    case 'batsman':
      rating = (this.battingStrikeRate / 10) + (this.runs / 1000);
      break;
    case 'bowler':
      rating = (this.wickets / 10) + (this.economy > 0 ? 50 / this.economy : 0);
      break;
    case 'all-rounder':
      rating = ((this.battingStrikeRate / 15) + (this.runs / 1500)) + 
               ((this.wickets / 15) + (this.economy > 0 ? 40 / this.economy : 0));
      break;
    case 'wicket-keeper':
      rating = (this.battingStrikeRate / 10) + (this.runs / 1000) + 10; // Bonus for keeping
      break;
  }
  
  return Math.min(Math.max(rating, 0), 100); // Cap between 0-100
});

// Virtual for suggested price based on current market
playerSchema.virtual('suggestedPrice').get(function(this: any) {
  // Ensure we can access the rating virtual
  const rating = typeof this.rating === 'function' ? this.rating() : this.rating;
  const baseMultiplier = rating / 50; // 0.5 to 2x multiplier
  const ageMultiplier = this.age < 25 ? 1.2 : this.age > 35 ? 0.8 : 1;
  const formMultiplier = {
    'excellent': 1.3,
    'good': 1.1,
    'average': 1,
    'poor': 0.7
  };
  
  return Math.round(
    this.basePrice * 
    baseMultiplier * 
    ageMultiplier * 
    (formMultiplier[String(this.recentForm) as keyof typeof formMultiplier] || 1)
  );
});

// Method to update player status after auction
playerSchema.methods.updateAuctionStatus = function(
  status: string,
  price: number | null = null,
  teamId: string | null = null
) {
  this.status = status;
  if (price !== null) this.soldPrice = price;
  if (teamId !== null) this.team = teamId;
  return this.save();
}

// Static method to get players by role
playerSchema.statics.getByRole = function(role) {
  return this.find({ role, status: 'available' });
};

// Static method to search players
playerSchema.statics.search = function(query) {
  return this.find({
    $text: { $search: query },
    status: 'available'
  });
};

// Static method to get players in price range
playerSchema.statics.getByPriceRange = function(minPrice, maxPrice) {
  return this.find({
    basePrice: { $gte: minPrice, $lte: maxPrice },
    status: 'available'
  });
};

const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);

export default Player; 