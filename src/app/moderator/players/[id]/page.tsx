'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit, 
  User, 
  Trophy, 
  Target, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Loader2,
  FileText,
  Settings,
  Activity,
  Award,
  Clock,
  DollarSign,
  TrendingUp,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { usePlayers, Player } from '@/hooks/usePlayers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { amountToLakh, lakhToAmount } from '@/lib/format';

interface PlayerDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function ModeratorPlayerDetailsPage({ params }: PlayerDetailsPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const playerId = resolvedParams.id;
  
  const { getPlayer, updatePlayer, updatePlayerStatus } = usePlayers();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: 18,
    nationality: 'Indian',
    role: 'batsman',
    battingHand: 'Right',
    bowlingHand: 'none',
    basePrice: '0',
    image: '',
    battingStrikeRate: 0,
    runs: 0,
    highestScore: 0,
    bowlingStrikeRate: 0,
    bowlingAverage: 0,
    economy: 0,
    wickets: 0,
    bestBowlingStats: '',
    ipl2025Team: '',
    recentForm: 'average',
    marketValue: 0,
    status: 'available'
  });

  // Fetch player details
  useEffect(() => {
    const fetchPlayerDetails = async () => {
      if (!playerId) return;
      
      setLoading(true);
      try {
        const data = await getPlayer(playerId);
        setPlayer(data);
        
        // Populate form data for editing (convert basePrice to lakh)
        setFormData({
          name: data.name,
          age: data.age,
          nationality: data.nationality,
          role: data.role,
          battingHand: data.battingHand,
          bowlingHand: data.bowlingHand || 'none',
          basePrice: amountToLakh(data.basePrice).toFixed(2),
          image: data.image || '',
          battingStrikeRate: data.battingStrikeRate || 0,
          runs: data.runs || 0,
          highestScore: data.highestScore || 0,
          bowlingStrikeRate: data.bowlingStrikeRate || 0,
          bowlingAverage: data.bowlingAverage || 0,
          economy: data.economy || 0,
          wickets: data.wickets || 0,
          bestBowlingStats: data.bestBowlingStats || '',
          ipl2025Team: data.ipl2025Team || '',
          recentForm: data.recentForm || 'average',
          marketValue: data.marketValue || 0,
          status: data.status
        });
      } catch (err) {
        setError('Failed to fetch player details');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerDetails();
  }, [playerId, getPlayer]);

  const handleUpdatePlayer = async () => {
    if (!player) return;
    
    try {
      // Convert basePrice from lakh to amount
      const updateData = {
        ...formData,
        basePrice: lakhToAmount(formData.basePrice),
        bowlingHand: formData.bowlingHand === 'none' ? null : formData.bowlingHand,
      };
      
      const updatedPlayer = await updatePlayer(player._id, updateData);
      if (updatedPlayer) {
        setPlayer(updatedPlayer);
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      console.log('error', error)
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!player) return;
    
    try {
      await updatePlayerStatus(player._id, status);
      setPlayer({ ...player, status: status as any });
    } catch (error) {
      console.log('error', error)
    }
  };

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
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
          <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Player not found</h3>
          <p className="text-gray-500">{error || 'The player you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 max-md:w-full">
          <Button className='w-fit' variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-white">{player?.name}</h1>
            <p className="text-gray-400">{player?.nationality} • {player?.age} years old</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 max-md:mx-auto">
          <Badge className={`${getStatusColor(player?.status)} text-white`}>
            {player?.status}
          </Badge>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto max-sm:p-4">
              <DialogHeader>
                <DialogTitle className="text-white">Edit Player</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Update player information and stats.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger
                    value="basic"
                    className="max-sm:text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-colors"
                  >
                    Basic Info
                  </TabsTrigger>
                  <TabsTrigger
                    value="batting"
                    className="max-sm:text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-colors"
                  >
                    Batting
                  </TabsTrigger>
                  <TabsTrigger
                    value="bowling"
                    className="max-sm:text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-colors"
                  >
                    Bowling
                  </TabsTrigger>
                  <TabsTrigger
                    value="additional"
                    className="max-sm:text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-colors"
                  >
                    Additional
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age" className="text-white">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({...formData, age: parseInt(e.target.value) || 18})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality" className="text-white">Nationality</Label>
                      <Input
                        id="nationality"
                        value={formData.nationality}
                        onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-white">Role</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="batsman">Batsman</SelectItem>
                          <SelectItem value="bowler">Bowler</SelectItem>
                          <SelectItem value="all-rounder">All-rounder</SelectItem>
                          <SelectItem value="wicket-keeper">Wicket-keeper</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="basePrice" className="text-white">Base Price (Lakh)</Label>
                      <div className="relative">
                        <Input
                          id="basePrice"
                          type="number"
                          step="0.01"
                          value={formData.basePrice}
                          onChange={(e) => setFormData({...formData, basePrice: e.target.value})}
                          className="bg-gray-800 border-gray-600 text-white pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Lakh</span>
                      </div>
                      {formData.basePrice && !isNaN(parseFloat(formData.basePrice)) && (
                        <p className="text-xs text-gray-400">= ₹{lakhToAmount(formData.basePrice).toLocaleString('en-IN')}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image" className="text-white">Image URL</Label>
                      <Input
                        id="image"
                        value={formData.image}
                        onChange={(e) => setFormData({...formData, image: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="batting" className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="battingHand" className="text-white">Batting Hand</Label>
                      <Select value={formData.battingHand} onValueChange={(value) => setFormData({...formData, battingHand: value})}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="Right">Right</SelectItem>
                          <SelectItem value="Left">Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="battingStrikeRate" className="text-white">Strike Rate</Label>
                      <Input
                        id="battingStrikeRate"
                        type="number"
                        value={formData.battingStrikeRate}
                        onChange={(e) => setFormData({...formData, battingStrikeRate: parseInt(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="runs" className="text-white">Total Runs</Label>
                      <Input
                        id="runs"
                        type="number"
                        value={formData.runs}
                        onChange={(e) => setFormData({...formData, runs: parseInt(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="highestScore" className="text-white">Highest Score</Label>
                      <Input
                        id="highestScore"
                        type="number"
                        value={formData.highestScore}
                        onChange={(e) => setFormData({...formData, highestScore: parseInt(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bowling" className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bowlingHand" className="text-white">Bowling Hand</Label>
                      <Select value={formData.bowlingHand} onValueChange={(value) => setFormData({...formData, bowlingHand: value})}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="Right">Right</SelectItem>
                          <SelectItem value="Left">Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bowlingStrikeRate" className="text-white">Strike Rate</Label>
                      <Input
                        id="bowlingStrikeRate"
                        type="number"
                        value={formData.bowlingStrikeRate}
                        onChange={(e) => setFormData({...formData, bowlingStrikeRate: parseFloat(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bowlingAverage" className="text-white">Average</Label>
                      <Input
                        id="bowlingAverage"
                        type="number"
                        value={formData.bowlingAverage}
                        onChange={(e) => setFormData({...formData, bowlingAverage: parseInt(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="economy" className="text-white">Economy</Label>
                      <Input
                        id="economy"
                        type="number"
                        value={formData.economy}
                        onChange={(e) => setFormData({...formData, economy: parseFloat(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wickets" className="text-white">Wickets</Label>
                      <Input
                        id="wickets"
                        type="number"
                        value={formData.wickets}
                        onChange={(e) => setFormData({...formData, wickets: parseInt(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bestBowlingStats" className="text-white">Best Bowling</Label>
                      <Input
                        id="bestBowlingStats"
                        value={formData.bestBowlingStats}
                        onChange={(e) => setFormData({...formData, bestBowlingStats: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="additional" className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ipl2025Team" className="text-white">IPL 2025 Team</Label>
                      <Input
                        id="ipl2025Team"
                        value={formData.ipl2025Team}
                        onChange={(e) => setFormData({...formData, ipl2025Team: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recentForm" className="text-white">Recent Form</Label>
                      <Select value={formData.recentForm} onValueChange={(value) => setFormData({...formData, recentForm: value})}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="average">Average</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marketValue" className="text-white">Market Value</Label>
                      <Input
                        id="marketValue"
                        type="number"
                        value={formData.marketValue}
                        onChange={(e) => setFormData({...formData, marketValue: parseInt(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-white">Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="available">Available</SelectItem>
                          {/* <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="unsold">Unsold</SelectItem> */}
                          <SelectItem value="injured">Injured</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className='gap-4'>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdatePlayer}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Player Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Basic Information Card */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={player?.image} alt={player?.name} />
                <AvatarFallback>{player?.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className='w-full'>
                <Badge className={`${getRoleColor(player?.role)} text-white mb-2`}>
                  {player?.role}
                </Badge>
                <p className="text-gray-400">
                  <span className="font-semibold text-white">Base Price:</span> {formatCurrency(player?.basePrice || 0)}
                </p>
                <p className="text-gray-400">
                  <span className="font-semibold text-white">Batting Hand:</span> {player?.battingHand}
                </p>
                {player.bowlingHand && (
                  <p className="text-gray-400">
                    <span className="font-semibold text-white">Bowling Hand:</span> {player?.bowlingHand}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics Card */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 mb-1">Player Rating</p>
                <div className="text-2xl font-bold text-white">
                  {Math.round(player?.rating || 0)}/100
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Suggested Price</p>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(player?.suggestedPrice || 0)}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Recent Form</p>
                <Badge className={`${
                  player.recentForm === 'excellent' ? 'bg-green-500' :
                  player.recentForm === 'good' ? 'bg-blue-500' :
                  player.recentForm === 'average' ? 'bg-yellow-500' :
                  'bg-red-500'
                } text-white`}>
                  {player.recentForm}
                </Badge>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Market Value</p>
                <div className="text-white">
                  {formatCurrency(player.marketValue || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batting Statistics Card */}
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
                <p className="text-gray-400 mb-1">Strike Rate</p>
                <div className="text-xl font-semibold text-white">
                  {player?.battingStrikeRate?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Total Runs</p>
                <div className="text-xl font-semibold text-white">
                  {player?.runs?.toLocaleString() || '0'}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Highest Score</p>
                <div className="text-xl font-semibold text-white">
                  {player?.highestScore || '0'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bowling Statistics Card */}
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
                <p className="text-gray-400 mb-1">Strike Rate</p>
                <div className="text-xl font-semibold text-white">
                  {player?.bowlingStrikeRate?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Average</p>
                <div className="text-xl font-semibold text-white">
                  {player?.bowlingAverage?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Economy</p>
                <div className="text-xl font-semibold text-white">
                  {player?.economy?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Wickets</p>
                <div className="text-xl font-semibold text-white">
                  {player?.wickets || '0'}
                </div>
              </div>
              {player.bestBowlingStats && (
                <div>
                  <p className="text-gray-400 mb-1">Best Bowling</p>
                  <div className="text-xl font-semibold text-white">
                    {player?.bestBowlingStats}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Information Card */}
        <Card className="bg-gray-900 border-gray-700 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 mb-1">IPL 2025 Team</p>
                <div className="text-white">
                  {player?.ipl2025Team || 'Not assigned'}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Current Team</p>
                <div className="text-white">
                  {player?.team ? 'Assigned' : 'Not assigned'}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Tournaments</p>
                <div className="text-white">
                  {player?.tournaments?.length || 0} registered
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auction History Card */}
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
                    <TableHead>Year</TableHead>
                    <TableHead>Final Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Team</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {player.auctionHistory.map((history, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-white">{history.year}</TableCell>
                      <TableCell className="text-white">{formatCurrency(history.finalPrice || 0)}</TableCell>
                      <TableCell>
                        <Badge className={`${history.status === 'sold' ? 'bg-green-500' : 'bg-gray-500'} text-white`}>
                          {history.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">{history.winner ? 'Team Name' : '-'}</TableCell>
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