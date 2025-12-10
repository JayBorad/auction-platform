'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft,
  User,
  Trophy,
  Target,
  FileText,
  Activity,
  Clock,
  DollarSign,
  TrendingUp,
  Star,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { usePlayers } from '@/hooks/usePlayers';
import Image from 'next/image';
import { formatCurrency } from '@/lib/format';

interface Team {
  _id: string;
  name: string;
}

interface AuctionHistory {
  auction: string;
  finalPrice: number;
  winner?: Team;
  status: 'sold' | 'unsold';
  year: number;
}

interface Player {
  _id: string;
  name: string;
  age: number;
  role: 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
  basePrice: number;
  soldPrice?: number;
  team?: Team;
  tournaments: string[];
  image: string;
  status: 'available' | 'sold' | 'unsold' | 'injured' | 'retired';
  battingHand: 'Left' | 'Right';
  battingStrikeRate?: number;
  runs?: number;
  highestScore?: number;
  bowlingHand?: 'Left' | 'Right' | null;
  bowlingStrikeRate?: number;
  bowlingAverage?: number;
  economy?: number;
  wickets?: number;
  bestBowlingStats?: string;
  ipl2025Team?: string;
  nationality: string;
  recentForm: 'excellent' | 'good' | 'average' | 'poor';
  marketValue?: number;
  auctionHistory?: AuctionHistory[];
  rating?: number;
  suggestedPrice?: number;
}

export default function TeamOwnerPlayerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;
  
  const { getPlayer } = usePlayers();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch player details
  useEffect(() => {
    const fetchPlayerDetails = async () => {
      if (!playerId) return;
      
      setLoading(true);
      try {
        const data = await getPlayer(playerId);
        setPlayer(data as Player);
      } catch (err) {
        setError('Failed to fetch player details');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerDetails();
  }, [playerId, getPlayer]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'batsman': return 'bg-blue-500';
      case 'bowler': return 'bg-red-500';
      case 'all-rounder': return 'bg-purple-500';
      case 'wicket-keeper': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'sold': return 'bg-blue-500';
      case 'unsold': return 'bg-gray-500';
      case 'injured': return 'bg-yellow-500';
      case 'retired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-red-400 mb-2">Error loading player</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{player?.name}</h1>
          <p className="text-gray-400">Player Details</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.back()} variant="outline" className="border-gray-600 text-gray-300">
            Back
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {player.image ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                  <Image
                    src={player.image}
                    alt={player.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <Avatar className="h-32 w-32">
                  <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <div className="space-y-2">
                <Badge className={`${getRoleColor(player.role)} text-white`}>
                  {player.role}
                </Badge>
                <p className="text-gray-400">
                  <span className="font-semibold text-white">Age:</span> {player.age} years
                </p>
                <p className="text-gray-400">
                  <span className="font-semibold text-white">Nationality:</span> {player.nationality}
                </p>
                <Badge className={`${getStatusColor(player.status)} text-white`}>
                  {player.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Batting Hand</Label>
                <p className="text-white">{player.battingHand}</p>
              </div>
              <div>
                <Label className="text-gray-400">Bowling Hand</Label>
                <p className="text-white">{player.bowlingHand || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valuation Information */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valuation Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Base Price</Label>
                <p className="text-2xl font-bold text-white">{formatCurrency(player.basePrice || 0)}</p>
              </div>
              <div>
                <Label className="text-gray-400">Market Value</Label>
                <p className="text-2xl font-bold text-white">{formatCurrency(player.marketValue || 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Player Rating</Label>
                <p className="text-2xl font-bold text-white">{Math.round(player.rating || 0)}/100</p>
              </div>
              <div>
                <Label className="text-gray-400">Suggested Price</Label>
                <p className="text-2xl font-bold text-white">{formatCurrency(player.suggestedPrice || 0)}</p>
              </div>
            </div>

            <div>
              <Label className="text-gray-400">Recent Form</Label>
              <Badge className={`${
                player.recentForm === 'excellent' ? 'bg-green-500' :
                player.recentForm === 'good' ? 'bg-blue-500' :
                player.recentForm === 'average' ? 'bg-yellow-500' :
                'bg-red-500'
              } text-white mt-1`}>
                {player.recentForm}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Batting Statistics */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              Batting Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Strike Rate</Label>
                <p className="text-xl font-semibold text-white">
                  {player.battingStrikeRate?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <Label className="text-gray-400">Total Runs</Label>
                <p className="text-xl font-semibold text-white">
                  {player.runs?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <Label className="text-gray-400">Highest Score</Label>
                <p className="text-xl font-semibold text-white">
                  {player.highestScore || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bowling Statistics */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Bowling Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Strike Rate</Label>
                <p className="text-xl font-semibold text-white">
                  {player.bowlingStrikeRate?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <Label className="text-gray-400">Average</Label>
                <p className="text-xl font-semibold text-white">
                  {player.bowlingAverage?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <Label className="text-gray-400">Economy</Label>
                <p className="text-xl font-semibold text-white">
                  {player.economy?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <Label className="text-gray-400">Wickets</Label>
                <p className="text-xl font-semibold text-white">
                  {player.wickets || '0'}
                </p>
              </div>
              {player.bestBowlingStats && (
                <div>
                  <Label className="text-gray-400">Best Bowling</Label>
                  <p className="text-xl font-semibold text-white">
                    {player.bestBowlingStats}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">IPL 2025 Team</Label>
                <p className="text-white">{player.ipl2025Team || 'Not assigned'}</p>
              </div>
              <div>
                <Label className="text-gray-400">Current Team</Label>
                <p className="text-white">
                  {player.team ? player.team.name : 'Not assigned'}
                </p>
              </div>
              <div>
                <Label className="text-gray-400">Tournaments</Label>
                <p className="text-white">{player.tournaments?.length || 0} registered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auction History */}
        {player.auctionHistory && player.auctionHistory.length > 0 && (
          <Card className="bg-gray-900 border-gray-700 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Auction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Year</TableHead>
                    <TableHead className="text-gray-400">Final Price</TableHead>
                    <TableHead className="text-gray-400">Winner</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {player.auctionHistory.map((history, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-white">{history?.year}</TableCell>
                      <TableCell className="text-white">{formatCurrency(history.finalPrice || 0)}</TableCell>
                      <TableCell className="text-white">{history?.winner?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={history?.status === 'sold' ? 'default' : 'secondary'}>
                          {history?.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 