import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    required: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  bidderName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  bidType: {
    type: String,
    enum: ['regular', 'auto', 'final'],
    default: 'regular'
  },
  status: {
    type: String,
    enum: ['active', 'outbid', 'won', 'withdrawn'],
    default: 'active'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  bidOrder: {
    type: Number,
    default: 1
  },
  previousBid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
    default: null
  },
  metadata: {
    bidDuration: Number, // Time taken to place bid in milliseconds
    isAutomatic: {
      type: Boolean,
      default: false
    },
    deviceInfo: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
bidSchema.index({ auction: 1, player: 1 });
bidSchema.index({ bidder: 1 });
bidSchema.index({ status: 1 });
bidSchema.index({ timestamp: -1 });
bidSchema.index({ auction: 1, timestamp: -1 });

// Compound index for getting latest bid for a player in an auction
bidSchema.index({ auction: 1, player: 1, timestamp: -1 });

// Static method to get highest bid for a player in an auction
bidSchema.statics.getHighestBid = function(auctionId, playerId) {
  return this.findOne({
    auction: auctionId,
    player: playerId,
    status: { $in: ['active', 'won'] }
  }).sort({ amount: -1 });
};

// Static method to get bid history for a player
bidSchema.statics.getBidHistory = function(auctionId, playerId) {
  return this.find({
    auction: auctionId,
    player: playerId
  }).sort({ timestamp: -1 }).populate('bidder', 'name');
};

// Static method to get latest bids for an auction
bidSchema.statics.getLatestBids = function(auctionId, limit = 10) {
  return this.find({
    auction: auctionId
  })
  .sort({ timestamp: -1 })
  .limit(limit)
  .populate('player', 'name role')
  .populate('bidder', 'name');
};

// Method to mark bid as outbid
bidSchema.methods.markAsOutbid = function() {
  this.status = 'outbid';
  return this.save();
};

// Method to mark bid as won
bidSchema.methods.markAsWon = function() {
  this.status = 'won';
  return this.save();
};

// Ensure bidOrder is set before validation
bidSchema.pre('validate', async function(next) {
  if (this.isNew) {
    try {
      const lastBid = await this.constructor.findOne({
        auction: this.auction,
        player: this.player
      }).sort({ bidOrder: -1 });
      
      this.bidOrder = lastBid ? lastBid.bidOrder + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-save middleware to mark previous bid as outbid
bidSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const lastBid = await this.constructor.findOne({
        auction: this.auction,
        player: this.player
      }).sort({ bidOrder: -1 });

      if (lastBid && lastBid.status === 'active') {
        await lastBid.markAsOutbid();
        this.previousBid = lastBid._id;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Bid = mongoose.models.Bid || mongoose.model('Bid', bidSchema);

export default Bid; 