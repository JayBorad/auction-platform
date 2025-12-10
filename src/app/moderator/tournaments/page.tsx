'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Loader2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useTournaments, Tournament, CreateTournamentData } from '@/hooks/useTournaments';
import { useDebounce } from '@/hooks/useDebounce';
import TournamentCard from '@/components/shared/TournamentCard';
import TournamentForm from '@/components/shared/TournamentForm';

export default function ModeratorTournamentsPage() {
  const {
    tournaments,
    loading,
    error,
    pagination,
    fetchTournaments,
    createTournament,
    updateTournament,
    deleteTournament,
    updateTournamentStatus
  } = useTournaments();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<CreateTournamentData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    registrationStartDate: '',
    registrationEndDate: '',
    maxTeams: 0,
    entryFee: 0,
    prizePool: 0,
    format: '',
    venue: '',
    city: '',
    country: '',
    organizer: '',
    contactEmail: '',
    contactPhone: '',
    rules: '',
    prizes: {
      winner: 0,
      runnerUp: 0,
      thirdPlace: 0
    },
    isPublic: false
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch tournaments when filters change
  useEffect(() => {
    fetchTournaments({
      search: debouncedSearchTerm,
      status: statusFilter,
      page: currentPage,
      limit: 10
    });
  }, [debouncedSearchTerm, statusFilter, currentPage, fetchTournaments]);

  const handleCreateTournament = async () => {
    try {
      await createTournament(formData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleUpdateTournament = async () => {
    if (!editingTournament) return;
    
    try {
      await updateTournament(editingTournament._id, formData);
      setEditingTournament(null);
      resetForm();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tournament?')) {
      try {
        await deleteTournament(id);
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateTournamentStatus(id, status);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      registrationStartDate: '',
      registrationEndDate: '',
      maxTeams: 0,
      entryFee: 0,
      prizePool: 0,
      format: '',
      venue: '',
      city: '',
      country: '',
      organizer: '',
      contactEmail: '',
      contactPhone: '',
      rules: '',
      prizes: {
        winner: 0,
        runnerUp: 0,
        thirdPlace: 0
      },
      isPublic: false
    });
  };

  const openEditDialog = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setFormData({
      name: tournament.name,
      description: tournament.description,
      startDate: tournament.startDate.split('T')[0],
      endDate: tournament.endDate.split('T')[0],
      registrationStartDate: tournament.registrationStartDate.split('T')[0],
      registrationEndDate: tournament.registrationEndDate.split('T')[0],
      maxTeams: tournament.maxTeams,
      entryFee: tournament.entryFee,
      prizePool: tournament.prizePool,
      format: tournament.format,
      venue: tournament.venue,
      city: tournament.city,
      country: tournament.country,
      organizer: tournament.organizer,
      contactEmail: tournament.contactEmail,
      contactPhone: tournament.contactPhone,
      rules: tournament.rules || '',
      prizes: {
        winner: tournament.prizes?.winner || 0,
        runnerUp: tournament.prizes?.runnerUp || 0,
        thirdPlace: tournament.prizes?.thirdPlace || 0
      },
      isPublic: tournament.isPublic
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-800 rounded animate-pulse"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Tournaments</h1>
          <p className="text-gray-400">Manage tournament competitions and events</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (open) {
            resetForm(); // Reset form when dialog opens for new tournament
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Tournament
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Tournament</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add a new tournament to the platform
              </DialogDescription>
            </DialogHeader>

            <TournamentForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleCreateTournament}
              onCancel={() => setIsCreateDialogOpen(false)}
              userRole="moderator"
              loading={loading}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search tournaments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600 text-white"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-600 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-400">Loading tournaments...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Tournament Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.isArray(tournaments) && tournaments.map((tournament) => (
          <TournamentCard
            key={tournament._id}
            tournament={tournament}
            onEdit={openEditDialog}
            onDelete={handleDeleteTournament}
            onStatusChange={handleStatusChange}
            userRole="moderator"
            showActions={true}
          />
        ))}
      </div>

      {Array.isArray(tournaments) && tournaments.length === 0 && !loading && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No tournaments found</h3>
          <p className="text-gray-500">Create your first tournament to get started.</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
            {pagination.totalItems} tournaments
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={!pagination.hasPrevPage}
              className="border-gray-600 text-gray-300"
            >
              Previous
            </Button>
            <span className="flex items-center px-3 py-1 text-sm text-gray-400">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={!pagination.hasNextPage}
              className="border-gray-600 text-gray-300"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTournament} onOpenChange={() => setEditingTournament(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto max-sm:p-2">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Tournament</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update tournament details and settings.
            </DialogDescription>
          </DialogHeader>
          
          <TournamentForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdateTournament}
            onCancel={() => setEditingTournament(null)}
            isEditing={true}
            userRole="moderator"
            loading={loading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 