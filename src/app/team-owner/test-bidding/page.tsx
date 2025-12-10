'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gavel, Users, DollarSign, AlertCircle, CheckCircle, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';

interface Auction {
  _id: string;
  name: string;
  status: string;
  currentPlayer?: {
    _id: string;
    name: string;
    role: string;
    basePrice: number;
  };
  currentBid?: {
    amount: number;
    team: {
      name: string;
    };
  };
  myTeam?: {
    _id: string;
    name: string;
    remainingBudget: number;
  };
  rules?: {
    maxBidIncrement: number;
  };
  userRole?: string;
}

export default function TestBiddingPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [biddingFor, setBiddingFor] = useState<string | null>(null);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auctions');
      const data = await response.json();
      
      if (data.success) {
        setAuctions(data.data.auctions || []);
      } else {
        toast.error('Failed to fetch auctions');
      }
    } catch (error) {
      console.error('Error fetching auctions:', error);
      toast.error('Failed to fetch auctions');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (auctionId: string) => {
    if (!bidAmount) {
      toast.error('Please enter a bid amount');
      return;
    }

    const amount = parseInt(bidAmount);
    if (isNaN(amount)) {
      toast.error('Please enter a valid bid amount');
      return;
    }

    try {
      setBiddingFor(auctionId);
      const response = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Bid placed successfully!');
        setBidAmount('');
        fetchAuctions(); // Refresh auction data
      } else {
        toast.error(data.error || 'Failed to place bid');
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      toast.error('Failed to place bid');
    } finally {
      setBiddingFor(null);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500';
      case 'upcoming': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Test Bidding Interface</h1>
        <Button onClick={fetchAuctions} variant="outline">
          Refresh
        </Button>
      </div>

      {auctions.length === 0 ? (
        <Card className="bg-gray-900/50">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Auctions Found</h3>
            <p className="text-gray-500">There are no auctions available for bidding.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {auctions.map((auction) => (
            <Card key={auction._id} className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">{auction.name}</CardTitle>
                  <Badge className={getStatusColor(auction.status)}>
                    {auction.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {auction.currentPlayer ? (
                  <>
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <h4 className="font-medium text-white mb-2">Current Player</h4>
                      <p className="text-blue-400">{auction.currentPlayer.name}</p>
                      <p className="text-gray-400 text-sm">{auction.currentPlayer.role}</p>
                      <p className="text-green-400 font-medium">
                        Base Price: {formatCurrency(auction.currentPlayer.basePrice)}
                      </p>
                    </div>

                    {auction.currentBid && (
                      <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Current Bid</h4>
                        <p className="text-green-400 font-bold text-xl">
                          {formatCurrency(auction.currentBid.amount)}
                        </p>
                        <p className="text-blue-400 text-sm">by {auction.currentBid.team.name}</p>
                      </div>
                    )}

                    {auction.myTeam && (
                      <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Your Team</h4>
                        <p className="text-blue-400">{auction.myTeam.name}</p>
                        <p className="text-green-400 font-medium">
                          Budget: {formatCurrency(auction.myTeam.remainingBudget)}
                        </p>
                      </div>
                    )}

                    {/* Debug Info */}
                    <div className="p-3 bg-gray-800/30 rounded-lg text-xs text-gray-400">
                      <div>User Role: {auction.userRole || 'Unknown'}</div>
                      <div>Can Bid: {auction.status === 'live' && auction.userRole === 'team-owner' ? 'Yes' : 'No'}</div>
                      <div>Min Increment: {auction.rules?.maxBidIncrement ? formatCurrency(auction.rules.maxBidIncrement) : 'Unknown'}</div>
                    </div>

                    {/* Bidding Controls */}
                    {auction.status === 'live' && auction.userRole === 'team-owner' && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Enter bid amount"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="flex-1 bg-gray-800/50 border-gray-600"
                          />
                          <Button
                            onClick={() => handlePlaceBid(auction._id)}
                            disabled={!bidAmount || biddingFor === auction._id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {biddingFor === auction._id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <Gavel className="w-4 h-4 mr-2" />
                                Bid
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Quick bid suggestions */}
                        {auction.currentBid && auction.rules && (
                          <div className="grid grid-cols-2 gap-2">
                            {[auction.rules.maxBidIncrement, auction.rules.maxBidIncrement * 2].map((increment) => {
                              const suggestedBid = auction.currentBid!.amount + increment;
                              return (
                                <Button
                                  key={increment}
                                  variant="outline"
                                  onClick={() => setBidAmount(suggestedBid.toString())}
                                  disabled={auction.myTeam && suggestedBid > auction.myTeam.remainingBudget}
                                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                >
                                  +{formatCurrency(increment)}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status Messages */}
                    {auction.status === 'upcoming' && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-blue-400 text-sm">Auction will start soon. Get ready to bid!</p>
                      </div>
                    )}

                    {auction.status === 'paused' && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-yellow-400 text-sm">Auction is currently paused.</p>
                      </div>
                    )}

                    {auction.status === 'completed' && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-green-400 text-sm">Auction has been completed.</p>
                      </div>
                    )}

                    {auction.status === 'live' && auction.userRole !== 'team-owner' && (
                      <div className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                        <p className="text-gray-400 text-sm">Only team owners can place bids.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No Current Player</h3>
                    <p className="text-gray-500">Waiting for auction to start...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instructions */}
      <Card className="bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-white">How to Test Bidding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300">
          <p>1. Make sure you're logged in as a team owner</p>
          <p>2. The auction must be in "live" status</p>
          <p>3. There must be a current player being auctioned</p>
          <p>4. Your team must be participating in the auction</p>
          <p>5. You must have sufficient budget</p>
        </CardContent>
      </Card>
    </div>
  );
} 