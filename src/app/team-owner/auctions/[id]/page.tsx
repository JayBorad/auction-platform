'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Gavel, 
  Timer, 
  Trophy, 
  Users, 
  DollarSign, 
  Eye,
  TrendingUp,
  Clock,
  Zap,
  Target,
  Activity,
  Star,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  XCircle,
  Crown,
  Flame,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import WebSocketTest from '@/components/shared/WebSocketTest';
import { useWebSocket } from '@/context/WebSocketContext';
import { amountToLakh, lakhToAmount, formatCurrency } from '@/lib/format';
import PlayerSoldModal from '@/components/shared/PlayerSoldModal';

interface Player {
  _id: string;
  name: string;
  role: string;
  basePrice: number;
  image?: string;
  battingHand?: string;
  bowlingHand?: string;
  nationality?: string;
  age?: number;
  stats?: {
    runs?: number;
    wickets?: number;
    matches?: number;
    average?: number;
  };
}

interface Team {
  _id: string;
  name: string;
  logo?: string;
  remainingBudget: number;
  playersWon?: Player[];
}

interface Bid {
  _id: string;
  team: Team;
  amount: number;
  timestamp: string;
  status: 'active' | 'outbid' | 'won';
}

interface AuctionDetails {
  _id: string;
  name: string;
  tournament: {
    _id: string;
    name: string;
  };
  status: 'upcoming' | 'live' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
  totalBudget: number;
  totalPlayers: number;
  soldPlayers: number;
  unsoldPlayers: number;
  currentPlayer?: Player;
  currentBid?: {
    amount: number;
    team: Team;
  };
  myTeam?: Team;
  participants: Array<{
    team: Team;
    remainingBudget: number;
    playersWon: Player[];
  }>;
  recentBids: Bid[];
  rules: {
    maxBidIncrement: number;
    bidTimeout: number;
    maxPlayersPerTeam: number;
    maxForeignPlayers: number;
  };
  userRole?: 'admin' | 'moderator' | 'team-owner';
}

