'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Trophy, Target, Phone, Mail, MapPin, Calendar, Edit, Plus, Trash2, Loader2, Globe } from 'lucide-react';
import { useTeams, Team } from '@/hooks/useTeams';
import { useTournaments, Tournament } from '@/hooks/useTournaments';
import { toast } from 'sonner';
import { formatDateTimeUTC } from '@/lib/format';

interface TeamDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function TeamDetailsPage({ params }: TeamDetailsPageProps) {
  const router = useRouter();
  const { fetchTeam, updateTeamStatus, addPlayer, removePlayer, updateTeamStats, joinTournament, leaveTournament } = useTeams();
  const { tournaments, fetchTournaments } = useTournaments();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false);
  const [isRemovePlayerDialogOpen, setIsRemovePlayerDialogOpen] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<string | null>(null);
  const [isJoinTournamentDialogOpen, setIsJoinTournamentDialogOpen] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [joiningTournament, setJoiningTournament] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    age: 18,
    role: 'batsman' as const,
    battingStyle: 'right-hand' as const,
    bowlingStyle: 'none' as const,
    jerseyNumber: 1,
    contactNumber: '',
    email: '',
    teamRole: 'player' as 'player' | 'captain' | 'vice-captain'
  });
  const resolvedParams = use(params);

  // Handler for leaving tournament
  const handleLeaveTournament = async (tournamentId: string) => {
    if (!team) return;

    try {
      await leaveTournament(team._id, tournamentId);
      toast.success('Successfully left the tournament');
      
      // Refresh team data to show updated tournament list
      const updatedTeam = await fetchTeam(resolvedParams.id);
      setTeam(updatedTeam);
    } catch (error) {
      console.error('Error leaving tournament:', error);
      toast.error('Failed to leave tournament');
    }
  };

  // Load available tournaments for joining
  const loadAvailableTournaments = async () => {
    try {
      await fetchTournaments({ status: 'registration_open' }); // Only show tournaments accepting registrations
      // Tournaments will be available in the 'tournaments' state from useTournaments hook
    } catch (error) {
      console.error('Error loading tournaments:', error);
      toast.error('Failed to load available tournaments');
    }
  };

  // Filter tournaments that are accepting registrations
  const availableTournaments = tournaments.filter(t => t.status === 'registration_open');

  const handleJoinTournament = async () => {
    if (!team || !selectedTournamentId) {
      toast.error('Please select a tournament to join');
      return;
    }

    setJoiningTournament(true);
    try {
      const result = await joinTournament(team._id, selectedTournamentId);

      if (result) {
        const updatedTeam = await fetchTeam(resolvedParams.id);
        setTeam(updatedTeam);

        setIsJoinTournamentDialogOpen(false);
        setSelectedTournamentId('');
      } 
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to join tournament');
    } finally {
      setJoiningTournament(false);
    }
  };

  const openJoinTournamentDialog = () => {
    loadAvailableTournaments();
    setIsJoinTournamentDialogOpen(true);
  };

  const handleAddPlayer = async () => {
    if (!team || !newPlayer.name || !newPlayer.age) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check for existing captain/vice captain
    if (newPlayer.teamRole === 'captain' && team.captain) {
      toast.error('A captain is already assigned to this team. Please remove the current captain first.');
      return;
    }
    if (newPlayer.teamRole === 'vice-captain' && team.viceCaptain) {
      toast.error('A vice captain is already assigned to this team. Please remove the current vice captain first.');
      return;
    }

    try {
      await addPlayer(team._id, {
        name: newPlayer.name,
        age: newPlayer.age,
        role: newPlayer.role,
        battingStyle: newPlayer.battingStyle,
        bowlingStyle: newPlayer.bowlingStyle,
        jerseyNumber: newPlayer.jerseyNumber,
        contactNumber: newPlayer.contactNumber,
        email: newPlayer.email
      });

      // If team role is captain or vice-captain, update the team
      if (newPlayer.teamRole === 'captain' || newPlayer.teamRole === 'vice-captain') {
        // This would need to be handled by a separate API call to update team captain/vice-captain
        // For now, we'll just show a message
        toast.info(`${newPlayer.teamRole === 'captain' ? 'Captain' : 'Vice Captain'} role will be assigned after the player is added.`);
      }

      // Refresh team data
      const updatedTeam = await fetchTeam(resolvedParams.id);
      setTeam(updatedTeam);

      // Reset form and close dialog
      setNewPlayer({
        name: '',
        age: 18,
        role: 'batsman',
        battingStyle: 'right-hand',
        bowlingStyle: 'none',
        jerseyNumber: 1,
        contactNumber: '',
        email: '',
        teamRole: 'player'
      });
      setIsAddPlayerDialogOpen(false);
    } catch (error) {
      console.error('Error adding player:', error);
    }
  };

  const handleRemovePlayer = async (playerName: string) => {
    if (!team) return;

    try {
      await removePlayer(team._id, playerName);
      
      // Refresh team data
      const updatedTeam = await fetchTeam(resolvedParams.id);
      setTeam(updatedTeam);
      
      setIsRemovePlayerDialogOpen(false);
      setPlayerToRemove(null);
      
      toast.success('Player removed successfully');
    } catch (error) {
      console.error('Error removing player:', error);
      toast.error('Failed to remove player');
    }
  };

  const openRemoveDialog = (playerName: string) => {
    setPlayerToRemove(playerName);
    setIsRemovePlayerDialogOpen(true);
  };

  useEffect(() => {
    const loadTeam = async () => {
      const teamData = await fetchTeam(resolvedParams.id);
      setTeam(teamData);
      setLoading(false);
    };
    loadTeam();
  }, [resolvedParams.id, fetchTeam]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-white">Loading team details...</span>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-400 mb-4">Team Not Found</h1>
            <Button onClick={() => router.push('/admin/teams')} className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap gap-2 items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/teams')}
              className="border-gray-600 text-gray-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{team.name}</h1>
              <p className="text-gray-400">{team.shortName} • {team.city}, {team.country}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-auto">
            <Badge className={`${team.isActive ? 'bg-green-500' : 'bg-red-500'} text-white`}>
              {team.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button 
              variant="outline" 
              className="border-gray-600 text-gray-300"
              onClick={() => router.push(`/moderator/teams?edit=${team._id}`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Team
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{team.playerCount || 0}</p>
                  <p className="text-sm text-gray-400">Players</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Trophy className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{team.points}</p>
                  <p className="text-sm text-gray-400">Points</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{team.matchesWon}</p>
                  <p className="text-sm text-gray-400">Matches Won</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-8 w-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{team.winPercentage || '0.00'}%</p>
                  <p className="text-sm text-gray-400">Win Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-gray-700 data-[state=active]:text-white max-sm:text-xs">Overview</TabsTrigger>
            <TabsTrigger value="players" className="text-white data-[state=active]:bg-gray-700 data-[state=active]:text-white max-sm:text-xs">Players</TabsTrigger>
            <TabsTrigger value="tournaments" className="text-white data-[state=active]:bg-gray-700 data-[state=active]:text-white max-sm:text-xs">Tournaments</TabsTrigger>
            <TabsTrigger value="statistics" className="text-white data-[state=active]:bg-gray-700 data-[state=active]:text-white max-sm:text-xs">Statistics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Information */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Team Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Captain</p>
                      <p className="text-white font-medium">
                        {typeof team.captain === 'object' ? team.captain.name : team.captain}
                      </p>
                    </div>
                    {team.viceCaptain && (
                      <div>
                        <p className="text-sm text-gray-400">Vice Captain</p>
                        <p className="text-white font-medium">
                          {typeof team.viceCaptain === 'object' ? team.viceCaptain.name : team.viceCaptain}
                        </p>
                      </div>
                    )}
                    {team.coach && (
                      <div>
                        <p className="text-sm text-gray-400">Coach</p>
                        <p className="text-white font-medium">{team.coach}</p>
                      </div>
                    )}
                    {team.manager && (
                      <div>
                        <p className="text-sm text-gray-400">Manager</p>
                        <p className="text-white font-medium">{team.manager}</p>
                      </div>
                    )}
                  </div>
                  
                  {team.homeGround && (
                    <div>
                      <p className="text-sm text-gray-400">Home Ground</p>
                      <p className="text-white font-medium">
                        {typeof team.homeGround === 'string' 
                          ? team.homeGround 
                          : `${team.homeGround.name}, ${team.homeGround.city}`}
                        {typeof team.homeGround === 'object' && team.homeGround.capacity && (
                          <span className="text-gray-400 text-sm ml-2">
                            (Capacity: {team.homeGround.capacity.toLocaleString()})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  
                  {team.foundedYear && (
                    <div>
                      <p className="text-sm text-gray-400">Founded</p>
                      <p className="text-white font-medium">{team.foundedYear}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{team.contactEmail}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{team.contactPhone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{team.city}, {team.state && `${team.state}, `}{team.country}</span>
                  </div>
                  {team.website && (
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a href={team.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        {team.website}
                      </a>
                    </div>
                  )}
                  {team.socialMedia && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">Social Media</p>
                      <div className="space-y-1">
                        {team.socialMedia.facebook && (
                          <a href={team.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline block">
                            Facebook
                          </a>
                        )}
                        {team.socialMedia.twitter && (
                          <a href={team.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline block">
                            Twitter
                          </a>
                        )}
                        {team.socialMedia.instagram && (
                          <a href={team.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline block">
                            Instagram
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            {team.description && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{team.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Achievements */}
            {team.achievements && team.achievements.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {team.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <Trophy className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-white font-medium">{achievement.title}</p>
                          {achievement.description && (
                            <p className="text-gray-400 text-sm">{achievement.description}</p>
                          )}
                          {achievement.year && (
                            <p className="text-gray-500 text-sm">{achievement.year}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Team Squad</h2>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsAddPlayerDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </div>

            {team.players && team.players.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {team.players.filter(p => p.isActive).map((player, index) => (
                  <Card key={index} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-white">{player.name}</h3>
                          <p className="text-sm text-gray-400">{player.age} years old</p>
                        </div>
                        {player.jerseyNumber && (
                          <Badge variant="outline" className="border-gray-600 text-gray-300">
                            #{player.jerseyNumber}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Badge className={`${
                          player.role === 'batsman' ? 'bg-blue-500' :
                          player.role === 'bowler' ? 'bg-red-500' :
                          player.role === 'all-rounder' ? 'bg-green-500' :
                          'bg-purple-500'
                        } text-white`}>
                          {player.role}
                        </Badge>
                        
                        {(typeof team.captain === 'object' ? team.captain.name : team.captain) === player.name && (
                          <Badge className="bg-yellow-600 text-white">Captain</Badge>
                        )}
                        
                        {(typeof team.viceCaptain === 'object' ? team.viceCaptain?.name : team.viceCaptain) === player.name && (
                          <Badge className="bg-orange-600 text-white">Vice Captain</Badge>
                        )}
                      </div>

                      <div className="flex justify-end mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRemoveDialog(player.name)}
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No players added</h3>
                <p className="text-gray-500">Add players to build your team squad.</p>
              </div>
            )}
          </TabsContent>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Tournament Registrations</h2>
              {/* <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={openJoinTournamentDialog}
              >
                <Plus className="h-4 w-4 mr-2" />
                Join Tournament
              </Button> */}
            </div>

            {team.tournaments && team.tournaments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {team.tournaments.map((tournament) => (
                  <Card key={tournament._id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white text-lg">{tournament.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${
                                tournament.status === 'active' ? 'bg-green-500' :
                                tournament.status === 'registration_open' ? 'bg-blue-500' :
                                tournament.status === 'completed' ? 'bg-gray-500' :
                                'bg-red-500'
                              } text-white text-xs`}>
                                {tournament.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                                {tournament.format}
                              </Badge>
                            </div>
                          </div>
                          {/* <Button
                            variant="outline"
                            size="sm"
                            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                            onClick={() => handleLeaveTournament(tournament._id)}
                          >
                            Leave
                          </Button> */}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center text-gray-400">
                            <span className="font-medium">Venue:</span>
                            <span className="ml-2 text-white">{typeof tournament.venue === 'object' ? ((tournament.venue as any)?.name || 'TBD') : (tournament.venue || 'TBD')}</span>
                          </div>
                          <div className="flex items-center text-gray-400">
                            <span className="font-medium">Duration:</span>
                            <span className="ml-2 text-white">
                              {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : 'TBD'} -
                              {tournament.endDate ? new Date(tournament.endDate).toLocaleDateString() : 'TBD'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No tournament registrations</h3>
                <p className="text-gray-500">Register for tournaments to start competing.</p>
              </div>
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Performance Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Total Matches</p>
                      <p className="text-2xl font-bold text-white">{team.stats?.totalMatches || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Matches Won</p>
                      <p className="text-2xl font-bold text-white">{team.stats?.matchesWon || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Matches Lost</p>
                      <p className="text-2xl font-bold text-white">{team.stats?.matchesLost || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Matches Drawn</p>
                      <p className="text-2xl font-bold text-white">{team.stats?.matchesDrawn || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Tournament Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Tournaments Played</p>
                      <p className="text-2xl font-bold text-white">{team.stats?.tournamentsPlayed || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Tournaments Won</p>
                      <p className="text-2xl font-bold text-white">{team.stats?.tournamentsWon || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Win Rate</p>
                      <p className="text-2xl font-bold text-white">{team.stats?.winRate || '0.00'}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total Points</p>
                      <p className="text-2xl font-bold text-white">{team.stats?.totalPoints || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Player Dialog */}
        <Dialog open={isAddPlayerDialogOpen} onOpenChange={setIsAddPlayerDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-sm:p-4">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Player</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add a new player to the team squad.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="playerName" className="text-white">Player Name *</Label>
                <Input
                  id="playerName"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter player name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="playerAge" className="text-white">Age *</Label>
                <Input
                  id="playerAge"
                  type="number"
                  value={newPlayer.age}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, age: parseInt(e.target.value) || 18 }))}
                  className="bg-gray-800 border-gray-600 text-white"
                  min="16"
                  max="50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="playerRole" className="text-white">Role *</Label>
                <Select value={newPlayer.role} onValueChange={(value: any) => setNewPlayer(prev => ({ ...prev, role: value }))}>
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
                <Label htmlFor="battingStyle" className="text-white">Batting Style</Label>
                <Select value={newPlayer.battingStyle} onValueChange={(value: any) => setNewPlayer(prev => ({ ...prev, battingStyle: value }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="right-hand">Right-hand</SelectItem>
                    <SelectItem value="left-hand">Left-hand</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jerseyNumber" className="text-white">Jersey Number</Label>
                <Input
                  id="jerseyNumber"
                  type="number"
                  value={newPlayer.jerseyNumber}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, jerseyNumber: parseInt(e.target.value) || 1 }))}
                  className="bg-gray-800 border-gray-600 text-white"
                  min="1"
                  max="99"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber" className="text-white">Contact Number</Label>
                <Input
                  id="contactNumber"
                  value={newPlayer.contactNumber}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, contactNumber: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter contact number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newPlayer.email}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="teamRole" className="text-white">Team Role</Label>
                <Select value={newPlayer.teamRole} onValueChange={(value: any) => setNewPlayer(prev => ({ ...prev, teamRole: value }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="captain">Captain</SelectItem>
                    <SelectItem value="vice-captain">Vice Captain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className='gap-2'>
              <Button variant="outline" onClick={() => setIsAddPlayerDialogOpen(false)} className="border-gray-600 text-gray-300">
                Cancel
              </Button>
              <Button onClick={handleAddPlayer} className="bg-blue-600 hover:bg-blue-700">
                Add Player
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Player Confirmation Dialog */}
        <Dialog open={isRemovePlayerDialogOpen} onOpenChange={setIsRemovePlayerDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Remove Player</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to remove <span className="font-semibold text-white">{playerToRemove}</span> from the team? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRemovePlayerDialogOpen(false)} className="border-gray-600 text-gray-300">
                Cancel
              </Button>
              <Button onClick={() => playerToRemove && handleRemovePlayer(playerToRemove)} className="bg-red-600 hover:bg-red-700">
                Remove Player
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>

          {/* Join Tournament Dialog */}
          <Dialog open={isJoinTournamentDialogOpen} onOpenChange={setIsJoinTournamentDialogOpen}>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Join Tournament</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Select a tournament to register {team?.name} for participation.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tournamentSelect" className="text-white">Available Tournaments</Label>
                    <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Select a tournament to join" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {availableTournaments.map((tournament) => (
                          <SelectItem key={tournament._id} value={tournament._id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{tournament.name}</span>
                              <span className="text-sm text-gray-400">
                              {tournament.format} • {typeof tournament.venue === 'object' ? ((tournament.venue as any)?.name || 'TBD') : (tournament.venue || `${tournament.city}, ${tournament.country}`)} • {new Date(tournament.startDate).toLocaleDateString()}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {availableTournaments.length === 0 && (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-400 mb-2">No tournaments available</h3>
                      <p className="text-gray-500">There are no upcoming tournaments available to join at the moment.</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsJoinTournamentDialogOpen(false)}
                  className="border-gray-600 text-gray-300"
                  disabled={joiningTournament}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleJoinTournament}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!selectedTournamentId || joiningTournament}
                >
                  {joiningTournament ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Join Tournament
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
}