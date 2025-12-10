'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Users, 
  MapPin, 
  Mail, 
  Phone,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Star,
  Plus,
  Edit,
  Trash2,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTeams, Team, TeamFilters, CreateTeamData, Player } from '@/hooks/useTeams';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar';

interface ExtendedTeam extends Team {
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  management: {
    coach: {
      name: string;
      role: string;
      experience: number;
    };
  };
  stats: {
    totalMatches: number;
    matchesWon: number;
    matchesLost: number;
    matchesDrawn: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
    winRate: string;
    totalPoints: number;
    totalAuctionSpent?: number;
  };
  isVerified: boolean;
}

export default function ModeratorTeamsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    teams,
    loading,
    error,
    pagination,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    updateTeamStatus
  } = useTeams();

  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; team: Team | null }>({
    isOpen: false,
    team: null
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [currentStep, setCurrentStep] = useState('basic');
  const [formData, setFormData] = useState<CreateTeamData>({
    name: '',
    shortName: '',
    description: '',
    captain: {
      name: '',
      age: 25,
      role: 'batsman',
      battingStyle: 'right-hand',
      bowlingStyle: 'none',
      jerseyNumber: 1,
      contactNumber: '',
      email: '',
      isActive: true
    },
    viceCaptain: {
      name: '',
      age: 25,
      role: 'batsman',
      battingStyle: 'right-hand',
      bowlingStyle: 'none',
      jerseyNumber: 2,
      contactNumber: '',
      email: '',
      isActive: true
    },
    coach: '',
    manager: '',
    homeGround: '',
    city: '',
    state: '',
    country: 'India',
    foundedYear: new Date().getFullYear(),
    contactEmail: '',
    contactPhone: '',
    website: '',
    socialMedia: {
      facebook: '',
      twitter: '',
      instagram: ''
    },
    players: [],
    isActive: true
  });
  const [currentPlayer, setCurrentPlayer] = useState<Player>({
    name: '',
    age: 18,
    role: 'batsman',
    battingStyle: 'right-hand',
    bowlingStyle: 'none',
    jerseyNumber: 1,
    contactNumber: '',
    email: '',
    isActive: true
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedCityFilter = useDebounce(cityFilter, 500);

  // Validation state
  const [validationErrors, setValidationErrors] = useState({
    contactEmail: '',
    contactPhone: ''
  });

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) || email === '' ? '' : 'Please enter a valid email address';
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, '')) || phone === '' ? '' : 'Phone number must be exactly 10 digits';
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    }
  };

  // Fetch teams when filters change
  useEffect(() => {
    fetchTeams({
      search: debouncedSearchTerm,
      city: debouncedCityFilter,
      status: statusFilter as any,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      page: currentPage,
      limit: 10
    });
  }, [debouncedSearchTerm, debouncedCityFilter, statusFilter, sortBy, sortOrder, currentPage, fetchTeams]);

  // Initial fetch when component mounts
  useEffect(() => {
    fetchTeams({
      page: currentPage,
      limit: 10
    });
  }, []); // Empty dependency array - runs once on mount

  // Reset to first page if current page becomes invalid after operations
  useEffect(() => {
    if (pagination.totalPages > 0 && currentPage > pagination.totalPages) {
      setCurrentPage(1);
    }
  }, [pagination.totalPages, currentPage]);

  // Reset pagination when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, debouncedCityFilter, statusFilter, sortBy, sortOrder]);

  const handleCreateTeam = async () => {
    try {
      await createTeam(formData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;
    
    try {
      // Create a copy of formData to modify before sending
      const updatedFormData = { ...formData };
      
      // Ensure captain and vice captain data in players array matches the captain/vice captain objects
      if (updatedFormData.players && Array.isArray(updatedFormData.players)) {
        // Update captain in players array
        if (typeof updatedFormData.captain === 'object') {
          const captainName = updatedFormData.captain.name;
          const captainIndex = updatedFormData.players.findIndex(p => p.name === captainName);
          if (captainIndex !== -1) {
            updatedFormData.players[captainIndex] = { ...updatedFormData.captain };
          }
        }
        
        // Update vice captain in players array
        if (typeof updatedFormData.viceCaptain === 'object' && updatedFormData.viceCaptain.name) {
          const viceCaptainName = updatedFormData.viceCaptain.name;
          const viceCaptainIndex = updatedFormData.players.findIndex(p => p.name === viceCaptainName);
          if (viceCaptainIndex !== -1) {
            updatedFormData.players[viceCaptainIndex] = { ...updatedFormData.viceCaptain };
          }
        }
      }
      
      await updateTeam(editingTeam._id, updatedFormData);
      
      // After updating, refetch teams with current filters to maintain pagination state
      fetchTeams({
        search: debouncedSearchTerm,
        city: debouncedCityFilter,
        status: statusFilter as any,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        page: currentPage,
        limit: 10
      });
      
      setEditingTeam(null);
      resetForm();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteTeam = async (id: string) => {
    const team = teams.find(t => t._id === id);
    if (team) {
      setDeleteConfirmation({ isOpen: true, team });
    }
  };

  const confirmDeleteTeam = async () => {
    if (deleteConfirmation.team) {
      try {
        await deleteTeam(deleteConfirmation.team._id);
        setDeleteConfirmation({ isOpen: false, team: null });
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };

  const cancelDeleteTeam = () => {
    setDeleteConfirmation({ isOpen: false, team: null });
  };

  const handleStatusChange = async (id: string, isActive: boolean) => {
    try {
      await updateTeamStatus(id, isActive);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      shortName: '',
      description: '',
      captain: {
        name: '',
        age: 25,
        role: 'batsman',
        battingStyle: 'right-hand',
        bowlingStyle: 'none',
        jerseyNumber: 1,
        contactNumber: '',
        email: '',
        isActive: true
      },
      viceCaptain: {
        name: '',
        age: 25,
        role: 'batsman',
        battingStyle: 'right-hand',
        bowlingStyle: 'none',
        jerseyNumber: 2,
        contactNumber: '',
        email: '',
        isActive: true
      },
      coach: '',
      manager: '',
      homeGround: '',
      city: '',
      state: '',
      country: 'India',
      foundedYear: new Date().getFullYear(),
      contactEmail: '',
      contactPhone: '',
      website: '',
      socialMedia: {
        facebook: '',
        twitter: '',
        instagram: ''
      },
      players: [],
      isActive: true
    });
    setCurrentPlayer({
      name: '',
      age: 18,
      role: 'batsman',
      battingStyle: 'right-hand',
      bowlingStyle: 'none',
      jerseyNumber: 1,
      contactNumber: '',
      email: '',
      isActive: true
    });
    setCurrentStep('basic');
  };

  const openEditDialog = useCallback((team: Team) => {
    setEditingTeam(team);
    // Reset validation errors when opening edit dialog
    setValidationErrors({
      contactEmail: '',
      contactPhone: ''
    });

    // Helper function to find player data by name
    const findPlayerByName = (name: string): Player | null => {
      if (!team.players || !Array.isArray(team.players)) return null;
      return team.players.find(player => player.name === name && player.isActive) || null;
    };

    // Handle captain - it might be a string or an object from the database
    let captainValue: Player | string = '';
    if (team.captain) {
      if (typeof team.captain === 'object') {
        // Already a Player object from database
        captainValue = team.captain as Player;
      } else if (typeof team.captain === 'string') {
        // String from database, find the actual player data
        const captainPlayer = findPlayerByName(team.captain);
        if (captainPlayer) {
          // Use the actual player data from the team's players array
          captainValue = captainPlayer;
        } else {
          // Player not found in players array, create with default values
          captainValue = {
            name: team.captain,
            age: 25,
            role: 'batsman',
            battingStyle: 'right-hand',
            bowlingStyle: 'none',
            jerseyNumber: 1,
            contactNumber: '',
            email: '',
            isActive: true
          };
        }
      }
    }

    // Handle vice captain - it might be a string or an object from the database
    let viceCaptainValue: Player | string = '';
    if (team.viceCaptain) {
      if (typeof team.viceCaptain === 'object') {
        // Already a Player object from database
        viceCaptainValue = team.viceCaptain as Player;
      } else if (typeof team.viceCaptain === 'string') {
        // String from database, find the actual player data
        const viceCaptainPlayer = findPlayerByName(team.viceCaptain);
        if (viceCaptainPlayer) {
          // Use the actual player data from the team's players array
          viceCaptainValue = viceCaptainPlayer;
        } else {
          // Player not found in players array, create with default values
          viceCaptainValue = {
            name: team.viceCaptain,
            age: 25,
            role: 'batsman',
            battingStyle: 'right-hand',
            bowlingStyle: 'none',
            jerseyNumber: 2,
            contactNumber: '',
            email: '',
            isActive: true
          };
        }
      }
    }

    // Handle home ground - it might be a string or an object from the database
    let homeGroundValue: any = '';
    if (team.homeGround) {
      if (typeof team.homeGround === 'object') {
        // Already an object from database
        homeGroundValue = team.homeGround;
      } else if (typeof team.homeGround === 'string') {
        // String from database, convert to object format
        homeGroundValue = {
          name: team.homeGround,
          city: '',
          capacity: undefined
        };
      }
    }

    setFormData({
      name: team.name,
      shortName: team.shortName,
      description: team.description || '',
      captain: captainValue,
      viceCaptain: viceCaptainValue,
      coach: team.coach || '',
      manager: team.manager || '',
      homeGround: homeGroundValue,
      city: team.city,
      state: team.state || '',
      country: team.country,
      foundedYear: team.foundedYear,
      contactEmail: team.contactEmail,
      contactPhone: team.contactPhone,
      website: team.website || '',
      socialMedia: team.socialMedia || {
        facebook: '',
        twitter: '',
        instagram: ''
      },
      players: team.players || [],
      isActive: team.isActive
    });
  }, []);

  // Handle edit parameter from URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      setPendingEditId(editId);
      // If teams are already loaded, open edit modal immediately
      if (teams.length > 0 && !loading) {
        const teamToEdit = teams.find(team => team._id === editId);
        if (teamToEdit) {
          openEditDialog(teamToEdit);
          setPendingEditId(null);
          // Clear the edit parameter from URL
          router.replace('/moderator/teams');
        }
      }
    }
  }, [searchParams, teams, loading, openEditDialog, router]);
  
  // Handle opening edit modal when teams are loaded
  useEffect(() => {
    if (pendingEditId && teams.length > 0 && !loading) {
      const teamToEdit = teams.find(team => team._id === pendingEditId);
      if (teamToEdit) {
        openEditDialog(teamToEdit);
        setPendingEditId(null);
        // Clear the edit parameter from URL
        router.replace('/moderator/teams');
      }
    }
  }, [pendingEditId, teams, loading, openEditDialog, router]);

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 'basic':
        return formData.name && formData.shortName && formData.city && formData.country;
      case 'captain':
        const captain = formData.captain as Player;
        return captain?.name && captain?.age && captain?.role && captain?.jerseyNumber;
      case 'contact':
        return formData.contactEmail && formData.contactPhone && !validationErrors.contactEmail && !validationErrors.contactPhone;
      case 'players':
        return true; // Players are optional
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (currentStep === 'basic') {
      setCurrentStep('captain');
    } else if (currentStep === 'captain') {
      setCurrentStep('contact');
    } else if (currentStep === 'contact') {
      setCurrentStep('players');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'players') {
      setCurrentStep('contact');
    } else if (currentStep === 'contact') {
      setCurrentStep('captain');
    } else if (currentStep === 'captain') {
      setCurrentStep('basic');
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'basic': return 'Basic Information';
      case 'captain': return 'Captain & Vice Captain';
      case 'contact': return 'Contact & Details';
      case 'players': return 'Players & Squad';
      default: return 'Team Setup';
    }
  };

  const addPlayer = () => {
    if (!currentPlayer.name || !currentPlayer.age) {
      toast.error('Player name and age are required');
      return;
    }

    // Check for duplicate jersey numbers
    if (currentPlayer.jerseyNumber && formData.players?.some(p => p.jerseyNumber === currentPlayer.jerseyNumber)) {
      toast.error('Jersey number already taken');
      return;
    }

    // Check for duplicate names
    if (formData.players?.some(p => p.name === currentPlayer.name)) {
      toast.error('Player already exists');
      return;
    }

    setFormData(prev => ({
      ...prev,
      players: [...(prev.players || []), { ...currentPlayer }]
    }));

    // Reset current player form
    setCurrentPlayer({
      name: '',
      age: 18,
      role: 'batsman',
      battingStyle: 'right-hand',
      bowlingStyle: 'none',
      jerseyNumber: (formData.players?.length || 0) + 1,
      contactNumber: '',
      email: '',
      isActive: true
    });
  };

  const removePlayer = (index: number) => {
    setFormData(prev => ({
      ...prev,
      players: prev.players?.filter((_, i) => i !== index) || []
    }));
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-500' : 'bg-red-500';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'batsman': return 'bg-blue-500';
      case 'bowler': return 'bg-red-500';
      case 'all-rounder': return 'bg-green-500';
      case 'wicket-keeper': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const handleVerifyTeam = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/verify`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('Failed to verify team');
      }
      const data = await response.json();
      if (data.success) {
        toast.success('Team verified successfully');
        fetchTeams(); // Refresh the teams list
      } else {
        toast.error(data.error || 'Failed to verify team');
      }
    } catch (error) {
      console.error('Error verifying team:', error);
      toast.error('Failed to verify team');
    }
  };

  const handleDeactivateTeam = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/deactivate`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('Failed to deactivate team');
      }
      const data = await response.json();
      if (data.success) {
        toast.success('Team deactivated successfully');
        fetchTeams(); // Refresh the teams list
      } else {
        toast.error(data.error || 'Failed to deactivate team');
      }
    } catch (error) {
      console.error('Error deactivating team:', error);
      toast.error('Failed to deactivate team');
    }
  };

  if (loading && (!teams || teams.length === 0)) {
    return (
      <div className="space-y-8">
        <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-32"></div>
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
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div 
        className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md"
        variants={itemVariants}
      >
        <div className="flex flex-col md:flex-row gap-2 justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 text-transparent bg-clip-text">
              Teams Management
            </h1>
            <p className="text-gray-400 mt-2">Manage cricket teams, players, and registrations</p>
          </div>
          
          <Dialog open={isCreateDialogOpen || editingTeam !== null} onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingTeam(null);
              setCurrentStep('basic');
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  resetForm();
                  setEditingTeam(null);
                  setValidationErrors({
                    contactEmail: '',
                    contactPhone: ''
                  });
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingTeam ? 'Edit Team' : 'Create New Team'}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Step {currentStep === 'basic' ? '1' : currentStep === 'captain' ? '2' : currentStep === 'contact' ? '3' : '4'} of 4: {getStepTitle()}
                </DialogDescription>
              </DialogHeader>

              {/* Step Progress Indicator */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === 'basic' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                  }`}>
                    1
                  </div>
                  <div className={`w-8 sm:w-16 h-1 ${currentStep === 'basic' ? 'bg-gray-600' : 'bg-green-600'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === 'basic' ? 'bg-gray-600 text-gray-400' : 
                    currentStep === 'captain' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                  }`}>
                    2
                  </div>
                  <div className={`w-8 sm:w-16 h-1 ${currentStep === 'captain' || currentStep === 'basic' ? 'bg-gray-600' : 'bg-green-600'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    (currentStep === 'basic' || currentStep === 'captain') ? 'bg-gray-600 text-gray-400' : 
                    currentStep === 'contact' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                  }`}>
                    3
                  </div>
                  <div className={`w-8 sm:w-16 h-1 ${currentStep === 'players' ? 'bg-green-600' : 'bg-gray-600'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === 'players' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-400'
                  }`}>
                    4
                  </div>
                </div>
              </div>

              <div className="grid gap-4 py-4">
                {/* Step 1: Basic Information */}
                {currentStep === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-white">Team Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Mumbai Indians"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shortName" className="text-white">Short Name *</Label>
                        <Input
                          id="shortName"
                          value={formData.shortName}
                          onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value.toUpperCase() }))}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="MI"
                          maxLength={10}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-white">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="Brief description of the team..."
                        rows={3}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="coach" className="text-white">Coach</Label>
                        <Input
                          id="coach"
                          value={formData.coach}
                          onChange={(e) => setFormData(prev => ({ ...prev, coach: e.target.value }))}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Mahela Jayawardene"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manager" className="text-white">Manager</Label>
                        <Input
                          id="manager"
                          value={formData.manager}
                          onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Team Manager"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-white">City *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Mumbai"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-white">State</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Maharashtra"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-white">Country *</Label>
                        <Input
                          id="country"
                          value={formData.country}
                          onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="India"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="homeGround" className="text-white">Home Ground</Label>
                        <div className="space-y-2">
                          <Input
                            id="homeGroundName"
                            value={typeof formData.homeGround === 'object' ? formData.homeGround.name : (typeof formData.homeGround === 'string' ? formData.homeGround : '')}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              homeGround: typeof prev.homeGround === 'object'
                                ? { ...prev.homeGround, name: e.target.value }
                                : { name: e.target.value, city: '', capacity: undefined }
                            }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="Wankhede Stadium"
                          />
                          {typeof formData.homeGround === 'object' && (
                            <>
                              <Input
                                id="homeGroundCity"
                                value={formData.homeGround.city}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  homeGround: typeof prev.homeGround === 'object'
                                    ? { ...prev.homeGround, city: e.target.value }
                                    : prev.homeGround
                                }))}
                                className="bg-gray-800 border-gray-600 text-white"
                                placeholder="Stadium City"
                              />
                              <Input
                                id="homeGroundCapacity"
                                type="number"
                                value={typeof formData.homeGround === 'object' && typeof formData.homeGround.capacity === 'number'
                                  ? String(formData.homeGround.capacity)
                                  : ''}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  homeGround: typeof prev.homeGround === 'object'
                                    ? {
                                        ...prev.homeGround,
                                        capacity: e.target.value === ''
                                          ? undefined
                                          : Number.isNaN(Number(e.target.value))
                                            ? undefined
                                            : parseInt(e.target.value)
                                      }
                                    : prev.homeGround
                                }))}
                                className="bg-gray-800 border-gray-600 text-white"
                                placeholder="Stadium Capacity"
                                min="0"
                              />
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="foundedYear" className="text-white">Founded Year</Label>
                        <Input
                          id="foundedYear"
                          type="number"
                          value={formData.foundedYear}
                          onChange={(e) => setFormData(prev => ({ ...prev, foundedYear: parseInt(e.target.value) }))}
                          className="bg-gray-800 border-gray-600 text-white"
                          min="1800"
                          max={new Date().getFullYear()}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Captain & Vice Captain */}
                {currentStep === 'captain' && (
                  <div className="space-y-6">
                    {/* Captain Details */}
                    <div className="border border-gray-600 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Star className="h-5 w-5 mr-2 text-yellow-500" />
                        Captain Details
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label htmlFor="captainName" className="text-white">Captain Name *</Label>
                          <Input
                            id="captainName"
                            value={(formData.captain as Player)?.name || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              captain: typeof prev.captain === 'object'
                                ? { ...prev.captain, name: e.target.value }
                                : { name: e.target.value, age: 25, role: 'batsman', battingStyle: 'right-hand', bowlingStyle: 'none', jerseyNumber: 1, contactNumber: '', email: '', isActive: true }
                            }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="Rohit Sharma"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="captainAge" className="text-white">Age *</Label>
                          <Input
                            id="captainAge"
                            type="number"
                            value={(formData.captain as Player)?.age || 25}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              captain: typeof prev.captain === 'object'
                                ? { ...prev.captain, age: parseInt(e.target.value) }
                                : prev.captain
                            }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            min="16"
                            max="50"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label htmlFor="captainRole" className="text-white">Role *</Label>
                          <Select 
                            value={(formData.captain as Player)?.role || 'batsman'} 
                            onValueChange={(value: any) => setFormData(prev => ({
                              ...prev,
                              captain: typeof prev.captain === 'object'
                                ? { ...prev.captain, role: value }
                                : prev.captain
                            }))}
                          >
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
                          <Label htmlFor="captainBattingStyle" className="text-white">Batting Style</Label>
                          <Select 
                            value={(formData.captain as Player)?.battingStyle || 'right-hand'} 
                            onValueChange={(value: any) => setFormData(prev => ({
                              ...prev,
                              captain: typeof prev.captain === 'object'
                                ? { ...prev.captain, battingStyle: value }
                                : prev.captain
                            }))}
                          >
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
                          <Label htmlFor="captainJerseyNumber" className="text-white">Jersey Number *</Label>
                          <Input
                            id="captainJerseyNumber"
                            type="number"
                            value={(formData.captain as Player)?.jerseyNumber || 1}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              captain: typeof prev.captain === 'object'
                                ? { ...prev.captain, jerseyNumber: parseInt(e.target.value) }
                                : prev.captain
                            }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            min="1"
                            max="99"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vice Captain Details */}
                    <div className="border border-gray-600 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Star className="h-5 w-5 mr-2 text-gray-400" />
                        Vice Captain Details
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label htmlFor="viceCaptainName" className="text-white">Vice Captain Name</Label>
                          <Input
                            id="viceCaptainName"
                            value={(formData.viceCaptain as Player)?.name || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              viceCaptain: typeof prev.viceCaptain === 'object'
                                ? { ...prev.viceCaptain, name: e.target.value }
                                : { name: e.target.value, age: 25, role: 'batsman', battingStyle: 'right-hand', bowlingStyle: 'none', jerseyNumber: 2, contactNumber: '', email: '', isActive: true }
                            }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="Hardik Pandya"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="viceCaptainAge" className="text-white">Age</Label>
                          <Input
                            id="viceCaptainAge"
                            type="number"
                            value={(formData.viceCaptain as Player)?.age || 25}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              viceCaptain: typeof prev.viceCaptain === 'object'
                                ? { ...prev.viceCaptain, age: parseInt(e.target.value) }
                                : prev.viceCaptain
                            }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            min="16"
                            max="50"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label htmlFor="viceCaptainRole" className="text-white">Role</Label>
                          <Select 
                            value={(formData.viceCaptain as Player)?.role || 'batsman'} 
                            onValueChange={(value: any) => setFormData(prev => ({
                              ...prev,
                              viceCaptain: typeof prev.viceCaptain === 'object'
                                ? { ...prev.viceCaptain, role: value }
                                : prev.viceCaptain
                            }))}
                          >
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
                          <Label htmlFor="viceCaptainBattingStyle" className="text-white">Batting Style</Label>
                          <Select 
                            value={(formData.viceCaptain as Player)?.battingStyle || 'right-hand'} 
                            onValueChange={(value: any) => setFormData(prev => ({
                              ...prev,
                              viceCaptain: typeof prev.viceCaptain === 'object'
                                ? { ...prev.viceCaptain, battingStyle: value }
                                : prev.viceCaptain
                            }))}
                          >
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
                          <Label htmlFor="viceCaptainJerseyNumber" className="text-white">Jersey Number</Label>
                          <Input
                            id="viceCaptainJerseyNumber"
                            type="number"
                            value={(formData.viceCaptain as Player)?.jerseyNumber || 2}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              viceCaptain: typeof prev.viceCaptain === 'object'
                                ? { ...prev.viceCaptain, jerseyNumber: parseInt(e.target.value) }
                                : prev.viceCaptain
                            }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            min="1"
                            max="99"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Contact & Details */}
                {currentStep === 'contact' && (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail" className="text-white">Contact Email *</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => ({ ...prev, contactEmail: value }));
                            setValidationErrors(prev => ({ ...prev, contactEmail: validateEmail(value) }));
                          }}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="team@mumbaiindians.com"
                        />
                        {validationErrors.contactEmail && (
                          <p className="text-sm text-red-400">{validationErrors.contactEmail}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone" className="text-white">Contact Phone *</Label>
                        <Input
                          type='number'
                          id="contactPhone"
                          value={formData.contactPhone}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => ({ ...prev, contactPhone: value }));
                            setValidationErrors(prev => ({ ...prev, contactPhone: validatePhone(value) }));
                          }}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="+91 9876543210"
                        />
                        {validationErrors.contactPhone && (
                          <p className="text-sm text-red-400">{validationErrors.contactPhone}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-white">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="https://www.mumbaiindians.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Social Media</Label>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <Input
                          value={formData.socialMedia?.facebook ?? ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            socialMedia: { ...prev.socialMedia, facebook: e.target.value }
                          }))}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Facebook URL"
                        />
                        <Input
                          value={formData.socialMedia?.twitter ?? ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            socialMedia: { ...prev.socialMedia, twitter: e.target.value }
                          }))}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Twitter URL"
                        />
                        <Input
                          value={formData.socialMedia?.instagram ?? ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            socialMedia: { ...prev.socialMedia, instagram: e.target.value }
                          }))}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Instagram URL"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Players */}
                {currentStep === 'players' && (
                  <div className="space-y-4">
                    <div className="border border-gray-600 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-4">Add Player</h3>
                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label htmlFor="playerName" className="text-white">Player Name</Label>
                          <Input
                            id="playerName"
                            value={currentPlayer.name}
                            onChange={(e) => setCurrentPlayer(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="Player Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="playerAge" className="text-white">Age</Label>
                          <Input
                            id="playerAge"
                            type="number"
                            value={currentPlayer.age}
                            onChange={(e) => setCurrentPlayer(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            min="16"
                            max="50"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label htmlFor="playerRole" className="text-white">Role</Label>
                          <Select value={currentPlayer.role} onValueChange={(value: any) => setCurrentPlayer(prev => ({ ...prev, role: value }))}>
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
                          <Select value={currentPlayer.battingStyle} onValueChange={(value: any) => setCurrentPlayer(prev => ({ ...prev, battingStyle: value }))}>
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
                            value={currentPlayer.jerseyNumber}
                            onChange={(e) => setCurrentPlayer(prev => ({ ...prev, jerseyNumber: parseInt(e.target.value) }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            min="1"
                            max="99"
                          />
                        </div>
                      </div>

                      <Button onClick={addPlayer} className="bg-green-600 hover:bg-green-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Player
                      </Button>
                    </div>

                    {/* Players List */}
                    {formData.players && formData.players.length > 0 && (
                      <div className="border border-gray-600 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Team Squad ({formData.players.length} players)</h3>
                        <div className="space-y-2">
                          {formData.players.map((player, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-white font-medium">{player.name}</span>
                                  {(formData.captain as Player)?.name === player.name && (
                                    <Badge className="bg-yellow-600">Captain</Badge>
                                  )}
                                  {(formData.viceCaptain as Player)?.name === player.name && (
                                    <Badge className="bg-gray-600">Vice Captain</Badge>
                                  )}
                                </div>
                                <Badge className={`${getRoleColor(player.role)} text-white`}>
                                  {player.role}
                                </Badge>
                                <span className="text-gray-400">#{player.jerseyNumber}</span>
                                <span className="text-gray-400">{player.age}y</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removePlayer(index)}
                                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="flex justify-between gap-2">
                <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                    resetForm();
                    setEditingTeam(null);
                    setValidationErrors({
                      contactEmail: '',
                      contactPhone: ''
                    });
                    setIsCreateDialogOpen(false);
                  }} className="border-gray-600 text-gray-300">
                    Cancel
                  </Button>
                  {currentStep !== 'basic' && (
                    <Button variant="outline" onClick={handlePreviousStep} className="border-gray-600 text-gray-300">
                      Previous
                    </Button>
                  )}
                </div>
                
                <div>
                  {currentStep !== 'players' ? (
                    <Button 
                      onClick={handleNextStep} 
                      disabled={!validateCurrentStep()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button 
                      onClick={editingTeam ? handleUpdateTeam : handleCreateTeam} 
                      disabled={!validateCurrentStep()}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editingTeam ? 'Update Team' : 'Create Team'}
                    </Button>
                  )}
                </div>
              </DialogFooter>
              </DialogContent>
          </Dialog>
          
          {/* Delete Confirmation Modal */}
          <Dialog 
            open={deleteConfirmation.isOpen} 
            onOpenChange={(open) => !open && setDeleteConfirmation({ isOpen: false, team: null })}
          >
            <DialogContent className="bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Confirm Deletion</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to delete <strong className="text-white">{deleteConfirmation.team?.name}</strong>? 
                  This action cannot be undone and will permanently remove the team and all associated data.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-red-400">Warning: Destructive Action</h3>
                      <p className="text-sm text-red-300">
                        This will permanently delete the team "{deleteConfirmation.team?.name}" and cannot be reversed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={cancelDeleteTeam}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteTeam}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Team
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="max-sm:p-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
          </CardHeader>
          <CardContent className='max-sm:px-4 max-sm:pb-4'>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">{teams.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="max-sm:p-4 pb-2">
            <CardTitle className="text-sm font-medium">Verified Teams</CardTitle>
          </CardHeader>
          <CardContent className='max-sm:px-4 max-sm:pb-4'>
            <div className="flex items-center">
              <Star className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-2xl font-bold">
                {(teams as ExtendedTeam[]).filter(t => t.isVerified).length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="max-sm:p-4 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
          </CardHeader>
          <CardContent className='max-sm:px-4 max-sm:pb-4'>
            <div className="flex items-center">
              <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
              <span className="text-2xl font-bold">
                {teams.filter(t => t.isActive).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <motion.div 
        className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md"
        variants={itemVariants}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white"
            />
          </div>
          
          <Input
            placeholder="Filter by city..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
          />
          
          <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="points">Points</SelectItem>
              <SelectItem value="matches">Matches</SelectItem>
              <SelectItem value="winPercentage">Win %</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div 
          className="bg-red-900/20 border border-red-700 rounded-lg p-4"
          variants={itemVariants}
        >
          <p className="text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Teams Grid */}
      {/* Loading State */}
      {loading ? (
        <motion.div 
          className="flex items-center justify-center h-32"
          variants={itemVariants}
        >
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-400">Loading teams...</span>
        </motion.div>
      ) : teams.length === 0 && !loading ? (
        <motion.div 
          className="text-center py-12"
          variants={itemVariants}
        >
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No teams found</h3>
          <p className="text-gray-500">Create your first team to get started.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {teams.map((team, index) => (
            <motion.div
              key={team._id}
              variants={itemVariants}
              custom={index}
            >
              <Card className="border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-md h-full backdrop-blur-sm overflow-hidden hover:border-gray-600 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={team.logo} />
                        <AvatarFallback>{team.shortName}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-white text-lg">{team.name}</CardTitle>
                        <CardDescription className="text-gray-400">
                          {team.shortName} • {team.city}, {team.country}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className={`${getStatusColor(team.isActive)} text-white`}>
                        {team.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Select
                        value={team.isActive ? 'active' : 'inactive'}
                        onValueChange={(value) => handleStatusChange(team._id, value === 'active')}
                      >
                        <SelectTrigger className="w-20 px-1 h-8 bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Team Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-gray-300">Players</span>
                      </div>
                      <p className="text-lg font-semibold text-white">{team.playerCount || 0}</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                      <div className="flex items-center space-x-2">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-gray-300">Points</span>
                      </div>
                      <p className="text-lg font-semibold text-white">{team.points}</p>
                    </div>
                  </div>

                  {/* Match Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm text-gray-400">Matches</p>
                      <p className="font-semibold text-white">{team.totalMatches}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Won</p>
                      <p className="font-semibold text-green-400">{team.matchesWon}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Win %</p>
                      <p className="font-semibold text-blue-400">{team.winPercentage || '0.00'}%</p>
                    </div>
                  </div>

                  {/* Team Details */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Target className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-300">Captain:</span>
                      <span className="text-white">
                        {typeof team.captain === 'object' ? team.captain.name : team.captain}
                      </span>
                    </div>
                    {team.viceCaptain && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Target className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">Vice Captain:</span>
                        <span className="text-white">
                          {typeof team.viceCaptain === 'object' ? team.viceCaptain.name : team.viceCaptain}
                        </span>
                      </div>
                    )}
                    {team.homeGround && (
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">Home:</span>
                        <span className="text-white">
                          {typeof team.homeGround === 'object'
                            ? `${team.homeGround.name}, ${team.homeGround.city}${team.homeGround.capacity ? ` (${team.homeGround.capacity.toLocaleString()} capacity)` : ''}`
                            : team.homeGround}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{team.contactEmail}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{team.contactPhone}</span>
                    </div>
                  </div>

                  {/* Tournaments */}
                  {team.tournaments && team.tournaments.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Tournaments:</p>
                      <div className="flex flex-wrap gap-1">
                        {team.tournaments.slice(0, 2).map((tournament) => (
                          <Badge key={tournament._id} variant="outline" className="border-gray-600 text-gray-300">
                            {tournament.name}
                          </Badge>
                        ))}
                        {team.tournaments.length > 2 && (
                          <Badge variant="outline" className="border-gray-600 text-gray-300">
                            +{team.tournaments.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between pt-4 border-t border-gray-700/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/moderator/teams/${team._id}`)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      View Details
                    </Button>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(team)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTeam(team._id)}
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <motion.div 
              className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md"
              variants={itemVariants}
            >
              <div className="text-sm text-gray-400">
                Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalCount)} of {pagination.totalCount} teams
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!pagination.hasPrevPage}
                  className="border-gray-600 text-gray-300 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={pageNum === pagination.currentPage 
                          ? "bg-blue-600 hover:bg-blue-700" 
                          : "border-gray-600 text-gray-300"
                        }
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={!pagination.hasNextPage}
                  className="border-gray-600 text-gray-300 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}

    </motion.div>
  );
} 