export default function TeamOwnerAuctionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;
  
  const [auction, setAuction] = useState<AuctionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('live');
  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const { wsManager } = useWebSocket();

  // Add myTeam state
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [recentBids, setRecentBids] = useState<Bid[]>([]);
  const [currentPlayerBids, setCurrentPlayerBids] = useState<Bid[]>([]);
  const [bidTimer, setBidTimer] = useState<number>(30); // 30 seconds default
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [lastBidNotification, setLastBidNotification] = useState<string>('');
  const [justWonPlayer, setJustWonPlayer] = useState<boolean>(false);
  const [wonPlayerName, setWonPlayerName] = useState<string>('');
  const [previousPlayerId, setPreviousPlayerId] = useState<string | null>(null);
  
  // Player sold modal state
  const [playerSoldModal, setPlayerSoldModal] = useState<{
    isOpen: boolean;
    playerName: string;
    teamName: string;
    playerImage?: string;
    teamLogo?: string;
    amount: number;
  }>({
    isOpen: false,
    playerName: '',
    teamName: '',
    amount: 0
  });
  
  // Ref to store debounce timeout for fetchAuctionDetails
  const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAuctionDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/auctions/${auctionId}/team-owner`);
      const data = await response.json();
      
      console.log('Auction API Response:', data); // Debug log
      
      if (data.success) {
        // Create auction object with userRole
        const auctionWithRole = {
          ...data.data.auction,
          userRole: data.data.userRole,
          recentBids:data.data.recentBids
        };
        setAuction(auctionWithRole);
        setRecentBids(data.data.recentBids || []);
        setCurrentPlayerBids(data.data.currentPlayerBids || []);
        // Set my team data
        if (data.data.myTeam) {
          setMyTeam(data.data.myTeam);
        }
        
        // Debug logs
        console.log('Auction status:', data.data.auction.status);
        console.log('User role:', data.data.userRole);
        console.log('My team:', data.data.myTeam);
        console.log('Current player:', data.data.auction.currentPlayer);
      } else {
        setError(data.error || 'Failed to load auction details');
        toast.error(data.error || 'Failed to load auction details');
      }
    } catch (error) {
      console.error('Error fetching auction details:', error);
      setError('Failed to load auction details. Please try again later.');
      toast.error('Failed to load auction details');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  // Debounced version of fetchAuctionDetails to prevent too many API calls
  // This reduces MongoDB connections by batching rapid WebSocket events
  // Reduced to 500ms for faster updates while still preventing connection exhaustion
  const debouncedFetchAuctionDetails = useCallback(() => {
    // Clear existing timeout
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    
    // Set new timeout - wait 500ms after last event before fetching
    // This balances real-time updates with connection management
    fetchDebounceRef.current = setTimeout(() => {
      fetchAuctionDetails();
    }, 500);
  }, [fetchAuctionDetails]);

  useEffect(() => {
    if (auctionId) {
      fetchAuctionDetails();
    }
  }, [auctionId, fetchAuctionDetails]);

  // Set default bid amount to minimum bid when auction data changes (in lakh)
  useEffect(() => {
    if (auction?.currentPlayer && auction?.status === "live" && auction?.userRole === "team-owner") {
      const minimumBid = (auction.currentBid?.amount || auction.currentPlayer?.basePrice || 0) + (auction.rules?.maxBidIncrement || 500000);
      setBidAmount(amountToLakh(minimumBid).toFixed(2));
    }
  }, [auction?.currentPlayer?._id, auction?.currentBid?.amount, auction?.rules?.maxBidIncrement, auction?.status, auction?.userRole]);

  // WebSocket connection and event handling
  useEffect(() => {
    if (!auctionId) return;

    wsManager.joinAuction(auctionId);

    const handleAuctionEvent = (event: any) => {
      console.log('[WebSocket] Received auction event:', event.type, 'for auction:', event.auctionId);
      if (event.auctionId === auctionId) {
        switch (event.type) {
          case 'bid_placed':
            // Play hammer sound when a bid is placed
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.value = 200;
              oscillator.type = 'sine';
              
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.3);
            } catch (error) {
              console.log('Could not play hammer sound:', error);
            }
            
            // Show bid notification immediately for instant feedback
            if (event.data && event.data.bid) {
              const bidAmount = event.data.bid.amount;
              const teamName = event.data.bid.bidderName || 'Unknown Team';
              setLastBidNotification(`${teamName} bid ${formatCurrency(bidAmount)}`);
              setTimeout(() => setLastBidNotification(''), 5000);
            }
            
            // Use debounced fetch to sync full state (prevents too many MongoDB connections)
            // Reduced delay ensures users see updates quickly
            debouncedFetchAuctionDetails();
            
            // Reset timer to 30 seconds on any bid
            setBidTimer(30);
            setIsTimerActive(true);
            // Clear bid amount so minimum bid gets updated
            setBidAmount('');
            break;
          case 'player_changed':
            // Update when current player changes - fetch immediately for player changes
            // Player changes are less frequent, so immediate fetch is acceptable
            fetchAuctionDetails();
            setBidTimer(30);
            setIsTimerActive(true);
            setBidAmount(''); // Clear bid amount so minimum bid gets set for new player
            break;
          case 'auction_started':
          case 'auction_ended':
            // Update auction status - fetch immediately for status changes
            fetchAuctionDetails();
            if (event.type === 'auction_started') {
              setBidTimer(30);
              setIsTimerActive(true);
            } else {
              setIsTimerActive(false);
            }
            break;
          case 'auction_paused':
            // Update auction status when paused - fetch immediately
            fetchAuctionDetails();
            setBidTimer(0); // Stop timer when paused
            setIsTimerActive(false);
            break;
          case 'auction_resumed':
            // Update auction status when resumed - fetch immediately
            fetchAuctionDetails();
            setBidTimer(30); // Reset timer when resumed
            setIsTimerActive(true);
            break;
          case 'timer_sync':
          // Synchronize timer with server - no API call needed
            if (event.data && typeof event.data.timeLeft === 'number') {
              setBidTimer(event.data.timeLeft);
              setIsTimerActive(event.data.timeLeft > 0);
            }
            break;
          case 'player_sold':
            // Show congratulation modal when a player is sold
            if (event.data && event.data.player && event.data.team) {
              setPlayerSoldModal({
                isOpen: true,
                playerName: event.data.player.name || 'Unknown Player',
                teamName: event.data.team.name || 'Unknown Team',
                playerImage: event.data.player.image,
                teamLogo: event.data.team.logo,
                amount: event.data.amount || 0
              });
            }
            // Also fetch updated auction details
            debouncedFetchAuctionDetails();
            break;
        }
      }
    };

    const cleanup = wsManager.onAuctionEvent(handleAuctionEvent);

    return () => {
      cleanup();
      wsManager.leaveAuction(auctionId);
      // Clear debounce timeout on cleanup
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
    };
    }, [auctionId, debouncedFetchAuctionDetails]);

    // Detect when player is won by this team
    useEffect(() => {
      if (auction?.currentPlayer?._id !== previousPlayerId && previousPlayerId && myTeam) {
        // Player changed, check if we won the previous player
        const wonPlayer = myTeam.playersWon?.find((player: any) => player._id === previousPlayerId);
        if (wonPlayer) {
          setWonPlayerName(wonPlayer.name);
          setJustWonPlayer(true);
          // Trigger confetti
          // triggerConfetti();
          // Reset after animation
          setTimeout(() => {
            setJustWonPlayer(false);
            setWonPlayerName('');
          }, 5000);
        }
      }
      setPreviousPlayerId(auction?.currentPlayer?._id || null);
    }, [auction?.currentPlayer?._id, myTeam?.playersWon]);

    // Timer effect for bid countdown (client-side countdown)
    useEffect(() => {
      let interval: NodeJS.Timeout;
      if (auction?.status === 'live' && auction?.currentPlayer && bidTimer > 0 && isTimerActive) {
        interval = setInterval(() => {
          setBidTimer((prev) => {
            const newTime = prev > 0 ? prev - 1 : 0;
            // Sync timer every 5 seconds to prevent drift
            if (newTime % 5 === 0 && newTime > 0) {
              wsManager.syncTimer(auctionId, newTime);
            }
            return newTime;
          });
        }, 1000);
      }
      return () => clearInterval(interval);
    }, [auction?.status, auction?.currentPlayer, bidTimer, isTimerActive, auctionId, wsManager]);

  // Update the bid amount validation to use myTeam data
  const handlePlaceBid = async () => {
    if (!bidAmount || !auction || !myTeam) {
      toast.error('Unable to place bid at this time');
      return;
    }

    // Don't allow admins/moderators to place bids
    if (auction.userRole !== 'team-owner') {
      toast.error('Only team owners can place bids');
      return;
    }
    
    // Convert from lakh to actual amount
    const amount = lakhToAmount(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid bid amount');
      return;
    }

    const minimumBid = (auction.currentBid?.amount || auction.currentPlayer?.basePrice || 0) + (auction.rules?.maxBidIncrement || 0);
    
    if (amount < minimumBid) {
      toast.error(`Minimum bid is ${formatCurrency(minimumBid)} (${amountToLakh(minimumBid).toFixed(2)}L)`);
      return;
    }

    if (amount > myTeam.remainingBudget) {
      toast.error('Bid amount exceeds your remaining budget');
      return;
    }
    
    try {
      setIsBidding(true);
      const response = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });
      
      const data = await response.json();
      if (data.success) {
        fetchAuctionDetails();
        setBidAmount('');
        // Reset timer to 30 seconds on successful bid
        setBidTimer(30);
        setIsTimerActive(true);
        toast.success('Bid placed successfully');
      } else {
        toast.error(data.error || 'Failed to place bid');
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      toast.error('Failed to place bid');
    } finally {
      setIsBidding(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500 animate-pulse';
      case 'upcoming': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getActiveBidsCount = () => {
    if (!myTeam || !recentBids.length) return 0;
    return recentBids.filter((bid:any) => bid.bidder._id === myTeam._id && bid.status === 'active').length;
  };

  const getWonPlayersCount = () => {
    return myTeam?.playersWon?.length || 0;
  };

  const getRemainingBudget = () => {
    return myTeam?.remainingBudget || 0;
  };

  const canPlaceBid = (suggestedBid: number) => {
    if (!myTeam) return false;
    return suggestedBid <= myTeam.remainingBudget;
  };

  // Trigger confetti animation when player is won
  // const triggerConfetti = async () => {
  //   try {
  //     // Dynamic import to avoid issues if not installed yet
  //     const confetti = (await import('canvas-confetti')).default;

  //     // Left bottom corner confetti
  //     confetti({
  //       particleCount: 100,
  //       angle: 60,
  //       spread: 55,
  //       origin: { x: 0, y: 1 },
  //       colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']
  //     });

  //     // Right bottom corner confetti
  //     confetti({
  //       particleCount: 100,
  //       angle: 120,
  //       spread: 55,
  //       origin: { x: 1, y: 1 },
  //       colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']
  //     });

  //     // Center burst for extra celebration
  //     setTimeout(() => {
  //       confetti({
  //         particleCount: 50,
  //         angle: 90,
  //         spread: 360,
  //         origin: { x: 0.5, y: 0.5 },
  //         colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']
  //       });
  //     }, 500);
  //   } catch (error) {
  //     console.log('Confetti not available:', error);
  //     // Fallback: just show a success message
  //     toast.success('🎉 Congratulations! You won the player!');
  //   }
  // };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/team-owner/auctions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Auctions
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/team-owner/auctions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Auctions
          </Button>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Unable to Load Auction</h3>
          <p className="text-gray-500 max-w-md mx-auto">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => fetchAuctionDetails()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/team-owner/auctions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Auctions
          </Button>
        </div>
        <div className="text-center py-12">
          <Gavel className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Auction not found</h3>
          <p className="text-gray-500">The auction you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  // Split bids into left and right based on current bid
  const currentBidAmount = auction.currentBid?.amount || 0;
  const lowerBids = auction?.recentBids?.filter(bid => bid.amount < currentBidAmount) || [];
  const higherBids = auction?.recentBids?.filter(bid => bid.amount > currentBidAmount) || [];

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex flex-wrap justify-end items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-400">Your Budget</p>
            <p className="text-lg font-bold text-green-400">
              {formatCurrency(getRemainingBudget())}
            </p>
          </div>
          <Badge
            className={
              auction?.status === "live" ? "bg-red-500" : "bg-blue-500"
            }
          >
            {auction?.status?.toUpperCase()}
          </Badge>
          <WebSocketTest auctionId={auctionId} userRole="team-owner" />
        </div>
      </div>

      {/* Debug Information */}
      {/* {process.env.NODE_ENV === "development" && auction && (
        <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-4 rounded-lg text-xs">
          <div>Status: {auction.status}</div>
          <div>User Role: {auction.userRole}</div>
          <div>My Team: {myTeam?.name || "None"}</div>
          <div>Current Player: {auction.currentPlayer?.name || "None"}</div>
          <div>
            Can Bid:{" "}
            {auction.status === "live" && auction.userRole === "team-owner"
              ? "Yes"
              : "No"}
          </div>
        </div>
      )} */}

      {/* Bid Notification */}
      {lastBidNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Gavel className="w-4 h-4" />
            <span className="font-medium">{lastBidNotification}</span>
          </div>
        </div>
      )}

      {/* Player Won Celebration */}
      <AnimatePresence>
        {justWonPlayer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 shadow-2xl">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-2">Congratulations!</h2>
                <p className="text-green-300 text-lg">You won <span className="font-bold text-white">{wonPlayerName}</span>!</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prominent Bidding Section for Team Owners */}
      {auction.status === "live" && auction.userRole === "team-owner" && (
        <Card className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border-2 border-green-500/50">
          <CardHeader className='max-sm:p-4'>
            <CardTitle className="max-sm:text-sm text-white flex items-center gap-2">
              <Gavel className="w-6 h-6 text-green-400" />
              Live Bidding - {auction.currentPlayer?.name || "No Player"}
            </CardTitle>
          </CardHeader>
          <CardContent className='max-sm:p-4 !pt-0'>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                <p className="text-gray-400 text-sm">Current Bid</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(
                    auction.currentBid?.amount ||
                      auction.currentPlayer?.basePrice ||
                      0
                  )}
                </p>
                <p className="text-blue-400 text-sm">
                  by {auction.currentBid?.team?.name || "No bids yet"}
                </p>
              </div>

              <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                <p className="text-gray-400 text-sm">Your Budget</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(myTeam?.remainingBudget || 0)}
                </p>
                <p className="text-gray-400 text-sm">Available</p>
              </div>

              <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                <p className="text-gray-400 text-sm">Min Increment</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {formatCurrency(auction.rules?.maxBidIncrement || 500000)}
                </p>
                <p className="text-gray-400 text-sm">Required</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Auction Area */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Side - Lower Bids */}
        <Card className="col-span-12 lg:col-span-6 xl:col-span-3 bg-gray-900/50 max-xl:order-2 max-h-[400px] xl:max-h-[661px] overflow-y-auto">
          <CardHeader>
            <CardTitle>Previous Bids</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lowerBids.map((bid: any) => (
              <div key={bid._id} className="p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={bid.bidder?.logo} />
                    <AvatarFallback>{bid.bidder?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">
                      {bid.bidder?.name || bid.bidderName}
                    </p>
                    <p className="text-sm text-green-400">
                      {formatCurrency(bid.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Center - Current Player */}
        <Card className="col-span-12 xl:col-span-6 bg-gray-900/50 max-xl:order-1">
          <CardContent className="p-6">
            {auction.currentPlayer ? (
              <div className="space-y-2">
                {/* Player Image */}
                <div className="flex items-center gap-4 justify-center">
                  <div className="flex justify-center">
                    <Avatar className="w-12 h-12 rounded-full border border-gray-500">
                      <AvatarImage src={auction.currentPlayer.image} />
                      <AvatarFallback className="text-2xl">
                        {auction.currentPlayer.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Player Details */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-bold text-white">
                        {auction.currentPlayer.name}
                      </h2>
                      <Badge>{auction.currentPlayer.role}</Badge>
                    </div>
                    <p className="text-gray-400">
                      Base Price:{" "}
                      {formatCurrency(auction.currentPlayer.basePrice)}
                    </p>
                  </div>
                </div>

                {/* Current Bid */}
                {auction.currentBid && (
                  <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <p className="text-sm text-gray-400">Current Bid</p>
                    <p className="text-3xl sm:text-4xl font-bold text-green-400 mt-1">
                      {formatCurrency(auction.currentBid.amount)}
                    </p>
                    <p className="text-blue-400 font-medium">
                      {auction?.currentBid?.team?.name}
                    </p>
                  </div>
                )}

                {/* Player Stats */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  {auction.currentPlayer.stats?.runs !== undefined && (
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400">Runs</p>
                      <p className="text-xl font-bold text-white">
                        {auction.currentPlayer.stats.runs}
                      </p>
                    </div>
                  )}
                  {auction.currentPlayer.stats?.wickets !== undefined && (
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400">Wickets</p>
                      <p className="text-xl font-bold text-white">
                        {auction.currentPlayer.stats.wickets}
                      </p>
                    </div>
                  )}
                  {auction.currentPlayer.stats?.matches !== undefined && (
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400">Matches</p>
                      <p className="text-xl font-bold text-white">
                        {auction.currentPlayer.stats.matches}
                      </p>
                    </div>
                  )}
                  {auction.currentPlayer.stats?.average !== undefined && (
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <p className="text-gray-400">Average</p>
                      <p className="text-xl font-bold text-white">
                        {auction.currentPlayer.stats.average}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bidding Controls */}
                {auction.status === "live" &&
                  auction.userRole === "team-owner" && (
                    <div
                      data-bidding-section
                      className="space-y-4 p-6 bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg border-2 border-green-500/30"
                    >
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-bold text-white mb-2">
                          🎯 Place Your Bid
                        </h3>

                        {/* Countdown Timer */}
                        {isTimerActive && auction.status === 'live' && (
                        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                          <div className="flex items-center justify-center gap-2">
                            <Timer className="w-5 h-5 text-red-400 animate-pulse" />
                            <span className={`font-bold text-lg ${
                              bidTimer <= 10 ? "text-red-400 animate-pulse" : "text-red-400"
                            }`}>
                              {bidTimer}s
                            </span>
                            <span className="text-red-300 text-sm">remaining</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-1000 ${
                                bidTimer <= 10 ? "bg-red-500 animate-pulse" : "bg-red-500"
                              }`}
                              style={{ width: `${(bidTimer / 30) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                        <p className="text-gray-300 text-sm">
                          Current highest bid:{" "}
                          <span className="text-green-400 font-bold">
                            {formatCurrency(
                              auction.currentBid?.amount ||
                                auction.currentPlayer?.basePrice ||
                                0
                            )}
                          </span>
                        </p>
                        <p className="text-gray-400 text-xs">
                          Minimum increment:{" "}
                          {formatCurrency(
                            auction.rules?.maxBidIncrement || 500000
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={`Enter bid amount in Lakh (min: ${amountToLakh(
                              (auction.currentBid?.amount ||
                                auction.currentPlayer?.basePrice ||
                                0) + (auction.rules?.maxBidIncrement || 500000)
                            ).toFixed(2)}L)`}
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="bg-gray-900/50 border-gray-600 text-white text-lg pr-16"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Lakh</span>
                        </div>
                        <Button
                          onClick={handlePlaceBid}
                          disabled={!bidAmount || isBidding}
                          className="bg-green-600 hover:bg-green-700 min-w-[140px] text-lg font-bold"
                          size="lg"
                        >
                          {isBidding ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <Gavel className="w-5 h-5 mr-2" />
                              BID NOW
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Quick Bid Buttons */}
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400 text-center">
                          Quick Bid Options:
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                          {[500000, 1000000, 2000000, 5000000].map(
                            (increment) => {
                              const suggestedBid =
                                (auction?.currentBid?.amount ||
                                  auction?.currentPlayer?.basePrice ||
                                  0) + increment;
                              const canBid = canPlaceBid(suggestedBid);
                              return (
                                <Button
                                  key={increment}
                                  variant="outline"
                                  onClick={() =>
                                    setBidAmount(amountToLakh(suggestedBid).toFixed(2))
                                  }
                                  disabled={!canBid}
                                  className={`text-gray-300 border-gray-600 hover:bg-gray-700 w-full ${
                                    canBid
                                      ? "hover:border-green-500 hover:text-green-400"
                                      : "opacity-50"
                                  }`}
                                >
                                  +{amountToLakh(increment).toFixed(1)}L
                                </Button>
                              );
                            }
                          )}
                        </div>

                        {/* Smart Bid Suggestions */}
                        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-sm text-gray-400 text-center mb-2">
                            Smart Suggestions:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                const minBid =
                                  (auction?.currentBid?.amount ||
                                    auction?.currentPlayer?.basePrice ||
                                    0) +
                                  (auction.rules?.maxBidIncrement || 500000);
                                setBidAmount(amountToLakh(minBid).toFixed(2));
                              }}
                              disabled={
                                !canPlaceBid(
                                  (auction?.currentBid?.amount ||
                                    auction?.currentPlayer?.basePrice ||
                                    0) +
                                    (auction.rules?.maxBidIncrement || 500000)
                                )
                              }
                              className="text-blue-300 border-blue-600 hover:bg-blue-700 w-full text-xs"
                            >
                              Min Bid
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const aggressiveBid =
                                  (auction?.currentBid?.amount ||
                                    auction?.currentPlayer?.basePrice ||
                                    0) + 10000000; // 1 crore more
                                setBidAmount(amountToLakh(aggressiveBid).toFixed(2));
                              }}
                              disabled={
                                !canPlaceBid(
                                  (auction?.currentBid?.amount ||
                                    auction?.currentPlayer?.basePrice ||
                                    0) + 10000000
                                )
                              }
                              className="text-red-300 border-red-600 hover:bg-red-700 w-full text-xs"
                            >
                              Aggressive
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Budget Warning */}
                      {myTeam && (
                        <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                          <p className="text-sm text-gray-400">
                            Your remaining budget:{" "}
                            <span className="text-green-400 font-bold">
                              {formatCurrency(myTeam.remainingBudget)}
                            </span>
                          </p>
                          {bidAmount &&
                            parseInt(bidAmount) > myTeam.remainingBudget && (
                              <p className="text-red-400 text-sm mt-1">
                                ⚠️ Bid amount exceeds your budget!
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  )}

                {/* Auction Status Notices */}
                {auction.status === "upcoming" &&
                  auction.userRole === "team-owner" && (
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <p className="text-blue-400">
                          Auction will start soon. Get ready to bid!
                        </p>
                      </div>
                    </div>
                  )}

                {auction.status === "paused" &&
                  auction.userRole === "team-owner" && (
                    <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <div className="flex items-center gap-2">
                        <Pause className="w-5 h-5 text-yellow-400" />
                        <p className="text-yellow-400">
                          Auction is currently paused. Bidding will resume
                          shortly.
                        </p>
                      </div>
                    </div>
                  )}

                {auction.status === "completed" &&
                  auction.userRole === "team-owner" && (
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <p className="text-green-400">
                          Auction has been completed. Thank you for
                          participating!
                        </p>
                      </div>
                    </div>
                  )}

                {/* Admin/Moderator View Notice */}
                {(auction.userRole === "admin" ||
                  auction.userRole === "moderator") && (
                  <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-blue-400" />
                      <p className="text-blue-400">
                        Viewing as{" "}
                        {auction.userRole === "admin"
                          ? "Administrator"
                          : "Moderator"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Gavel className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400">
                  No Active Player
                </h3>
                <p className="text-gray-500">Waiting for auction to start...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side - Higher Bids */}
        <Card className="col-span-12 lg:col-span-6 xl:col-span-3 bg-gray-900/50 max-xl:order-3 max-h-[400px] xl:max-h-[661px] overflow-y-auto">
          <CardHeader>
            <CardTitle>Higher Bids</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {higherBids.map((bid: any) => (
              <div key={bid._id} className="p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={bid.bidder?.logo} />
                    <AvatarFallback>{bid.bidder?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">
                      {bid.bidder?.name || bid.bidderName}
                    </p>
                    <p className="text-sm text-green-400">
                      {formatCurrency(bid.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Team Stats */}
      <Card className="bg-gray-900/50">
        <CardHeader>
          <CardTitle>Your Team Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="gap-2 flex flex-col items-center justify-center">
              <p className="text-sm text-gray-400">Remaining Budget</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(getRemainingBudget())}
              </p>
            </div>
            <div className="gap-2 flex flex-col items-center justify-center">
              <p className="text-sm text-gray-400">Your Active Bids</p>
              <p className="text-2xl font-bold text-blue-400">
                {getActiveBidsCount()}
              </p>
            </div>
            <div className="gap-2 flex flex-col items-center justify-center">
              <p className="text-sm text-gray-400">Players Won</p>
              <p className="text-2xl font-bold text-purple-400">
                {getWonPlayersCount()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Other Teams' Purchases */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="max-sm:p-4">
          <CardTitle>Other Teams' Squads</CardTitle>
          <CardDescription>View what other teams have acquired</CardDescription>
        </CardHeader>
        <CardContent className="max-sm:px-4 max-sm:pb-4">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {auction.participants
              .filter((participant) => participant.team._id !== myTeam?._id)
              .map((participant) => (
                <div
                  key={participant.team._id}
                  className="bg-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={participant.team.logo} />
                        <AvatarFallback>
                          {participant.team.name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {participant.team.name || 'Unknown Team'}
                      </span>
                    </div>
                    <span className="text-xs text-green-400">
                      {formatCurrency(participant.remainingBudget)} left
                    </span>
                  </div>
                  {participant.playersWon?.length ? (
                    <div className="mt-2 grid grid-cols-1 gap-1">
                      {participant.playersWon
                        .map((p: any) => (
                          <div
                            key={p._id}
                            className="flex items-center justify-between text-xs text-gray-300"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={p.image} />
                                <AvatarFallback>
                                  {p.name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[120px]">
                                {p.name}
                              </span>
                            </div>
                            <span className="text-blue-300">
                              {formatCurrency(p.soldPrice || 0)}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400">
                      No purchases yet
                    </div>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Button for Quick Bidding */}
      {auction.status === "live" && auction.userRole === "team-owner" && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => {
              // Scroll to bidding section
              const biddingSection = document.querySelector(
                "[data-bidding-section]"
              );
              if (biddingSection) {
                biddingSection.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="bg-green-600 hover:bg-green-700 text-white rounded-full w-16 h-16 shadow-lg animate-pulse"
            size="lg"
          >
            <Gavel className="w-6 h-6" />
          </Button>
        </div>
      )}
      {/* Team Players Won Section */}
      <Card className="bg-gray-900/50">
        <CardHeader>
          <CardTitle>Your Squad ({getWonPlayersCount()} players)</CardTitle>
        </CardHeader>
        <CardContent>
          {myTeam?.playersWon && myTeam.playersWon.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {myTeam.playersWon.map((player: any) => (
                <Card key={player._id} className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={player.image} />
                        <AvatarFallback>{player.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm">{player.name}</h4>
                        <Badge variant="secondary" className="text-xs">{player.role}</Badge>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sold Price:</span>
                        <span className="text-green-400 font-medium">
                          {formatCurrency(player.soldPrice || player.basePrice)}
                        </span>
                      </div>
                      {player.stats && (
                        <>
                          {player.stats.runs && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Runs:</span>
                              <span className="text-blue-400">{player.stats.runs}</span>
                            </div>
                          )}
                          {player.stats.wickets && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Wickets:</span>
                              <span className="text-purple-400">{player.stats.wickets}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Players Won Yet</h3>
              <p className="text-gray-500">Start bidding to build your squad!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Sold Congratulation Modal */}
      <PlayerSoldModal
        isOpen={playerSoldModal.isOpen}
        onClose={() => setPlayerSoldModal(prev => ({ ...prev, isOpen: false }))}
        playerName={playerSoldModal.playerName}
        teamName={playerSoldModal.teamName}
        playerImage={playerSoldModal.playerImage}
        teamLogo={playerSoldModal.teamLogo}
        amount={playerSoldModal.amount}
      />
    </div>
  );
} 