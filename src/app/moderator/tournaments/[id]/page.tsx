'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Trophy, 
  Users, 
  DollarSign, 
  Loader2,
  Play,
  Settings,
  Award,
  Clock,
  Building,
  Plus,
  UserMinus,
  Gavel,
  Star,
  Eye,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  Crown,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { useTournaments, CreateTournamentData } from '@/hooks/useTournaments';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, amountToLakh, lakhToAmount } from '@/lib/format';

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
}

interface TournamentProps {
  _id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
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
  prizes: {
    winner: number;
    runnerUp: number;
    thirdPlace: number;
  };
  isPublic: boolean;
  participatingTeams: TeamEntry[];
  playerPool: {
    totalPlayers: number;
    availablePlayers: PlayerEntry[];
    soldPlayers: PlayerEntry[];
    unsoldPlayers: PlayerEntry[];
  };
  auctions: any[];
  teamConfiguration?: {
    maxTeams: number;
    minPlayersPerTeam: number;
    maxPlayersPerTeam: number;
    maxForeignPlayers: number;
  };
}

interface TournamentStats {
  totalTeams: number;
  totalPlayers: number;
  soldPlayers: number;
  availablePlayers: number;
  totalBudgetAllocated: number;
  averagePlayerPrice: number;
  auctionsCompleted: number;
  auctionsScheduled: number;
  liveAuctions: number;
}

