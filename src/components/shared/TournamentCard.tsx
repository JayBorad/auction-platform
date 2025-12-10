'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Edit, 
  Trash2, 
  Trophy, 
  Calendar, 
  Users, 
  DollarSign, 
  MapPin, 
  Mail 
} from 'lucide-react';
import { Tournament } from '@/hooks/useTournaments';
import { formatDateUTC, formatCurrency } from '@/lib/format';

interface TournamentCardProps {
  tournament: Tournament;
  onEdit?: (tournament: Tournament) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  userRole: 'admin' | 'moderator' | 'team-owner';
  showActions?: boolean;
}

export default function TournamentCard({
  tournament,
  onEdit,
  onDelete,
  onStatusChange,
  userRole,
  showActions = true
}: TournamentCardProps) {
  const router = useRouter();

  // Defensive formatting in case API returns nested objects
  const venueDisplay = typeof (tournament as any).venue === 'string'
    ? (tournament as any).venue
    : (tournament as any).venue?.name ?? '';
  const organizerDisplay = typeof (tournament as any).organizer === 'string'
    ? (tournament as any).organizer
    : (tournament as any).organizer?.name ?? '';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'upcoming': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDetailUrl = () => {
    const basePath = userRole === 'admin' ? '/admin' : userRole === 'moderator' ? '/moderator' : '/team-owner';
    return `${basePath}/tournaments/${tournament._id}`;
  };

  const canEdit = userRole === 'admin' || userRole === 'moderator';
  const canDelete = userRole === 'admin';
  const canChangeStatus = userRole === 'admin' || userRole === 'moderator';

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-white text-lg">{tournament.name}</CardTitle>
            <CardDescription className="text-gray-400 mt-1">
              {tournament.description}
            </CardDescription>
          </div>
          <Badge className={`${getStatusColor(tournament.status)} text-white`}>
            {tournament.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-300">
            <Calendar className="w-4 h-4 mr-2" />
            {formatDateUTC(tournament.startDate)}
          </div>
          <div className="flex items-center text-gray-300">
            <Trophy className="w-4 h-4 mr-2" />
            {tournament.format}
          </div>
          <div className="flex items-center text-gray-300">
            <Users className="w-4 h-4 mr-2" />
            {tournament.registeredTeams}/{tournament.maxTeams}
          </div>
          <div className="flex items-center text-gray-300">
            <DollarSign className="w-4 h-4 mr-2" />
            {formatCurrency(tournament.prizePool ?? 0)}
          </div>
          <div className="max-sm:col-span-2 flex items-center text-gray-300">
            <MapPin className="w-4 h-4 mr-2" />
            {venueDisplay}
          </div>
          <div className="max-sm:col-span-2 flex items-center text-gray-300">
            <Mail className="w-4 h-4 mr-2" />
            {tournament.contactEmail}
          </div>
        </div>
        
        <div className="text-xs text-gray-400">
          <p><strong>City:</strong> {tournament.city}, {tournament.country}</p>
          <p><strong>Organizer:</strong> {organizerDisplay}</p>
          <p><strong>Entry Fee:</strong> {formatCurrency(tournament.entryFee ?? 0)}</p>
        </div>
        
        {showActions && (
          <div className="space-y-2">
            {canChangeStatus && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Status</Label>
                <Select 
                  value={tournament.status} 
                  onValueChange={(value) => onStatusChange?.(tournament._id, value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(getDetailUrl())}
                className="flex-1 border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
              >
                <Trophy className="w-4 h-4 mr-1" />
                View Details
              </Button>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit?.(tournament)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete?.(tournament._id)}
                  className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 