import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer {
  name: string;
  age: number;
  role: 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
  battingStyle?: 'right-hand' | 'left-hand';
  bowlingStyle?: 'right-arm-fast' | 'left-arm-fast' | 'right-arm-spin' | 'left-arm-spin' | 'none';
  jerseyNumber?: number;
  contactNumber?: string;
  email?: string;
  isActive: boolean;
}

export interface ITeam extends Document {
  name: string;
  shortName: string;
  logo?: string;
  description?: string;
  captain: string;
  viceCaptain?: string;
  coach?: string;
  manager?: string;
  city: string;
  state?: string;
  country: string;
  foundedYear?: number;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  homeGround?: {
    name: string;
    city: string;
    capacity?: number;
  };
  players: IPlayer[];
  tournaments: mongoose.Types.ObjectId[];
  achievements?: Array<{
    title: string;
    description?: string;
    year?: number;
  }>;
  totalMatches: number;
    matchesWon: number;
    matchesLost: number;
  matchesDrawn: number;
  points: number;
  netRunRate?: number;
  isActive: boolean;
  registrationDate: Date;
  lastUpdated: Date;
  // Virtual fields
  activePlayers?: IPlayer[];
  playerCount?: number;
  winPercentage?: string;
}

const PlayerSchema = new Schema<IPlayer>({
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 16, max: 50 },
  role: { 
    type: String, 
    required: true, 
    enum: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper'] 
  },
  battingStyle: { 
    type: String, 
    enum: ['right-hand', 'left-hand'] 
  },
  bowlingStyle: { 
    type: String, 
    enum: ['right-arm-fast', 'left-arm-fast', 'right-arm-spin', 'left-arm-spin', 'none'] 
  },
  jerseyNumber: { type: Number, min: 1, max: 99 },
  contactNumber: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const TeamSchema = new Schema<ITeam>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  shortName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxLength: 4
  },
  logo: {
    type: String,
    default: ''
  },
  description: String,
  captain: {
    type: String,
    required: true
  },
  viceCaptain: String,
  coach: String,
  manager: String,
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: String,
  country: {
    type: String,
    default: 'India'
  },
  foundedYear: Number,
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  website: String,
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String
  },
  homeGround: {
    name: String,
    city: String,
    capacity: Number
  },
  players: {
    type: [PlayerSchema],
    default: []
  },
  tournaments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  }],
  achievements: [{
    title: String,
    description: String,
    year: Number
  }],
  totalMatches: {
      type: Number,
      default: 0
    },
    matchesWon: {
      type: Number,
      default: 0
    },
    matchesLost: {
      type: Number,
      default: 0
    },
  matchesDrawn: {
      type: Number,
      default: 0
    },
  points: {
      type: Number,
      default: 0
    },
  netRunRate: {
      type: Number,
      default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc: ITeam, ret: any) {
      try {
        // Ensure players is an array, with proper type checking
        if (!ret.players || !Array.isArray(ret.players)) {
          ret.players = [];
        }
        
        // Calculate active players with null checks
        ret.activePlayers = ret.players
          .filter((p: IPlayer | null) => p && typeof p === 'object' && p.isActive === true) || [];
        ret.playerCount = ret.activePlayers.length;
        
        // Calculate win percentage with safe defaults
        const totalMatches = typeof ret.totalMatches === 'number' ? ret.totalMatches : 0;
        const matchesWon = typeof ret.matchesWon === 'number' ? ret.matchesWon : 0;
        ret.winPercentage = totalMatches > 0 ? 
          ((matchesWon / totalMatches) * 100).toFixed(2) + '%' : '0%';
        
        // Remove unnecessary fields
      delete ret.__v;
      return ret;
      } catch (error) {
        console.error('Error in Team transform:', error);
        // Return a safe default state
        return {
          ...ret,
          players: [],
          activePlayers: [],
          playerCount: 0,
          winPercentage: '0%',
        };
      }
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
TeamSchema.index({ city: 1, country: 1 });
TeamSchema.index({ isActive: 1 });
TeamSchema.index({ tournaments: 1 });
TeamSchema.index({ points: -1 });

const Team = mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
export default Team; 