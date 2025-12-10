'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, User, Trophy, Target, Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { usePlayers, Player } from '@/hooks/usePlayers';
import { useDebounce } from '@/hooks/useDebounce';
import { amountToLakh, lakhToAmount, formatCurrency } from '@/lib/format';

export default function PlayersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    nationality: 'Indian',
    role: '',
    battingHand: 'Right',
    bowlingHand: 'none',
    basePrice: '',
    image: ''
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { 
    players, 
    loading, 
    error, 
    pagination,
    createPlayer,
    updatePlayer,
    deletePlayer,
    updatePlayerStatus,
    fetchPlayers 
  } = usePlayers();

  // Fetch players when filters change
  React.useEffect(() => {
    fetchPlayers({
      page: currentPage,
      limit: 12,
      search: debouncedSearchTerm,
      role: roleFilter !== 'all' ? roleFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined
    });
  }, [currentPage, debouncedSearchTerm, roleFilter, statusFilter, fetchPlayers]);

  const handleCreatePlayer = async () => {
    try {
      if (!formData.name || !formData.role || !formData.age || !formData.basePrice) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Convert from lakh to actual amount
      const basePriceAmount = lakhToAmount(formData.basePrice);

      const playerData = {
        name: formData.name,
        age: parseInt(formData.age) || 25,
        nationality: formData.nationality || 'Indian',
        role: formData.role as Player['role'],
        battingHand: formData.battingHand as Player['battingHand'],
        bowlingHand: formData.bowlingHand === 'none' ? undefined : formData.bowlingHand,
        basePrice: basePriceAmount,
        image: formData.image || ''
      };

      await createPlayer(playerData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.log('Error creating player:', error);
    }
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;
    
    try {
      // Convert from lakh to actual amount
      const basePriceAmount = formData.basePrice ? lakhToAmount(formData.basePrice) : editingPlayer.basePrice;

      const playerData = {
        name: formData.name,
        age: parseInt(formData.age) || editingPlayer.age,
        nationality: formData.nationality || editingPlayer.nationality,
        role: formData.role as Player['role'] || editingPlayer.role,
        battingHand: formData.battingHand as Player['battingHand'] || editingPlayer.battingHand,
        bowlingHand: formData.bowlingHand === '' || formData.bowlingHand === 'none' ? null : formData.bowlingHand,
        basePrice: basePriceAmount,
        image: formData.image || editingPlayer.image
      };

      await updatePlayer(editingPlayer._id, playerData);
      setEditingPlayer(null);
      resetForm();
    } catch (error) {
      console.log('error', error)
    }
  };

  const confirmDeletePlayer = (player: Player) => {
    setPlayerToDelete(player);
    setIsDeleteDialogOpen(true);
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;
    
    try {
      await deletePlayer(playerToDelete._id);
      setIsDeleteDialogOpen(false);
      setPlayerToDelete(null);
    } catch (error) {
      console.log('error', error);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updatePlayerStatus(id, newStatus);
    } catch (error) {
      console.log('error', error)
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age: '',
      nationality: 'Indian',
      role: '',
      battingHand: 'Right',
      bowlingHand: 'none',
      basePrice: '',
      image: ''
    });
  };

  const openEditDialog = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      age: player.age.toString(),
      nationality: player.nationality,
      role: player.role,
      battingHand: player.battingHand,
      bowlingHand: player.bowlingHand || '',
      basePrice: amountToLakh(player.basePrice).toFixed(2),
      image: player.image || ''
    });
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'batsman': return 'bg-blue-500';
      case 'bowler': return 'bg-red-500';
      case 'all-rounder': return 'bg-purple-500';
      case 'wicket-keeper': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Reset form when create dialog opens
  React.useEffect(() => {
    if (isCreateDialogOpen) {
      resetForm();
    }
  }, [isCreateDialogOpen]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Players</h1>
            <p className="text-gray-400">Manage cricket players and their profiles</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Players</h1>
            <p className="text-gray-400">Manage cricket players and their profiles</p>
          </div>
        </div>
        <div className="text-center py-12">
          <User className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Error loading players</h3>
          <p className="text-gray-500">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Players</h1>
          <p className="text-gray-400">Manage cricket players and their profiles</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md max-h-[90vh] overflow-y-auto max-sm:p-4">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Player</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a new cricket player profile.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Player name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-white">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality" className="text-white">Nationality</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Indian"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role" className="text-white">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="batsman">Batsman</SelectItem>
                    <SelectItem value="bowler">Bowler</SelectItem>
                    <SelectItem value="all-rounder">All-rounder</SelectItem>
                    <SelectItem value="wicket-keeper">Wicket-keeper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="bowlingHand" className="text-white">Bowling Hand</Label>
                  <Select value={formData.bowlingHand} onValueChange={(value) => setFormData({...formData, bowlingHand: value})}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Right">Right</SelectItem>
                    <SelectItem value="Left">Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="basePrice" className="text-white">Base Price (Lakh) *</Label>
                <div className="relative">
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({...formData, basePrice: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white pr-16"
                    placeholder="10"
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
                  placeholder="https://..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="border-gray-600 text-gray-300">
                Cancel
              </Button>
              <Button onClick={handleCreatePlayer} className="bg-blue-600 hover:bg-blue-700">
                Create Player
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-4">
        <div className="relative flex-1 min-w-3xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600 text-white"
          />
        </div>
        
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="batsman">Batsman</SelectItem>
            <SelectItem value="bowler">Bowler</SelectItem>
            <SelectItem value="all-rounder">All-rounder</SelectItem>
            <SelectItem value="wicket-keeper">Wicket-keeper</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            {/* <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="unsold">Unsold</SelectItem> */}
            <SelectItem value="injured">Injured</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex border border-gray-600 rounded-lg bg-gray-800 w-fit">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="rounded-r-none"
          >
            Cards
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-l-none"
          >
            Table
          </Button>
        </div>
      </div>

      {/* Player Count */}
      <div className="text-sm text-gray-400">
        {pagination ? `Page ${pagination.currentPage} of ${pagination.totalPages}` : `${players.length} players`}
      </div>

      {/* Players Display */}
      {players.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No players found</h3>
          <p className="text-gray-500 mb-4">
            {debouncedSearchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
              ? 'Try adjusting your search filters.' 
              : 'Get started by adding your first player.'}
          </p>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Player
          </Button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((player, index:number) => (
            <Card key={player._id || index} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
              <CardHeader className="pb-3 max-sm:p-4">
                <div className="flex items-center justify-between">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={player?.image} />
                    <AvatarFallback className="bg-gray-700 text-white">
                      {player?.name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-1">
                    <Badge className={`${getStatusColor(player?.status)} text-white text-xs`}>
                      {player?.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <CardTitle className="text-white text-lg">{player.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {player?.age} years • {player?.nationality}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-sm:px-4 max-sm:pb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Role</span>
                  <Badge className={`${getRoleColor(player?.role)} text-white text-xs`}>
                    {player.role}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Base Price</span>
                  <span className="text-white font-medium">{formatCurrency(player?.basePrice || 0)}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Batting</span>
                  <span className="text-white">{player?.battingHand}</span>
                </div>
                
                {player.bowlingHand && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Bowling</span>
                    <span className="text-white">{player?.bowlingHand}</span>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/admin/players/${player?._id}`)}
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(player)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirmDeletePlayer(player)}
                    className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-800 border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Player</TableHead>
                <TableHead className="text-gray-300">Role</TableHead>
                <TableHead className="text-gray-300">Age</TableHead>
                <TableHead className="text-gray-300">Base Price</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player._id} className="border-gray-700">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.image} />
                        <AvatarFallback className="bg-gray-700 text-white text-xs">
                          {player?.name?.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-white font-medium">{player?.name}</div>
                        <div className="text-gray-400 text-sm">{player?.nationality}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getRoleColor(player?.role)} text-white text-xs`}>
                      {player?.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">{player?.age}</TableCell>
                  <TableCell className="text-gray-300">{formatCurrency(player?.basePrice || 0)}</TableCell>
                  <TableCell>
                    <Select
                      value={player?.status}
                      onValueChange={(value) => handleStatusChange(player?._id, value)}
                    >
                      <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
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
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/players/${player?._id}`)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(player)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => confirmDeletePlayer(player)}
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={pagination.currentPage === 1}
              className="border-gray-600 text-gray-300"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={pagination.currentPage === pagination.totalPages}
              className="border-gray-600 text-gray-300"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editingPlayer !== null} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md max-h-[90vh] overflow-y-auto max-sm:p-4">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Player</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update player information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-white">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-age" className="text-white">Age *</Label>
                <Input
                  id="edit-age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nationality" className="text-white">Nationality</Label>
                <Input
                  id="edit-nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-role" className="text-white">Role *</Label>
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-battingHand" className="text-white">Batting Hand</Label>
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
                <Label htmlFor="edit-bowlingHand" className="text-white">Bowling Hand</Label>
                <Select value={formData.bowlingHand} onValueChange={(value) => setFormData({...formData, bowlingHand: value})}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Right">Right</SelectItem>
                    <SelectItem value="Left">Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-basePrice" className="text-white">Base Price (Lakh) *</Label>
              <div className="relative">
                <Input
                  id="edit-basePrice"
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
              <Label htmlFor="edit-image" className="text-white">Image URL</Label>
              <Input
                id="edit-image"
                value={formData.image}
                onChange={(e) => setFormData({...formData, image: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlayer(null)} className="border-gray-600 text-gray-300">
              Cancel
            </Button>
            <Button onClick={handleUpdatePlayer} className="bg-blue-600 hover:bg-blue-700">
              Update Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Player</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete <span className="font-semibold text-white">{playerToDelete?.name}</span>? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)} 
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeletePlayer} 
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 