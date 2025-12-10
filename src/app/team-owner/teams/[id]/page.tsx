'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Users, 
  Trophy, 
  Target, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Loader2,
  Edit,
  Globe,
  Building,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { useTeams, Team } from '@/hooks/useTeams';

const getRoleColor = (role: string) => {
  switch (role.toLowerCase()) {
    case 'batsman':
      return 'bg-blue-500';
    case 'bowler':
      return 'bg-red-500';
    case 'all-rounder':
      return 'bg-purple-500';
    case 'wicket-keeper':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

export default function TeamOwnerTeamDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;
  
  const { fetchTeam, updateTeam } = useTeams();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch team details
  useEffect(() => {
    const fetchTeamDetails = async () => {
      if (!teamId) return;
      
      setLoading(true);
      try {
        const data = await fetchTeam(teamId);
        if (data) {
          setTeam(data);
        }
      } catch (err) {
        setError('Failed to fetch team details');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamDetails();
  }, [teamId, fetchTeam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span>Loading team details...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-400 mb-4">Team Not Found</h1>
            <Button onClick={() => router.push('/team-owner/teams')} className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/team-owner/teams')}
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
          
          <div className="flex items-center space-x-2">
            <Badge className={`${team.isActive ? 'bg-green-500' : 'bg-red-500'} text-white`}>
              {team.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button variant="outline" className="border-gray-600 text-gray-300">
              <Edit className="h-4 w-4 mr-2" />
              Edit Team
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
            <TabsTrigger value="overview" className="text-white">Overview</TabsTrigger>
            <TabsTrigger value="players" className="text-white">Players</TabsTrigger>
            <TabsTrigger value="tournaments" className="text-white">Tournaments</TabsTrigger>
            <TabsTrigger value="statistics" className="text-white">Statistics</TabsTrigger>
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
                      <p className="text-white font-medium">{team.captain}</p>
                    </div>
                    {team.viceCaptain && (
                      <div>
                        <p className="text-sm text-gray-400">Vice Captain</p>
                        <p className="text-white font-medium">{team.viceCaptain}</p>
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
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Team Squad</CardTitle>
              </CardHeader>
              <CardContent>
                {team.players && team.players.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {team.players.map((player) => (
                      <div key={player._id} className="p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {player.avatar ? (
                            <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-white font-medium">{player.name}</h3>
                            <Badge className={`${getRoleColor(player.role)} text-white text-xs`}>
                              {player.role}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No players added to the team yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Tournaments</CardTitle>
              </CardHeader>
              <CardContent>
                {team.tournaments && team.tournaments.length > 0 ? (
                  <div className="space-y-4">
                    {team.tournaments.map((tournament) => (
                      <div key={tournament._id} className="p-4 bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-white font-medium">{tournament.name}</h3>
                            <p className="text-sm text-gray-400">{tournament.startDate} - {tournament.endDate}</p>
                          </div>
                          <Badge className={tournament.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                            {tournament.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No tournaments participated in yet.
                  </div>
                )}
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
} 