export default function TournamentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;
  
  const { getTournament, updateTournament, deleteTournament, updateTournamentStatus } = useTournaments();
  
  const [tournament, setTournament] = useState<TournamentProps | null>(null);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateTournamentData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    registrationStartDate: '',
    registrationEndDate: '',
    maxTeams: 8,
    entryFee: 0,
    prizePool: 0,
    format: 'T20',
    venue: '',
    city: '',
    country: 'India',
    organizer: '',
    contactEmail: '',
    contactPhone: '',
    rules: '',
    prizes: {
      winner: 0,
      runnerUp: 0,
      thirdPlace: 0
    },
    isPublic: true
  });

  // Team Management State
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [showAddTeamDialog, setShowAddTeamDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamBudgetLakh, setTeamBudgetLakh] = useState('500'); // 500 lakh = 50 crore

  // Player Management State
  const [availablePlayersToAdd, setAvailablePlayersToAdd] = useState<any[]>([]);
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [playerBasePriceLakh, setPlayerBasePriceLakh] = useState('');
  const [playerCategory, setPlayerCategory] = useState('standard');
  const [isAddingAllPlayers, setIsAddingAllPlayers] = useState(false);

  // Auto-fill base price when player is selected (convert to lakh)
  useEffect(() => {
    if (selectedPlayer && availablePlayersToAdd.length > 0) {
      const player = availablePlayersToAdd.find(p => p._id === selectedPlayer);
      if (player && player.basePrice) {
        const basePriceInLakh = amountToLakh(player.basePrice);
        setPlayerBasePriceLakh(basePriceInLakh.toFixed(2));
      }
    }
  }, [selectedPlayer, availablePlayersToAdd]);

  // Tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch tournament details
  useEffect(() => {
    const fetchTournamentDetails = async () => {
      if (!tournamentId) return;
      
      setLoading(true);
      try {
        const data = await getTournament(tournamentId);
        setTournament(data.tournament);
        setStats(data.stats);
        
        // Populate form data for editing
        setFormData({
          name: data.tournament.name,
          description: data.tournament.description,
          startDate: data.tournament.startDate.split('T')[0],
          endDate: data.tournament.endDate.split('T')[0],
          registrationStartDate: data.tournament.registrationStartDate.split('T')[0],
          registrationEndDate: data.tournament.registrationEndDate.split('T')[0],
          maxTeams: data.tournament.maxTeams,
          entryFee: data.tournament.entryFee,
          prizePool: data.tournament.prizePool,
          format: data.tournament.format,
          venue: data.tournament.venue,
          city: data.tournament.city,
          country: data.tournament.country,
          organizer: data.tournament.organizer,
          contactEmail: data.tournament.contactEmail,
          contactPhone: data.tournament.contactPhone,
          rules: data.tournament.rules || '',
          prizes: data.tournament.prizes,
          isPublic: data.tournament.isPublic
        });
      } catch (err) {
        setError('Failed to fetch tournament details');
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentDetails();
  }, [tournamentId, getTournament]);

  // Define fetchTournamentDetails function for reuse
  const fetchTournamentDetails = async () => {
    if (!tournamentId) return;
    
    setLoading(true);
    try {
      const data = await getTournament(tournamentId);
      setTournament(data.tournament);
      setStats(data.stats);
    } catch (err) {
      setError('Failed to fetch tournament details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTournament = async () => {
    if (!tournament) return;
    
    try {
      const updatedTournament = await updateTournament(tournament._id, formData);
      setTournament(updatedTournament);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.log('error', error)
    }
  };

  const handleDeleteTournament = async () => {
    if (!tournament) return;
    
    try {
      await deleteTournament(tournament._id);
      router.push('/moderator/tournaments');
    } catch (error) {
      console.log('error', error)
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!tournament) return;
    
    try {
      const updatedTournament = await updateTournamentStatus(tournament._id, status);
      setTournament(updatedTournament);
    } catch (error) {
      toast.error('Failed to update tournament status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'upcoming': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRegistrationStatus = () => {
    if (!tournament) return 'Unknown';
    
    const now = new Date();
    const regStart = new Date(tournament.registrationStartDate);
    const regEnd = new Date(tournament.registrationEndDate);
    
    if (now < regStart) return 'Not Started';
    if (now > regEnd) return 'Closed';
    return 'Open';
  };

  const fetchAvailableTeams = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/teams`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableTeams(data.data.availableTeams);
      }
    } catch (error) {
      console.error('Error fetching available teams:', error);
    }
  };

  const fetchAvailablePlayersToAdd = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/players`);
      const data = await response.json();
      
      if (data.success) {
        setAvailablePlayersToAdd(data.data.availableToAdd || []);
        if (!data.data.availableToAdd || data.data.availableToAdd.length === 0) {
          toast.info('No players available to add. All players may already be in this tournament.');
        }
      } else {
        setAvailablePlayersToAdd([]);
        toast.error(data.error || 'Failed to fetch available players');
      }
    } catch (error) {
      console.error('Error fetching available players:', error);
      setAvailablePlayersToAdd([]);
      toast.error('Failed to fetch available players');
    }
  };

  const handleAddTeam = async () => {
    if (!selectedTeam) {
      toast.error('Please select a team');
      return;
    }

    try {
      // Convert lakh to actual amount
      const budgetAmount = lakhToAmount(teamBudgetLakh);
      
      const response = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId: selectedTeam, 
          budget: budgetAmount
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Team added successfully');
        setShowAddTeamDialog(false);
        setSelectedTeam('');
        setTeamBudgetLakh('500'); // Reset to 500 lakh
        fetchTournamentDetails();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error adding team:', error);
      toast.error('Failed to add team');
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Team removed successfully');
        fetchTournamentDetails();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error removing team:', error);
      toast.error('Failed to remove team');
    }
  };

  const handleAddPlayer = async () => {
    if (!selectedPlayer || selectedPlayer === 'no-players' || !playerBasePriceLakh) {
      toast.error('Please select a player and set base price');
      return;
    }

    try {
      // Convert lakh to actual amount
      const basePriceAmount = lakhToAmount(playerBasePriceLakh);
      
      const response = await fetch(`/api/tournaments/${tournamentId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId: selectedPlayer, 
          basePrice: basePriceAmount,
          category: playerCategory
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Player added successfully');
        setShowAddPlayerDialog(false);
        setSelectedPlayer('');
        setPlayerBasePriceLakh('');
        setPlayerCategory('standard');
        fetchTournamentDetails();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error adding player:', error);
      toast.error('Failed to add player');
    }
  };

  const handleAddAllPlayers = async () => {
    if (!availablePlayersToAdd || availablePlayersToAdd.length === 0) {
      toast.error('No players available to add');
      return;
    }

    setIsAddingAllPlayers(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/players`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-all',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `Successfully added ${data.data?.added || 0} player(s)`);
        fetchTournamentDetails();
        fetchAvailablePlayersToAdd();
      } else {
        toast.error(data.error || 'Failed to add all players');
      }
    } catch (error) {
      console.error('Error adding all players:', error);
      toast.error('Failed to add all players');
    } finally {
      setIsAddingAllPlayers(false);
    }
  };


  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'marquee': return 'bg-yellow-500';
      case 'premium': return 'bg-purple-500';
      case 'standard': return 'bg-blue-500';
      case 'emerging': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!playerId) {
      toast.error('Invalid player ID');
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/players`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Player removed successfully');
        fetchTournamentDetails();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error removing player:', error);
      toast.error('Failed to remove player');
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

  if (error || !tournament) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Tournament not found</h3>
          <p className="text-gray-500">{error || 'The tournament you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
            <p className="text-gray-400">{tournament.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(tournament.status)} text-white`}>
            {tournament.status}
          </Badge>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto max-sm:p-4">
              <DialogHeader>
                <DialogTitle className="text-white">Edit Tournament</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Update tournament details and settings.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                    <TabsTrigger
                      value="basic"
                      className="max-sm:text-xs text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-colors"
                    >
                      Basic Info
                    </TabsTrigger>
                    <TabsTrigger
                      value="dates"
                      className="max-sm:text-xs text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-colors"
                    >
                      Dates & Teams
                    </TabsTrigger>
                    <TabsTrigger
                      value="details"
                      className="max-sm:text-xs text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-colors"
                    >
                      Details
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-white">Tournament Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="format" className="text-white">Format</Label>
                        <Select value={formData.format} onValueChange={(value) => setFormData({...formData, format: value})}>
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="T20">T20</SelectItem>
                            <SelectItem value="ODI">ODI</SelectItem>
                            <SelectItem value="T10">T10</SelectItem>
                            <SelectItem value="Test">Test</SelectItem>
                            <SelectItem value="The Hundred">The Hundred</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-white">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="venue" className="text-white">Venue</Label>
                        <Input
                          id="venue"
                          value={formData.venue}
                          onChange={(e) => setFormData({...formData, venue: e.target.value})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-white">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="dates" className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="registrationStartDate" className="text-white">Registration Start</Label>
                        <Input
                          id="registrationStartDate"
                          type="date"
                          value={formData.registrationStartDate}
                          onChange={(e) => setFormData({...formData, registrationStartDate: e.target.value})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="registrationEndDate" className="text-white">Registration End</Label>
                        <Input
                          id="registrationEndDate"
                          type="date"
                          value={formData.registrationEndDate}
                          onChange={(e) => setFormData({...formData, registrationEndDate: e.target.value})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate" className="text-white">Tournament Start</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate" className="text-white">Tournament End</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxTeams" className="text-white">Max Teams</Label>
                        <Input
                          id="maxTeams"
                          type="number"
                          value={formData.maxTeams}
                          onChange={(e) => setFormData({...formData, maxTeams: parseInt(e.target.value) || 0})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="entryFee" className="text-white">Entry Fee</Label>
                        <Input
                          id="entryFee"
                          type="number"
                          value={formData.entryFee}
                          onChange={(e) => setFormData({...formData, entryFee: parseInt(e.target.value) || 0})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prizePool" className="text-white">Prize Pool</Label>
                        <Input
                          id="prizePool"
                          type="number"
                          value={formData.prizePool}
                          onChange={(e) => setFormData({...formData, prizePool: parseInt(e.target.value) || 0})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="details" className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="organizer" className="text-white">Organizer</Label>
                        <Input
                          id="organizer"
                          value={formData.organizer}
                          onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail" className="text-white">Contact Email</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone" className="text-white">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="rules" className="text-white">Rules & Regulations</Label>
                      <Textarea
                        id="rules"
                        value={formData.rules}
                        onChange={(e) => setFormData({...formData, rules: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                        rows={4}
                      />
                    </div>
                    
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="winner" className="text-white">Winner Prize</Label>
                        <Input
                          id="winner"
                          type="number"
                          value={formData.prizes?.winner || 0}
                          onChange={(e) => setFormData({
                            ...formData, 
                            prizes: {
                              winner: parseInt(e.target.value) || 0,
                              runnerUp: formData.prizes?.runnerUp || 0,
                              thirdPlace: formData.prizes?.thirdPlace || 0
                            }
                          })}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="runnerUp" className="text-white">Runner-up Prize</Label>
                        <Input
                          id="runnerUp"
                          type="number"
                          value={formData.prizes?.runnerUp || 0}
                          onChange={(e) => setFormData({
                            ...formData, 
                            prizes: {
                              winner: formData.prizes?.winner || 0,
                              runnerUp: parseInt(e.target.value) || 0,
                              thirdPlace: formData.prizes?.thirdPlace || 0
                            }
                          })}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="thirdPlace" className="text-white">Third Place Prize</Label>
                        <Input
                          id="thirdPlace"
                          type="number"
                          value={formData.prizes?.thirdPlace || 0}
                          onChange={(e) => setFormData({
                            ...formData, 
                            prizes: {
                              winner: formData.prizes?.winner || 0,
                              runnerUp: formData.prizes?.runnerUp || 0,
                              thirdPlace: parseInt(e.target.value) || 0
                            }
                          })}
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              <DialogFooter className='gap-2'>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-gray-600 text-gray-300">
                  Cancel
                </Button>
                <Button onClick={handleUpdateTournament} className="bg-green-600 hover:bg-green-700">
                  Update Tournament
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Delete Tournament</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to delete this tournament? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="border-gray-600 text-gray-300">
                  Cancel
                </Button>
                <Button onClick={handleDeleteTournament} className="bg-red-600 hover:bg-red-700">
                  Delete Tournament
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div 
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Teams</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.totalTeams || 0} / {tournament?.teamConfiguration?.maxTeams || tournament?.maxTeams || 8}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-400" />
            </div>
            <Progress 
              value={(stats?.totalTeams || 0) / (tournament?.teamConfiguration?.maxTeams || tournament?.maxTeams || 8) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/50 border-emerald-700/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-200 text-sm">Players</p>
                <p className="text-2xl font-bold text-white">{stats?.totalPlayers || 0}</p>
                <p className="text-xs text-emerald-300">
                  {stats?.soldPlayers || 0} sold, {stats?.availablePlayers || 0} available
                </p>
              </div>
              <Trophy className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-900/50 to-teal-800/50 border-teal-700/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-200 text-sm">Budget Used</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.totalBudgetAllocated || 0)}
                </p>
                <p className="text-xs text-teal-300">
                  Avg: {formatCurrency(stats?.averagePlayerPrice || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-teal-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/50 border-cyan-700/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-200 text-sm">Auctions</p>
                <p className="text-2xl font-bold text-white">{tournament?.auctions?.length || 0}</p>
                <p className="text-xs text-cyan-300">
                  {stats?.liveAuctions || 0} live, {stats?.auctionsScheduled || 0} scheduled
                </p>
              </div>
              <Gavel className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Teams</TabsTrigger>
            <TabsTrigger value="players" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Players</TabsTrigger>
            <TabsTrigger value="auctions" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Auctions</TabsTrigger>
            {/* <TabsTrigger value="financial" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Financial</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Settings</TabsTrigger> */}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Tournament Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Description</Label>
                    <p className="text-white">{tournament.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Format</Label>
                      <p className="text-white">{tournament.format}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Status</Label>
                      <Badge className={`${getStatusColor(tournament.status)} text-white ml-2`}>
                        {tournament.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Start Date</Label>
                      <p className="text-white">{new Date(tournament.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-gray-400">End Date</Label>
                      <p className="text-white">{new Date(tournament.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Venue</Label>
                    <p className="text-white">{tournament.venue}, {tournament.city}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('teams')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Teams ({stats?.totalTeams || 0})
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('players')}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Manage Players ({stats?.totalPlayers || 0})
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('auctions')}
                  >
                    <Gavel className="h-4 w-4 mr-2" />
                    Manage Auctions ({tournament?.auctions?.length || 0})
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setActiveTab('financial')}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Financial Overview
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <div className="flex gap-3 flex-wrap justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Team Management</h2>
              <Dialog open={showAddTeamDialog} onOpenChange={setShowAddTeamDialog}>
                <DialogTrigger asChild>
                  <Button onClick={fetchAvailableTeams}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 border-gray-700 max-sm:p-4">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add Team to Tournament</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Select a team to add to this tournament
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-400">Select Team</Label>
                      <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue placeholder="Choose a team" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {availableTeams.map((team) => (
                            <SelectItem key={team._id} value={team._id}>
                              {team.name} - {team.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-400">Budget (Lakh)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={teamBudgetLakh}
                          onChange={(e) => setTeamBudgetLakh(e.target.value)}
                          className="bg-gray-700 border-gray-600 pr-16"
                          placeholder="500"
                          min="0.01"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Lakh</span>
                      </div>
                      {teamBudgetLakh && !isNaN(parseFloat(teamBudgetLakh)) && (
                        <p className="text-xs text-gray-400 mt-1">= ₹{lakhToAmount(teamBudgetLakh).toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </div>
                  <DialogFooter className='gap-2'>
                    <Button variant="outline" onClick={() => setShowAddTeamDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddTeam}>Add Team</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className='max-sm:p-4'>
                  <CardTitle className="text-white">Participating Teams</CardTitle>
                  <CardDescription className="text-gray-400">
                    Teams registered for this tournament
                  </CardDescription>
                </CardHeader>
                <CardContent className='max-sm:px-4 max-sm:pb-4'>
                  {tournament?.participatingTeams && tournament.participatingTeams.length > 0 ? (
                    <div className="space-y-3">
                      {tournament.participatingTeams.map((teamEntry) => (
                        <div key={teamEntry._id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <div>
                            <p className="text-white font-medium">{teamEntry.team?.name || 'Unknown Team'}</p>
                            <p className="text-gray-400 text-sm">
                              <span>Budget: {formatCurrency(teamEntry.budget?.total || 0)} | </span>
                              <span>Used: {formatCurrency(teamEntry.budget?.used || 0)} | </span>
                              <span>Remaining: {formatCurrency(teamEntry.budget?.remaining || 0)}</span>
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveTeam(teamEntry.team?._id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">No Teams Added</h3>
                      <p className="text-gray-500">Add teams to start the tournament</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players" className="space-y-6">
            <div className="flex gap-3 flex-wrap justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Player Management</h2>
              <div className="flex gap-2">
                {availablePlayersToAdd && availablePlayersToAdd.length > 0 && (
                  <Button 
                    onClick={handleAddAllPlayers}
                    disabled={isAddingAllPlayers}
                    variant="outline"
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    {isAddingAllPlayers ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Add All Players ({availablePlayersToAdd.length})
                      </>
                    )}
                  </Button>
                )}
                <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={fetchAvailablePlayersToAdd}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Player
                    </Button>
                  </DialogTrigger>
                <DialogContent className="bg-gray-800 border-gray-700 max-sm:p-4">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add Player to Tournament</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Select a player to add to the tournament pool
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-400">Select Player</Label>
                      <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue placeholder={
                            availablePlayersToAdd && availablePlayersToAdd.length > 0 
                              ? "Choose a player" 
                              : "No players available"
                          } />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {availablePlayersToAdd && availablePlayersToAdd.length > 0 ? (
                            availablePlayersToAdd.map((player) => (
                              <SelectItem key={player._id} value={player._id}>
                                {player.name} - {player.role}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-players" disabled>
                              No players available to add
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {(!availablePlayersToAdd || availablePlayersToAdd.length === 0) && (
                        <p className="text-sm text-gray-500 mt-1">
                          All players may already be added to this tournament or no players exist in the system.
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-400">Base Price (Lakh)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={playerBasePriceLakh}
                          onChange={(e) => setPlayerBasePriceLakh(e.target.value)}
                          className="bg-gray-700 border-gray-600 pr-16"
                          placeholder="15"
                          min="0.01"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Lakh</span>
                      </div>
                      {playerBasePriceLakh && !isNaN(parseFloat(playerBasePriceLakh)) && (
                        <p className="text-xs text-gray-400 mt-1">= ₹{lakhToAmount(playerBasePriceLakh).toLocaleString('en-IN')}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-400">Category</Label>
                      <Select value={playerCategory} onValueChange={setPlayerCategory}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="marquee">Marquee</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="emerging">Emerging</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className='gap-2'>
                    <Button variant="outline" onClick={() => setShowAddPlayerDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddPlayer}
                      disabled={!availablePlayersToAdd || availablePlayersToAdd.length === 0 || !selectedPlayer || selectedPlayer === 'no-players'}
                    >
                      Add Player
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className='max-sm:p-4'>
                  <CardTitle className="text-white">Player Pool</CardTitle>
                  <CardDescription className="text-gray-400">
                    Players available for auction
                  </CardDescription>
                </CardHeader>
                <CardContent className='max-sm:px-4 max-sm:pb-4'>
                  {tournament?.playerPool?.availablePlayers && tournament.playerPool.availablePlayers.length > 0 ? (
                    <div className="space-y-4">
                      {/* Player Stats Summary */}
                      <div className="grid sm:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-3 bg-blue-900/20 rounded-lg border border-blue-700/50">
                          <p className="text-2xl font-bold text-white">
                            {tournament.playerPool?.availablePlayers?.filter(p => p.category === 'marquee').length || 0}
                          </p>
                          <p className="text-blue-400 text-sm">Marquee</p>
                        </div>
                        <div className="text-center p-3 bg-purple-900/20 rounded-lg border border-purple-700/50">
                          <p className="text-2xl font-bold text-white">
                            {tournament.playerPool?.availablePlayers?.filter(p => p.category === 'premium').length || 0}
                          </p>
                          <p className="text-purple-400 text-sm">Premium</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-900/20 rounded-lg border border-yellow-700/50">
                          <p className="text-2xl font-bold text-white">
                            {tournament.playerPool?.availablePlayers?.filter(p => p.category === 'standard').length || 0}
                          </p>
                          <p className="text-yellow-400 text-sm">Standard</p>
                        </div>
                        <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-700/50">
                          <p className="text-2xl font-bold text-white">
                            {tournament.playerPool?.availablePlayers?.filter(p => p.category === 'emerging').length || 0}
                          </p>
                          <p className="text-green-400 text-sm">Emerging</p>
                        </div>
                      </div>

                      {/* Player List */}
                      <div className="space-y-3">
                        {tournament.playerPool?.availablePlayers?.map((playerEntry) => {
                          const player = playerEntry.player;
                          return (
                            <div key={playerEntry._id} className="flex flex-col sm:flex-row items-center justify-between p-3 bg-gray-700 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={player?.image} />
                                  <AvatarFallback>{player?.name ? player.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'P'}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-white font-medium">{player?.name || 'Unknown Player'}</p>
                                  <p className="text-gray-400 text-sm">
                                    {player?.role || 'Unknown Role'} | Base Price: {formatCurrency(playerEntry.basePrice || player?.basePrice || 0)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getCategoryColor(playerEntry.category)}>
                                  {playerEntry.category}
                                </Badge>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemovePlayer(player?._id)}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">No Players Added</h3>
                      <p className="text-gray-500">Add players to create the auction pool</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Auctions Tab */}
          <TabsContent value="auctions" className="space-y-6">
            <div className="flex gap-3 flex-wrap justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Auction Management</h2>
              <Button onClick={() => router.push(`/moderator/auctions?tournament=${tournamentId}`)} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Auction
              </Button>
            </div>

            {/* <div className="grid gap-6"> */}
              {/* Live Auctions */}
              {/* <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Play className="w-5 h-5 text-red-500" />
                    Live Auctions
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Currently active auctions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tournament?.auctions?.filter(auction => auction.status === 'live').length ? (
                    <div className="space-y-4">
                      {tournament.auctions?.filter(auction => auction.status === 'live').map((auction) => (
                        <div key={auction._id} className="p-4 rounded-xl bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-700/50">
                                                      <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-white">{auction.name}</h4>
                                <p className="text-sm text-gray-400">Started: {new Date(auction.startTime || '').toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
                                <Button size="sm" onClick={() => router.push(`/moderator/auctions/${auction._id}`)} className="bg-green-600 hover:bg-green-700">
                                  <Eye className="w-4 h-4 mr-1" />
                                  Monitor
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-400">Current Player</p>
                                <p className="text-white font-medium">{auction.currentPlayer?.name || 'None'}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Current Bid</p>
                                <p className="text-green-400 font-bold">{formatCurrency(auction.currentBid || 0)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Teams</p>
                                <p className="text-white">{auction.participants?.length || 0} participating</p>
                              </div>
                            </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Play className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">No Live Auctions</h3>
                      <p className="text-gray-500">Create an auction to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card> */}

              {/* Scheduled Auctions */}
              {/* <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-500" />
                    Scheduled Auctions
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Upcoming auction sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tournament?.auctions?.filter(auction => auction.status === 'scheduled').length ? (
                    <div className="space-y-4">
                      {tournament.auctions?.filter(auction => auction.status === 'scheduled').map((auction) => (
                        <div key={auction._id} className="p-4 rounded-xl bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/50">
                          <div className="flex items-center justify-between mb-3">
                                                          <div>
                                <h4 className="font-medium text-white">{auction.name}</h4>
                                <p className="text-sm text-gray-400">Scheduled: {new Date(auction.scheduledStartTime || '').toLocaleString()}</p>
                              </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-500 text-white">SCHEDULED</Badge>
                              <Button size="sm" onClick={() => router.push(`/moderator/auctions/${auction._id}`)} className="bg-green-600 hover:bg-green-700">
                                <Settings className="w-4 h-4 mr-1" />
                                Configure
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Players in Pool</p>
                              <p className="text-white font-medium">{auction.playerPool?.length || 0}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Teams Registered</p>
                              <p className="text-white">{auction.participants?.length || 0}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Total Budget</p>
                              <p className="text-green-400">{formatCurrency(auction.totalBudget || 0)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">No Scheduled Auctions</h3>
                      <p className="text-gray-500">Schedule auctions for this tournament</p>
                    </div>
                  )}
                </CardContent>
              </Card> */}

              {/* Completed Auctions */}
              {/* <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Completed Auctions
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Auction history and results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tournament?.auctions?.filter(auction => auction.status === 'completed').length ? (
                    <div className="space-y-4">
                      {tournament.auctions?.filter(auction => auction.status === 'completed').map((auction) => (
                        <div key={auction._id} className="p-4 rounded-xl bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/50">
                          <div className="flex items-center justify-between mb-3">
                                                          <div>
                                <h4 className="font-medium text-white">{auction.name}</h4>
                                <p className="text-sm text-gray-400">Completed: {new Date(auction.endTime || '').toLocaleString()}</p>
                              </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-500 text-white">COMPLETED</Badge>
                              <Button size="sm" onClick={() => router.push(`/moderator/auctions/${auction._id}`)} className="bg-green-600 hover:bg-green-700">
                                <Download className="w-4 h-4 mr-1" />
                                Results
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Players Sold</p>
                              <p className="text-white font-medium">{auction.soldPlayers?.length || 0}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Total Spent</p>
                              <p className="text-green-400">{formatCurrency(auction.totalAmountSpent || 0)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Avg Price</p>
                              <p className="text-white">{formatCurrency(auction.averagePlayerPrice || 0)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Duration</p>
                              <p className="text-white">{auction.duration || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">No Completed Auctions</h3>
                      <p className="text-gray-500">Completed auctions will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card> */}
            {/* </div> */}
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Financial Overview</h2>
            
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Revenue & Costs */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    Revenue & Costs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-900/20 rounded-lg border border-green-700/50">
                      <p className="text-green-400 text-sm">Entry Fee per Team</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(tournament.entryFee || 0)}</p>
                    </div>
                    <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
                      <p className="text-blue-400 text-sm">Total Revenue</p>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency((tournament.entryFee || 0) * (tournament.participatingTeams?.length || 0))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Registration Fees</span>
                      <span className="text-white font-medium">
                        {formatCurrency((tournament.entryFee || 0) * (tournament.participatingTeams?.length || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Sponsorship</span>
                      <span className="text-white font-medium">{formatCurrency(0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Broadcasting Rights</span>
                      <span className="text-white font-medium">{formatCurrency(0)}</span>
                    </div>
                    <hr className="border-gray-600" />
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-white">Total Revenue</span>
                      <span className="text-green-400">
                        {formatCurrency((tournament.entryFee || 0) * (tournament.participatingTeams?.length || 0))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prize Distribution */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Prize Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-700/50">
                    <p className="text-yellow-400 text-sm">Total Prize Pool</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(tournament.prizePool || 0)}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gold-900/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <span className="text-gray-300">Winner</span>
                      </div>
                      <span className="text-white font-medium">
                        {formatCurrency(tournament.prizes?.winner || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">Runner-up</span>
                      </div>
                      <span className="text-white font-medium">
                        {formatCurrency(tournament.prizes?.runnerUp || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-900/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-orange-500" />
                        <span className="text-gray-300">Third Place</span>
                      </div>
                      <span className="text-white font-medium">
                        {formatCurrency(tournament.prizes?.thirdPlace || 0)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Prize Pool Utilization</span>
                      <span className="text-white font-medium">
                        {((((tournament.prizes?.winner || 0) + (tournament.prizes?.runnerUp || 0) + (tournament.prizes?.thirdPlace || 0)) / (tournament.prizePool || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={((tournament.prizes?.winner || 0) + (tournament.prizes?.runnerUp || 0) + (tournament.prizes?.thirdPlace || 0)) / (tournament.prizePool || 1) * 100} 
                      className="mt-2 h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Budgets */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                                  <CardTitle className="text-white flex items-center gap-2">
                    <Building className="w-5 h-5 text-green-500" />
                    Team Budget Analysis
                  </CardTitle>
                <CardDescription className="text-gray-400">
                  Budget allocation and spending across teams
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tournament?.participatingTeams && tournament.participatingTeams.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-400 pb-2 border-b border-gray-600">
                      <span>Team</span>
                      <span>Total Budget</span>
                      <span>Used</span>
                      <span>Remaining</span>
                    </div>
                    {tournament.participatingTeams.map((teamEntry, index) => (
                      <div key={teamEntry._id} className="grid grid-cols-4 gap-4 items-center p-3 bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                            T{index + 1}
                          </div>
                          <span className="text-white">Team {index + 1}</span>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(teamEntry.budget?.total || 0)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-red-400">{formatCurrency(teamEntry.budget?.used || 0)}</span>
                          <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                              style={{ width: `${((teamEntry.budget?.used || 0) / (teamEntry.budget?.total || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-green-400 font-medium">{formatCurrency(teamEntry.budget?.remaining || 0)}</span>
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t border-gray-600">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-gray-400 text-sm">Total Budget Allocated</p>
                          <p className="text-xl font-bold text-white">
                            {formatCurrency(tournament.participatingTeams.reduce((sum, team) => sum + (team.budget?.total || 0), 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Total Spent</p>
                          <p className="text-xl font-bold text-red-400">
                            {formatCurrency(tournament.participatingTeams.reduce((sum, team) => sum + (team.budget?.used || 0), 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Total Remaining</p>
                          <p className="text-xl font-bold text-green-400">
                            {formatCurrency(tournament.participatingTeams.reduce((sum, team) => sum + (team.budget?.remaining || 0), 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No Teams Added</h3>
                    <p className="text-gray-500">Add teams to see budget analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Tournament Settings</h2>
            
            <div className="grid gap-6">
              {/* Basic Settings */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-green-500" />
                    Basic Configuration
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Core tournament settings and rules
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-400">Tournament Status</Label>
                      <Select value={tournament.status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="registration_open">Registration Open</SelectItem>
                          <SelectItem value="registration_closed">Registration Closed</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400">Visibility</Label>
                      <Select 
                        value={tournament.isPublic ? 'public' : 'private'} 
                        onValueChange={(value) => {
                          const updatedData = { ...formData, isPublic: value === 'public' };
                          setFormData(updatedData);
                          handleUpdateTournament();
                        }}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-400">Max Teams</Label>
                      <Input
                        type="number"
                        value={tournament.maxTeams}
                        onChange={(e) => {
                          const updatedData = { ...formData, maxTeams: parseInt(e.target.value) || 0 };
                          setFormData(updatedData);
                        }}
                        className="bg-gray-700 border-gray-600"
                        min="2"
                        max="32"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400">Entry Fee (₹)</Label>
                      <Input
                        type="number"
                        value={tournament.entryFee}
                        onChange={(e) => {
                          const updatedData = { ...formData, entryFee: parseInt(e.target.value) || 0 };
                          setFormData(updatedData);
                        }}
                        className="bg-gray-700 border-gray-600"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400">Prize Pool (₹)</Label>
                      <Input
                        type="number"
                        value={tournament.prizePool}
                        onChange={(e) => {
                          const updatedData = { ...formData, prizePool: parseInt(e.target.value) || 0 };
                          setFormData(updatedData);
                        }}
                        className="bg-gray-700 border-gray-600"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-600">
                    <Button onClick={handleUpdateTournament} className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Auction Rules */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-green-500" />
                    Auction Rules
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Configure auction-specific rules and constraints
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-700/50">
                      <h4 className="text-white font-medium mb-2">Bidding Rules</h4>
                      <ul className="text-sm text-gray-400 space-y-1">
                        <li>• Minimum bid increment: ₹50,000</li>
                        <li>• Maximum bid time: 60 seconds</li>
                        <li>• Auto-pass after 3 consecutive passes</li>
                        <li>• RTM (Right to Match) allowed</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
                      <h4 className="text-white font-medium mb-2">Team Constraints</h4>
                      <ul className="text-sm text-gray-400 space-y-1">
                        <li>• Maximum squad size: 25 players</li>
                        <li>• Minimum squad size: 18 players</li>
                        <li>• Maximum overseas players: 8</li>
                        <li>• Budget per team: ₹100 Crores</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-900/20 rounded-lg border border-green-700/50">
                    <h4 className="text-white font-medium mb-2">Player Categories</h4>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-green-400 font-medium">Marquee</p>
                        <p className="text-gray-400">₹15Cr+ base price</p>
                      </div>
                      <div>
                        <p className="text-blue-400 font-medium">Premium</p>
                        <p className="text-gray-400">₹5-15Cr base price</p>
                      </div>
                      <div>
                        <p className="text-yellow-400 font-medium">Standard</p>
                        <p className="text-gray-400">₹1-5Cr base price</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Emerging</p>
                        <p className="text-gray-400">₹20L-1Cr base price</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Settings */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-orange-500" />
                    Advanced Options
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Advanced tournament management options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col gap-2"
                      onClick={() => toast.info('Export functionality coming soon')}
                    >
                      <Download className="w-6 h-6" />
                      <span>Export Data</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col gap-2"
                      onClick={() => toast.info('Import functionality coming soon')}
                    >
                      <Upload className="w-6 h-6" />
                      <span>Import Players</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col gap-2"
                      onClick={() => fetchTournamentDetails()}
                    >
                      <RefreshCw className="w-6 h-6" />
                      <span>Refresh Data</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col gap-2 border-red-600 text-red-400 hover:bg-red-900/20"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-6 h-6" />
                      <span>Delete Tournament</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tournament Analytics */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-500" />
                    Analytics Overview
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Tournament performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-white">{tournament.participatingTeams?.length || 0}</p>
                      <p className="text-gray-400 text-sm">Teams Registered</p>
                      <div className="mt-2">
                        <Progress value={((tournament.participatingTeams?.length || 0) / tournament.maxTeams) * 100} className="h-2" />
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-white">{tournament.playerPool?.availablePlayers?.length || 0}</p>
                      <p className="text-gray-400 text-sm">Players in Pool</p>
                      <div className="mt-2">
                        <Progress value={75} className="h-2" />
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-white">{tournament.auctions?.length || 0}</p>
                      <p className="text-gray-400 text-sm">Auctions Created</p>
                      <div className="mt-2">
                        <Progress value={60} className="h-2" />
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">
                        {getRegistrationStatus() === 'Open' ? 'OPEN' : 
                         getRegistrationStatus() === 'Closed' ? 'CLOSED' : 'PENDING'}
                      </p>
                      <p className="text-gray-400 text-sm">Registration</p>
                      <div className="mt-2">
                        <Progress 
                          value={getRegistrationStatus() === 'Open' ? 100 : 
                                 getRegistrationStatus() === 'Closed' ? 50 : 0} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
} 