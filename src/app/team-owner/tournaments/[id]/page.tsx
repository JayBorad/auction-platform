'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Users, DollarSign, Timer, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Team {
  _id: string;
  name: string;
  logo?: string;
  city: string;
  owner: string;
}

interface Player {
  _id: string;
  name: string;
  role: string;
  basePrice: number;
  image?: string;
  nationality: string;
  age: number;
}

interface TeamEntry {
  _id: string;
  team: Team;
  budget: {
    total: number;
    used: number;
    remaining: number;
  };
}

interface PlayerEntry {
  _id: string;
  player: Player;
  basePrice: number;
  category: string;
  status: string;
  soldPrice?: number;
  soldTo?: Team;
}

interface Tournament {
  _id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  maxTeams: number;
  entryFee: number;
  prizePool: number;
  format: string;
  venue: string;
  city: string;
  country: string;
  organizer: string;
  contactEmail: string;
  contactPhone: string;
  rules: string;
  isPublic: boolean;
  isActive: boolean;
  participatingTeams: TeamEntry[];
  playerPool: {
    totalPlayers: number;
    availablePlayers: PlayerEntry[];
    soldPlayers: PlayerEntry[];
    unsoldPlayers: PlayerEntry[];
  };
  teamConfiguration: {
    maxTeams: number;
    minPlayersPerTeam: number;
    maxPlayersPerTeam: number;
    maxForeignPlayers: number;
    captainRequired: boolean;
    wicketKeeperRequired: boolean;
  };
  financial: {
    totalBudget: number;
    entryFee: number;
    prizeDistribution: {
      winner: number;
      runnerUp: number;
      thirdPlace: number;
      fourthPlace: number;
      others: number;
    };
  };
  settings: {
    auctionSettings: {
      bidIncrement: number;
      timePerBid: number;
      maxBidsPerPlayer: number;
      rtmpEnabled: boolean;
    };
  };
  auctions: any[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

import { formatCurrency } from '@/lib/format';

export default function TeamOwnerTournamentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (params.id) {
      fetchTournamentDetails();
    }
  }, [params.id]);

  const fetchTournamentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournaments/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tournament details');
      }
      const data = await response.json();

      if (data.success) {
        console.log('Tournament data:', data);
        setTournament(data.data.tournament);
      } else {
        toast.error(data.error || 'Failed to load tournament details');
      }
    } catch (error) {
      console.error('Error fetching tournament details:', error);
      toast.error('Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500';
      case 'upcoming': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/team-owner/tournaments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/team-owner/tournaments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </div>
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Tournament not found</h3>
          <p className="text-gray-500">The tournament you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/team-owner/tournaments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{tournament?.name || 'Loading...'}</h1>
            <p className="text-gray-400">{tournament?.description || 'Loading tournament details...'}</p>
          </div>
        </div>
        {tournament?.status && (
          <Badge className={getStatusColor(tournament.status)}>
            {tournament.status.toUpperCase()}
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <Card className="bg-gray-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Teams</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Max: {tournament?.maxTeams || 0}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-blue-400 mr-2" />
              <span className="text-2xl font-bold">{tournament?.participatingTeams?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Players</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Format: {tournament?.format || 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-green-400 mr-2" />
              <span className="text-2xl font-bold">{tournament?.playerPool?.totalPlayers || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Available Players</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Entry Fee: {formatCurrency(tournament?.entryFee || 0)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-yellow-400 mr-2" />
              <span className="text-2xl font-bold">{tournament?.playerPool?.availablePlayers?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Prize Pool</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Winner: {formatCurrency(tournament?.financial?.prizeDistribution?.winner || 0)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-green-400 mr-2" />
              <span className="text-2xl font-bold">{formatCurrency(tournament?.prizePool || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tournament Info */}
      {tournament && (
        <Card className="bg-gray-900/50 mb-6">
          <CardHeader className='max-sm:p-4'>
            <CardTitle>Tournament Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 max-sm:px-4 max-sm:pb-4">
            <div>
              <h4 className="text-sm font-medium text-gray-400">Venue</h4>
              <p className="text-white">{tournament.venue || 'N/A'}</p>
              <p className="text-sm text-gray-500">{tournament.city || 'N/A'}, {tournament.country || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-400">Organizer</h4>
              <p className="text-white">{tournament.organizer || 'N/A'}</p>
              <p className="text-sm text-gray-500">{tournament.contactEmail || 'N/A'}</p>
              <p className="text-sm text-gray-500">{tournament.contactPhone || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-400">Team Configuration</h4>
              <p className="text-sm text-gray-500">Min Players: {tournament.teamConfiguration?.minPlayersPerTeam || 'N/A'}</p>
              <p className="text-sm text-gray-500">Max Players: {tournament.teamConfiguration?.maxPlayersPerTeam || 'N/A'}</p>
              <p className="text-sm text-gray-500">Max Foreign Players: {tournament.teamConfiguration?.maxForeignPlayers || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-400">Auction Settings</h4>
              <p className="text-sm text-gray-500">Bid Increment: {formatCurrency(tournament.settings?.auctionSettings?.bidIncrement || 0)}</p>
              <p className="text-sm text-gray-500">Time per Bid: {tournament.settings?.auctionSettings?.timePerBid || 0}s</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column - Teams */}
        <Card className="lg:col-span-6 xl:col-span-4 bg-gray-900/50">
          <CardHeader className='max-sm:p-4'>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participating Teams
            </CardTitle>
            <CardDescription>
              {tournament?.participatingTeams?.length || 0} of {tournament?.maxTeams || 0} teams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-sm:px-4 max-sm:pb-4">
            {tournament?.participatingTeams?.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No teams have joined yet</p>
              </div>
            ) : (
              tournament?.participatingTeams?.map((teamEntry) => (
                <div key={teamEntry._id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={teamEntry.team?.logo} />
                      <AvatarFallback>{teamEntry.team?.name?.[0] || 'T'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">{teamEntry.team?.name || 'Unknown Team'}</p>
                      <p className="text-sm text-gray-400">
                        Budget: {formatCurrency(teamEntry.budget?.remaining || 0)} remaining
                      </p>
                    </div>
                  </div>
                  {teamEntry.team?.owner === 'current-user-id' && (
                    <Badge className="bg-blue-500">Your Team</Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Column - Players */}
        <Card className="lg:col-span-6 xl:col-span-8 bg-gray-900/50">
          <CardHeader className='max-sm:p-4'>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Player Pool
            </CardTitle>
            <CardDescription>
              Total Players: {tournament?.playerPool?.totalPlayers || 0} | 
              Available: {tournament?.playerPool?.availablePlayers?.length || 0} | 
              Sold: {tournament?.playerPool?.soldPlayers?.length || 0}
            </CardDescription>
          </CardHeader>
          <CardContent className='max-sm:px-4 max-sm:pb-4'>
            <Tabs defaultValue="available" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="available" className="flex-1">Available Players</TabsTrigger>
                <TabsTrigger value="sold" className="flex-1">Sold Players</TabsTrigger>
              </TabsList>
              <TabsContent value="available">
                {tournament?.playerPool?.availablePlayers?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No available players</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tournament?.playerPool?.availablePlayers?.map((playerEntry) => (
                      <div key={playerEntry._id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={playerEntry.player?.image} />
                            <AvatarFallback>{playerEntry.player?.name?.[0] || 'P'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{playerEntry.player?.name || 'Unknown Player'}</p>
                            <p className="text-sm text-gray-400">
                              {playerEntry.player?.role || 'Unknown Role'} | Base Price: {formatCurrency(playerEntry.basePrice || 0)}
                            </p>
                          </div>
                        </div>
                        <Badge>{playerEntry.category || 'Standard'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="sold">
                {tournament?.playerPool?.soldPlayers?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No players have been sold yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tournament?.playerPool?.soldPlayers?.map((playerEntry) => (
                      <div key={playerEntry._id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={playerEntry.player?.image} />
                            <AvatarFallback>{playerEntry.player?.name?.[0] || 'P'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{playerEntry.player?.name || 'Unknown Player'}</p>
                            <p className="text-sm text-gray-400">
                              {playerEntry.player?.role || 'Unknown Role'} | Sold for: {formatCurrency(playerEntry.soldPrice || 0)}
                            </p>
                          </div>
                        </div>
                        <Badge>{playerEntry.soldTo?.name || 'Unknown Team'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 