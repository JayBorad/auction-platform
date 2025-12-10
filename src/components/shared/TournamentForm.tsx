'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateTournamentData } from '@/hooks/useTournaments';
import { amountToLakh, lakhToAmount } from '@/lib/format';

interface TournamentFormProps {
  formData: CreateTournamentData;
  setFormData: (data: CreateTournamentData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing?: boolean;
  loading?: boolean;
  userRole?: 'admin' | 'moderator';
}

export default function TournamentForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isEditing = false,
  loading = false,
  userRole = 'admin'
}: TournamentFormProps) {
  const [currentStep, setCurrentStep] = useState('basic');

  // Local state for lakh values (for display in inputs)
  const [entryFeeLakh, setEntryFeeLakh] = useState<string>('');
  const [prizePoolLakh, setPrizePoolLakh] = useState<string>('');

  // Sync lakh values when formData changes
  useEffect(() => {
    if (formData.entryFee) {
      setEntryFeeLakh(amountToLakh(formData.entryFee).toString());
    }
    if (formData.prizePool) {
      setPrizePoolLakh(amountToLakh(formData.prizePool).toString());
    }
  }, [formData.entryFee, formData.prizePool]);

  // Validation state
  const [validationErrors, setValidationErrors] = useState({
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

  // Handle entry fee change (convert from lakh to amount)
  const handleEntryFeeChange = (lakhValue: string) => {
    setEntryFeeLakh(lakhValue);
    const amount = lakhToAmount(lakhValue);
    setFormData({...formData, entryFee: amount});
    setValidationErrors(prev => ({ ...prev, entryFee: validateEntryFee(amount) }));
  };

  // Handle prize pool change (convert from lakh to amount)
  const handlePrizePoolChange = (lakhValue: string) => {
    setPrizePoolLakh(lakhValue);
    const amount = lakhToAmount(lakhValue);
    setFormData({...formData, prizePool: amount});
    setValidationErrors(prev => ({ ...prev, prizePool: validatePrizePool(amount) }));
  };

  const validateCurrentStep = () => {
    if (isEditing) {
      // For edit mode, validate all required fields
      return formData.name && formData.description && formData.format && formData.venue && 
             formData.city && formData.organizer && formData.contactEmail && formData.contactPhone &&
             !validationErrors.contactEmail && !validationErrors.contactPhone;
    }
    
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

  const getStepTitle = () => {
    switch (currentStep) {
      case 'basic': return 'Basic Information';
      case 'dates': return 'Dates & Teams';
      case 'details': return 'Details & Contact';
      default: return 'Tournament Setup';
    }
  };

  const canManagePrizes = userRole === 'admin' || userRole === 'moderator';

  if (isEditing) {
    return (
      <div className="space-y-6">
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
            
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
            
            <div className="grid grid-cols-2 gap-4">
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
            
            <div className="grid grid-cols-3 gap-4">
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
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setFormData({...formData, entryFee: value});
                    setValidationErrors(prev => ({ ...prev, entryFee: validateEntryFee(value) }));
                  }}
                  className="bg-gray-800 border-gray-600 text-white"
                  min="1"
                />
                {validationErrors.entryFee && (
                  <p className="text-sm text-red-400">{validationErrors.entryFee}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="prizePool" className="text-white">Prize Pool</Label>
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
                  min="1"
                />
                {validationErrors.prizePool && (
                  <p className="text-sm text-red-400">{validationErrors.prizePool}</p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({...formData, contactEmail: value});
                    setValidationErrors(prev => ({ ...prev, contactEmail: validateEmail(value) }));
                  }}
                  className="bg-gray-800 border-gray-600 text-white"
                />
                {validationErrors.contactEmail && (
                  <p className="text-sm text-red-400">{validationErrors.contactEmail}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="text-white">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({...formData, contactPhone: value});
                  setValidationErrors(prev => ({ ...prev, contactPhone: validatePhone(value) }));
                }}
                className="bg-gray-800 border-gray-600 text-white"
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
                rows={4}
              />
            </div>
            
            {canManagePrizes && (
              <div className="grid grid-cols-3 gap-4">
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
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Mode Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} className="border-gray-600 text-gray-300">
            Cancel
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={!validateCurrentStep() || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Tournament'}
          </Button>
        </div>
      </div>
    );
  }

  // Create mode with steps
  return (
    <div className="space-y-6">
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

      {/* Step Content */}
      <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
        {currentStep === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Tournament Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter tournament name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="format" className="text-white">Format</Label>
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
              <Label htmlFor="description" className="text-white">Description</Label>
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
                <Label htmlFor="venue" className="text-white">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({...formData, venue: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Stadium name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-white">City</Label>
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
            <div className="grid grid-cols-2 gap-4">
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
            
            <div className="grid grid-cols-2 gap-4">
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
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTeams" className="text-white">Max Teams</Label>
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
                <Label htmlFor="entryFee" className="text-white">Entry Fee (Lakh)</Label>
                <Input
                  id="entryFee"
                  type="number"
                  step="0.01"
                  value={entryFeeLakh}
                  onChange={(e) => handleEntryFeeChange(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="0.05"
                  min="0.01"
                />
                {validationErrors.entryFee && (
                  <p className="text-sm text-red-400">{validationErrors.entryFee}</p>
                )}
                {entryFeeLakh && !isNaN(parseFloat(entryFeeLakh)) && (
                  <p className="text-xs text-gray-400">= ₹{lakhToAmount(entryFeeLakh).toLocaleString('en-IN')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="prizePool" className="text-white">Prize Pool (Lakh)</Label>
                <Input
                  id="prizePool"
                  type="number"
                  step="0.01"
                  value={prizePoolLakh}
                  onChange={(e) => handlePrizePoolChange(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="1"
                  min="0.01"
                />
                {validationErrors.prizePool && (
                  <p className="text-sm text-red-400">{validationErrors.prizePool}</p>
                )}
                {prizePoolLakh && !isNaN(parseFloat(prizePoolLakh)) && (
                  <p className="text-xs text-gray-400">= ₹{lakhToAmount(prizePoolLakh).toLocaleString('en-IN')}</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {currentStep === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organizer" className="text-white">Organizer</Label>
                <Input
                  id="organizer"
                  value={formData.organizer}
                  onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Organization name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-white">Contact Email</Label>
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
              <Label htmlFor="contactPhone" className="text-white">Contact Phone</Label>
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
            
            {canManagePrizes && (
              <div className="grid grid-cols-3 gap-4">
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
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="border-gray-600 text-gray-300">
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
              onClick={onSubmit} 
              disabled={!validateCurrentStep() || loading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Tournament' : 'Create Tournament')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 