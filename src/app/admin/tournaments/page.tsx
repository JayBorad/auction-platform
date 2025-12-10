'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Plus, Search, Edit, Trash2, Trophy, Calendar, Users, DollarSign, MapPin, Phone, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { useTournaments, Tournament, CreateTournamentData } from '@/hooks/useTournaments';
import { useAuctions } from '@/hooks/useAuctions';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDateUTC } from '@/lib/format';

export default function TournamentsPage() {
  const router = useRouter();
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

  // Removed unused auction hooks - tournament deletion API handles auction deletion

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; tournament: Tournament | null }>({
    isOpen: false,
    tournament: null
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [currentStep, setCurrentStep] = useState('basic');
  const [editCurrentStep, setEditCurrentStep] = useState('basic');
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

  const [editFormData, setEditFormData] = useState<CreateTournamentData>({
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

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Validation state
  const [validationErrors, setValidationErrors] = useState({
    contactEmail: '',
    contactPhone: '',
    entryFee: '',
    prizePool: ''
  });

  const [editValidationErrors, setEditValidationErrors] = useState({
    contactEmail: '',
    contactPhone: '',
    entryFee: '',
    prizePool: ''
  });

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) || email === '' ? '' : 'Please enter a valid email address';
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, '')) || phone === '' ? '' : 'Please enter a valid phone number';
  };

  const validateEntryFee = (fee: number) => {
    return fee > 0 ? '' : 'Entry fee must be greater than 0';
  };

  const validatePrizePool = (pool: number) => {
    return pool > 0 ? '' : 'Prize pool must be greater than 0';
  };

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
      console.log('error', error)
    }
  };

  const handleUpdateTournament = async () => {
    if (!editingTournament) return;
    
    try {
      await updateTournament(editingTournament._id, editFormData);
      setEditingTournament(null);
      resetEditForm();
    } catch (error) {
      console.log('error', error)
    }
  };

  const handleDeleteTournament = async (id: string) => {
    const tournament = tournaments.find(t => t._id === id);
    if (tournament) {
      setDeleteConfirmation({ isOpen: true, tournament });
    }
  };

  const confirmDeleteTournament = async () => {
    if (deleteConfirmation.tournament) {
      try {
        // The tournament deletion API will automatically handle deleting all related auctions
        // No need to manually delete auctions first
        await deleteTournament(deleteConfirmation.tournament._id);
        setDeleteConfirmation({ isOpen: false, tournament: null });
      } catch (error) {
        console.log('error', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete tournament');
      }
    }
  };

  const cancelDeleteTournament = () => {
    setDeleteConfirmation({ isOpen: false, tournament: null });
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateTournamentStatus(id, status);
    } catch (error) {
      console.log('error', error)
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
    setCurrentStep('basic');
    setValidationErrors({
      contactEmail: '',
      contactPhone: '',
      entryFee: '',
      prizePool: ''
    });
  };

  const resetEditForm = () => {
    setEditFormData({
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
    setEditCurrentStep('basic');
    setEditValidationErrors({
      contactEmail: '',
      contactPhone: '',
      entryFee: '',
      prizePool: ''
    });
  };

  const openEditDialog = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setEditFormData({
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
    setEditCurrentStep('basic');
    setEditValidationErrors({
      contactEmail: '',
      contactPhone: '',
      entryFee: '',
      prizePool: ''
    });
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

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 'basic':
        return formData.name && formData.description && formData.format && formData.venue && formData.city;
      case 'dates':
        return formData.startDate && formData.endDate && formData.registrationStartDate && 
            formData.registrationEndDate && formData.maxTeams > 0 && formData.entryFee > 0 && 
            formData.prizePool > 0 && !validationErrors.entryFee && !validationErrors.prizePool;
      case 'details':
      return formData.organizer && formData.contactEmail && formData.contactPhone && 
              !validationErrors.contactEmail && !validationErrors.contactPhone;
    default:
      return false;
  }
};

  const validateEditCurrentStep = () => {
    switch (editCurrentStep) {
      case 'basic':
        return editFormData.name && editFormData.description && editFormData.format && editFormData.venue && editFormData.city;
      case 'dates':
        return editFormData.startDate && editFormData.endDate && editFormData.registrationStartDate && 
            editFormData.registrationEndDate && editFormData.maxTeams > 0 && editFormData.entryFee > 0 && 
            editFormData.prizePool > 0 && !editValidationErrors.entryFee && !editValidationErrors.prizePool;
      case 'details':
      return editFormData.organizer && editFormData.contactEmail && editFormData.contactPhone && 
              !editValidationErrors.contactEmail && !editValidationErrors.contactPhone;
    default:
      return false;
  }
};

  const handleNextStep = () => {
    if (currentStep === 'basic') {
      setCurrentStep('dates');
    } else if (currentStep === 'dates') {
      setCurrentStep('details');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'details') {
      setCurrentStep('dates');
    } else if (currentStep === 'dates') {
      setCurrentStep('basic');
    }
  };

  const handleEditNextStep = () => {
    if (editCurrentStep === 'basic') {
      setEditCurrentStep('dates');
    } else if (editCurrentStep === 'dates') {
      setEditCurrentStep('details');
    }
  };

  const handleEditPreviousStep = () => {
    if (editCurrentStep === 'details') {
      setEditCurrentStep('dates');
    } else if (editCurrentStep === 'dates') {
      setEditCurrentStep('basic');
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'basic': return 'Basic Information';
      case 'dates': return 'Dates & Teams';
      case 'details': return 'Details & Contact';
      default: return 'Tournament Setup';
    }
  };

  const getEditStepTitle = () => {
    switch (editCurrentStep) {
      case 'basic': return 'Basic Information';
      case 'dates': return 'Dates & Teams';
      case 'details': return 'Details & Contact';
      default: return 'Tournament Setup';
    }
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
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Tournament
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto max-sm:p-4">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Tournament</DialogTitle>
              <DialogDescription className="text-gray-400">
                Step {currentStep === 'basic' ? '1' : currentStep === 'dates' ? '2' : '3'} of 3: {getStepTitle()}
              </DialogDescription>
            </DialogHeader>

            {/* Step Progress Indicator */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'basic' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                }`}>
                  1
                </div>
                <div className={`w-16 h-1 ${currentStep === 'basic' ? 'bg-gray-600' : 'bg-green-600'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'basic' ? 'bg-gray-600 text-gray-400' : 
                  currentStep === 'dates' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                }`}>
                  2
                </div>
                <div className={`w-16 h-1 ${currentStep === 'details' ? 'bg-green-600' : 'bg-gray-600'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-400'
                }`}>
                  3
                </div>
              </div>
            </div>
            
            <div className="grid gap-4 py-4">
              {/* Step Content */}
              {currentStep === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white">Tournament Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="Enter tournament name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="format" className="text-white">Format *</Label>
                      <Select value={formData.format} onValueChange={(value) => setFormData({...formData, format: value})}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder="Select format" />
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
                    <Label htmlFor="description" className="text-white">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Tournament description"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="venue" className="text-white">Venue *</Label>
                      <Input
                        id="venue"
                        value={formData.venue}
                        onChange={(e) => setFormData({...formData, venue: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="Stadium name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-white">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="City name"
                      />
                    </div>
                  </div>
                </div>
              )}
                
              {currentStep === 'dates' && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="registrationStartDate" className="text-white">Registration Start *</Label>
                      <Input
                        id="registrationStartDate"
                        type="date"
                        value={formData.registrationStartDate}
                        onChange={(e) => setFormData({...formData, registrationStartDate: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registrationEndDate" className="text-white">Registration End *</Label>
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
                      <Label htmlFor="startDate" className="text-white">Tournament Start *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="text-white">Tournament End *</Label>
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
                      <Label htmlFor="maxTeams" className="text-white">Max Teams *</Label>
                      <Input
                        id="maxTeams"
                        type="number"
                        value={formData.maxTeams}
                        onChange={(e) => setFormData({...formData, maxTeams: parseInt(e.target.value) || 0})}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="16"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="entryFee" className="text-white">Entry Fee *</Label>
                      <Input
                        id="entryFee"
                        type="number"
                        value={formData.entryFee}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setFormData({...formData, entryFee: value});
                          setValidationErrors(prev => ({ ...prev, entryFee: validateEntryFee(value) }));
                        }}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="5000"
                        min="1"
                      />
                      {validationErrors.entryFee && (
                        <p className="text-sm text-red-400">{validationErrors.entryFee}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prizePool" className="text-white">Prize Pool *</Label>
                      <Input
                        id="prizePool"
                        type="number"
                        value={formData.prizePool}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setFormData({...formData, prizePool: value});
                          setValidationErrors(prev => ({ ...prev, prizePool: validatePrizePool(value) }));
                        }}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="100000"
                        min="1"
                      />
                      {validationErrors.prizePool && (
                        <p className="text-sm text-red-400">{validationErrors.prizePool}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {currentStep === 'details' && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="organizer" className="text-white">Organizer *</Label>
                      <Input
                        id="organizer"
                        value={formData.organizer}
                        onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="Organization name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail" className="text-white">Contact Email *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({...formData, contactEmail: value});
                          setValidationErrors(prev => ({ ...prev, contactEmail: validateEmail(value) }));
                        }}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="contact@tournament.com"
                      />
                      {validationErrors.contactEmail && (
                        <p className="text-sm text-red-400">{validationErrors.contactEmail}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="text-white">Contact Phone *</Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({...formData, contactPhone: value});
                        setValidationErrors(prev => ({ ...prev, contactPhone: validatePhone(value) }));
                      }}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="+91-9876543210"
                    />
                    {validationErrors.contactPhone && (
                      <p className="text-sm text-red-400">{validationErrors.contactPhone}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rules" className="text-white">Rules & Regulations</Label>
                    <Textarea
                      id="rules"
                      value={formData.rules}
                      onChange={(e) => setFormData({...formData, rules: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Tournament rules and regulations"
                    />
                  </div>
                  
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="winner-prize" className="text-white">Winner Prize</Label>
                      <Input
                        id="winner-prize"
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
                      <Label htmlFor="runner-up-prize" className="text-white">Runner-up Prize</Label>
                      <Input
                        id="runner-up-prize"
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
                      <Label htmlFor="third-place-prize" className="text-white">Third Place Prize</Label>
                      <Input
                        id="third-place-prize"
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
                </div>
              )}
            </div>
            
            <DialogFooter className="flex justify-between gap-2">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="border-gray-600 text-gray-300">
                  Cancel
                </Button>
                {currentStep !== 'basic' && (
                  <Button variant="outline" onClick={handlePreviousStep} className="border-gray-600 text-gray-300">
                    Previous
                  </Button>
                )}
              </div>
              
              <div>
                {currentStep !== 'details' ? (
                  <Button 
                    onClick={handleNextStep} 
                    disabled={!validateCurrentStep()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    onClick={handleCreateTournament} 
                    disabled={!validateCurrentStep()}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Tournament
                  </Button>
                )}
              </div>
            </DialogFooter>
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
          <Card key={tournament._id} className="bg-gray-800 border-gray-700">
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
                <div className="flex items-center text-gray-300">
                  <MapPin className="w-4 h-4 mr-2" />
                  {tournament.venue}
                </div>
                <div className="flex items-center text-gray-300">
                  <Mail className="w-4 h-4 mr-2" />
                  {tournament.contactEmail}
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                <p><strong>City:</strong> {tournament.city}, {tournament.country}</p>
                <p><strong>Organizer:</strong> {tournament.organizer}</p>
                <p><strong>Entry Fee:</strong> {formatCurrency(tournament.entryFee ?? 0)}</p>
              </div>
              
              <div className="space-y-2">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Status</Label>
                  <Select 
                    value={tournament.status} 
                    onValueChange={(value) => handleStatusChange(tournament._id, value)}
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
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/admin/tournaments/${tournament._id}`)}
                    className="flex-1 border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                  >
                    <Trophy className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(tournament)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTournament(tournament._id)}
                    className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
      <Dialog open={!!editingTournament} onOpenChange={() => {
        setEditingTournament(null);
        resetEditForm();
      }}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto max-sm:p-4">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Tournament</DialogTitle>
            <DialogDescription className="text-gray-400">
              Step {editCurrentStep === 'basic' ? '1' : editCurrentStep === 'dates' ? '2' : '3'} of 3: {getEditStepTitle()}
            </DialogDescription>
          </DialogHeader>

          {/* Step Progress Indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                editCurrentStep === 'basic' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${editCurrentStep === 'basic' ? 'bg-gray-600' : 'bg-green-600'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                editCurrentStep === 'basic' ? 'bg-gray-600 text-gray-400' : 
                editCurrentStep === 'dates' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 ${editCurrentStep === 'details' ? 'bg-green-600' : 'bg-gray-600'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                editCurrentStep === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-400'
              }`}>
                3
              </div>
            </div>
          </div>
          
          <div className="grid gap-4 py-4">
            {/* Edit Step Content */}
            {editCurrentStep === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-white">Tournament Name *</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Enter tournament name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-format" className="text-white">Format *</Label>
                    <Select value={editFormData.format} onValueChange={(value) => setEditFormData({...editFormData, format: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Select format" />
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
                  <Label htmlFor="edit-description" className="text-white">Description *</Label>
                  <Textarea
                    id="edit-description"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Tournament description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-venue" className="text-white">Venue *</Label>
                    <Input
                      id="edit-venue"
                      value={editFormData.venue}
                      onChange={(e) => setEditFormData({...editFormData, venue: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Stadium name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-city" className="text-white">City *</Label>
                    <Input
                      id="edit-city"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({...editFormData, city: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="City name"
                    />
                  </div>
                </div>
              </div>
            )}
              
            {editCurrentStep === 'dates' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-registrationStartDate" className="text-white">Registration Start *</Label>
                    <Input
                      id="edit-registrationStartDate"
                      type="date"
                      value={editFormData.registrationStartDate}
                      onChange={(e) => setEditFormData({...editFormData, registrationStartDate: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-registrationEndDate" className="text-white">Registration End *</Label>
                    <Input
                      id="edit-registrationEndDate"
                      type="date"
                      value={editFormData.registrationEndDate}
                      onChange={(e) => setEditFormData({...editFormData, registrationEndDate: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-startDate" className="text-white">Tournament Start *</Label>
                    <Input
                      id="edit-startDate"
                      type="date"
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({...editFormData, startDate: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-endDate" className="text-white">Tournament End *</Label>
                    <Input
                      id="edit-endDate"
                      type="date"
                      value={editFormData.endDate}
                      onChange={(e) => setEditFormData({...editFormData, endDate: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
                
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-maxTeams" className="text-white">Max Teams *</Label>
                    <Input
                      id="edit-maxTeams"
                      type="number"
                      value={editFormData.maxTeams}
                      onChange={(e) => setEditFormData({...editFormData, maxTeams: parseInt(e.target.value) || 0})}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="16"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-entryFee" className="text-white">Entry Fee *</Label>
                    <Input
                      id="edit-entryFee"
                      type="number"
                      value={editFormData.entryFee}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setEditFormData({...editFormData, entryFee: value});
                        setEditValidationErrors(prev => ({ ...prev, entryFee: validateEntryFee(value) }));
                      }}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="5000"
                      min="1"
                    />
                    {editValidationErrors.entryFee && (
                      <p className="text-sm text-red-400">{editValidationErrors.entryFee}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-prizePool" className="text-white">Prize Pool *</Label>
                    <Input
                      id="edit-prizePool"
                      type="number"
                      value={editFormData.prizePool}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setEditFormData({...editFormData, prizePool: value});
                        setEditValidationErrors(prev => ({ ...prev, prizePool: validatePrizePool(value) }));
                      }}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="100000"
                      min="1"
                    />
                    {editValidationErrors.prizePool && (
                      <p className="text-sm text-red-400">{editValidationErrors.prizePool}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {editCurrentStep === 'details' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-organizer" className="text-white">Organizer *</Label>
                    <Input
                      id="edit-organizer"
                      value={editFormData.organizer}
                      onChange={(e) => setEditFormData({...editFormData, organizer: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Organization name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-contactEmail" className="text-white">Contact Email *</Label>
                    <Input
                      id="edit-contactEmail"
                      type="email"
                      value={editFormData.contactEmail}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditFormData({...editFormData, contactEmail: value});
                        setEditValidationErrors(prev => ({ ...prev, contactEmail: validateEmail(value) }));
                      }}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="contact@tournament.com"
                    />
                    {editValidationErrors.contactEmail && (
                      <p className="text-sm text-red-400">{editValidationErrors.contactEmail}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-contactPhone" className="text-white">Contact Phone *</Label>
                  <Input
                    id="edit-contactPhone"
                    value={editFormData.contactPhone}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditFormData({...editFormData, contactPhone: value});
                      setEditValidationErrors(prev => ({ ...prev, contactPhone: validatePhone(value) }));
                    }}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="+91-9876543210"
                  />
                  {editValidationErrors.contactPhone && (
                    <p className="text-sm text-red-400">{editValidationErrors.contactPhone}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-rules" className="text-white">Rules & Regulations</Label>
                  <Textarea
                    id="edit-rules"
                    value={editFormData.rules}
                    onChange={(e) => setEditFormData({...editFormData, rules: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Tournament rules and regulations"
                  />
                </div>
                
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-winner-prize" className="text-white">Winner Prize</Label>
                    <Input
                      id="edit-winner-prize"
                      type="number"
                      value={editFormData.prizes?.winner || 0}
                      onChange={(e) => setEditFormData({
                        ...editFormData, 
                        prizes: {
                          winner: parseInt(e.target.value) || 0,
                          runnerUp: editFormData.prizes?.runnerUp || 0,
                          thirdPlace: editFormData.prizes?.thirdPlace || 0
                        }
                      })}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-runner-up-prize" className="text-white">Runner-up Prize</Label>
                    <Input
                      id="edit-runner-up-prize"
                      type="number"
                      value={editFormData.prizes?.runnerUp || 0}
                      onChange={(e) => setEditFormData({
                        ...editFormData, 
                        prizes: {
                          winner: editFormData.prizes?.winner || 0,
                          runnerUp: parseInt(e.target.value) || 0,
                          thirdPlace: editFormData.prizes?.thirdPlace || 0
                        }
                      })}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-third-place-prize" className="text-white">Third Place Prize</Label>
                    <Input
                      id="edit-third-place-prize"
                      type="number"
                      value={editFormData.prizes?.thirdPlace || 0}
                      onChange={(e) => setEditFormData({
                        ...editFormData, 
                        prizes: {
                          winner: editFormData.prizes?.winner || 0,
                          runnerUp: editFormData.prizes?.runnerUp || 0,
                          thirdPlace: parseInt(e.target.value) || 0
                        }
                      })}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setEditingTournament(null);
                resetEditForm();
              }} className="border-gray-600 text-gray-300">
                Cancel
              </Button>
              {editCurrentStep !== 'basic' && (
                <Button variant="outline" onClick={handleEditPreviousStep} className="border-gray-600 text-gray-300">
                  Previous
                </Button>
              )}
            </div>
            
            <div>
              {editCurrentStep !== 'details' ? (
                <Button 
                  onClick={handleEditNextStep} 
                  disabled={!validateEditCurrentStep()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleUpdateTournament} 
                  disabled={!validateEditCurrentStep()}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Tournament
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => !open && setDeleteConfirmation({ isOpen: false, tournament: null })}
      >
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete <strong className="text-white">{deleteConfirmation.tournament?.name}</strong>?
              This action cannot be undone and will permanently remove the tournament and all associated data.
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
                    This will permanently delete the tournament "{deleteConfirmation.tournament?.name}" and cannot be reversed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={cancelDeleteTournament}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTournament}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Tournament
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}