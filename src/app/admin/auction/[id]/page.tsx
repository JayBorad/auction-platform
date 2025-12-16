"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Shuffle,
  Gavel,
  Users,
  Trophy,
  ArrowLeft,
  Activity,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { amountToLakh, lakhToAmount, formatCurrency } from '@/lib/format';
import { useWebSocket } from "@/context/WebSocketContext";

interface Player {
  _id: string;
  name: string;
  role: string;
  basePrice: number;
  image?: string;
  age: number;
  runs?: number;
  wickets?: number;
  battingStrikeRate?: number;
  bowlingAverage?: number;
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
}

interface AuctionDetails {
  _id: string;
  name: string;
  tournament: {
    _id: string;
    name: string;
    description: string;
  };
  status: string;
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
  participants: Array<{
    team: Team;
    remainingBudget: number;
    playersWon: Player[];
  }>;
  playerQueue: Player[];
  rules: {
    maxBidIncrement: number;
    bidTimeout: number;
    maxPlayersPerTeam: number;
    maxForeignPlayers: number;
  };
  recentBids: Bid[];
}

interface Bid {
  _id: string;
  bidderName: string;
  amount: number;
  timestamp: string;
  status: "active" | "outbid" | "won";
}

export default function AdminAuctionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params?.id as string;

  const [auction, setAuction] = useState<AuctionDetails | null>(null);
  const [recentBids, setRecentBids] = useState<Bid[]>([]);
  const [currentPlayerBids, setCurrentPlayerBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("live");
  const [bidAmount, setBidAmount] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<any[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState<any[]>([]);
  const [isControlling, setIsControlling] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [hammerCount, setHammerCount] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lastPromptedProcessedCount, setLastPromptedProcessedCount] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const { wsManager } = useWebSocket();

  useEffect(() => {
    if (!auctionId) return;

    wsManager.joinAuction(auctionId);
  
    const handleAuctionEvent = (event: any) => {
      if (event.auctionId === auctionId) {
        switch (event.type) {
          case 'bid_placed':
            // Update auction data when new bid is placed
            fetchAuctionDetails();
            // Reset timer to 30 seconds on any bid
            setTimeRemaining(30);
            setIsTimerActive(true);
            break;
          case 'player_changed':
            // Update when current player changes
            fetchAuctionDetails();
            // Reset and start timer for new player
            setTimeRemaining(30);
            setIsTimerActive(true);
            break;
          case 'auction_started':
            // Update auction status
            fetchAuctionDetails();
            // Start timer when auction begins
            setTimeRemaining(30);
            setIsTimerActive(true);
            break;
          case 'auction_ended':
            // Update auction status
            fetchAuctionDetails();
            setIsTimerActive(false);
            break;
          case 'auction_paused':
            // Update auction status when paused
            fetchAuctionDetails();
            setTimeRemaining(0);
            setIsTimerActive(false);
            break;
          case 'auction_resumed':
            // Update auction status when resumed
            fetchAuctionDetails();
            // Reset timer to 30 seconds when resuming
            setTimeRemaining(30);
            setIsTimerActive(true);
            break;
          case 'timer_sync':
            // Synchronize timer with server
            if (event.data && typeof event.data.timeLeft === 'number') {
              setTimeRemaining(event.data.timeLeft);
              setIsTimerActive(event.data.timeLeft > 0);
            }
            break;
        }
      }
    };
  
    const cleanup = wsManager.onAuctionEvent(handleAuctionEvent);
  
    return () => {
      cleanup();
      wsManager.leaveAuction(auctionId);
    };
  }, [auctionId]);

  // Timer effect for bid countdown (client-side countdown)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      auction?.status === "live" &&
      auction?.currentPlayer &&
      isTimerActive &&
      timeRemaining > 0
    ) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev > 0 ? prev - 1 : 0;
          // Sync timer every 5 seconds to prevent drift
          if (newTime % 5 === 0 && newTime > 0) {
            wsManager.syncTimer(auctionId, newTime);
          }
          return newTime;
        });
      }, 1000);
    } else if (
      auction?.status === "live" &&
      auction?.currentPlayer &&
      isTimerActive &&
      timeRemaining === 0
    ) {
      // Timer reached 0, automatically finalize the sale
      finalizeByCurrentBid();
    }
    return () => clearInterval(interval);
  }, [auction?.status, auction?.currentPlayer, isTimerActive, timeRemaining, auctionId, wsManager]);

  useEffect(() => {
    if (auctionId && auctionId !== "undefined") {
      fetchAuctionDetails();
      fetchAvailablePlayers();
      fetchUnsoldPlayers();
    }
  }, [auctionId]);

  // Fetch available teams after auction data is loaded
  useEffect(() => {
    if (auction?.tournament?._id) {
      fetchAvailableTeams();
      fetchTournamentTeams();
    }
  }, [auction?.tournament?._id]);

  // Effect to detect when player queue becomes empty and show completion modal
  useEffect(() => {
    const currentProcessedCount = (auction?.soldPlayers || 0) + (auction?.unsoldPlayers || 0);

    if (
      auction?.playerQueue &&
      auction.playerQueue.length === 0 &&
      auction?.currentPlayer === null &&
      currentProcessedCount > 0 &&
      currentProcessedCount > lastPromptedProcessedCount &&
      !showCompletionModal &&
      auction?.status !== "completed"
    ) {
      setShowCompletionModal(true);
      setLastPromptedProcessedCount(currentProcessedCount);
    }
  }, [auction?.playerQueue?.length, auction?.currentPlayer, auction?.soldPlayers, auction?.unsoldPlayers, showCompletionModal, lastPromptedProcessedCount, auction?.status]);

  const fetchTournamentTeams = async () => {
    try {
      if (!auction?.tournament?._id) {
        return;
      }

      const response = await fetch(
        `/api/tournaments/${auction.tournament._id}`
      );
      const data = await response.json();

      if (data.success && data.data.tournament) {
        const tournament = data.data.tournament;
        if (
          tournament.participatingTeams &&
          tournament.participatingTeams.length > 0
        ) {
          const teams = tournament.participatingTeams
            .map((participant: any) => participant.team)
            .filter((team: any) => team && team._id);
          setTournamentTeams(teams);
        } else {
          setTournamentTeams([]);
        }
      } else {
        toast.error("Failed to fetch tournament teams");
        setTournamentTeams([]);
      }
    } catch (error) {
      console.error("Error fetching tournament teams:", error);
      toast.error("Failed to fetch tournament teams");
      setTournamentTeams([]);
    }
  };

  // Timer effect for bid countdown
  // useEffect(() => {
  //   let interval: NodeJS.Timeout;
  //   if (
  //     auction?.status === "live" &&
  //     auction?.currentPlayer &&
  //     timeRemaining > 0
  //   ) {
  //     interval = setInterval(() => {
  //       setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
  //     }, 1000);
  //   }
  //   return () => clearInterval(interval);
  // }, [auction?.status, auction?.currentPlayer, timeRemaining]);

  const fetchAvailableTeams = async () => {
    try {
      // Fetch all teams
      const response = await fetch("/api/teams?limit=1000"); // Get all teams without pagination
      const data = await response.json();
      console.log("data.....", data);
      if (data.success) {
        setAvailableTeams(data.data || []); // API returns teams directly in data, not data.teams
      } else {
        toast.error("Failed to fetch teams");
        setAvailableTeams([]);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to fetch teams");
      setAvailableTeams([]);
    }
  };

  const fetchAvailablePlayers = async () => {
    try {
      const response = await fetch("/api/players");
      const data = await response.json();
      if (data.success) {
        setAvailablePlayers(data.data.players || []);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  const fetchUnsoldPlayers = async () => {
    try {
      if (!auctionId) return;
      const response = await fetch(`/api/auctions/${auctionId}/players`);
      const data = await response.json();
      if (data.success) {
        setUnsoldPlayers(data.data.unsoldPlayersForAuction || []);
      }
    } catch (error) {
      console.error("Error fetching unsold players:", error);
    }
  };

  const fetchAuctionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/auctions/${auctionId}`);
      const data = await response.json();

      if (data.success) {
        setAuction(data.data.auction);
        setRecentBids(data.data.recentBids || []);
        setCurrentPlayerBids(data.data.currentPlayerBids || []);
      } else {
        toast.error("Failed to load auction details");
      }
    } catch (error) {
      console.error("Error fetching auction details:", error);
      toast.error("Failed to load auction details");
    } finally {
      setLoading(false);
    }
  };

  const handleAuctionControl = async (action: string, playerId?: string) => {
    try {
      setIsControlling(true);
      const response = await fetch(`/api/auctions/${auctionId}/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, playerId }),
      });

      const data = await response.json();

      if (data.success) {
        setAuction(data.data);
        toast.success(data.message);

        // Reset timer on player change
        if (
          ["next-player", "skip-player", "set-current-player"].includes(action)
        ) {
          setHammerCount(0);
          setTimeRemaining(30);
          setIsTimerActive(true);
          await fetchAuctionDetails();
          await fetchUnsoldPlayers();
        }
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error(`Error ${action}:`, error);
      toast.error(`Failed to ${action}`);
    } finally {
      setIsControlling(false);
    }
  };

  const handleAddTeamToTournament = async (teamId: string) => {
    if (!teamId || !auction?.tournament?._id) return;

    try {
      setIsControlling(true);
      const response = await fetch(
        `/api/tournaments/${auction.tournament._id}/teams`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ teamId }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Team added to tournament");
        fetchTournamentTeams();
        setSelectedTeam("");
      } else {
        toast.error(data.error || "Failed to add team to tournament");
      }
    } catch (error) {
      console.error("Error adding team to tournament:", error);
      toast.error("Failed to add team to tournament");
    } finally {
      setIsControlling(false);
    }
  };

  const handleContinueWithUnsoldPlayers = async () => {
    if (!auctionId || !unsoldPlayers.length) return;

    try {
      setIsControlling(true);
      setShowCompletionModal(false);

      const wasLive = auction?.status === "live";
      
      // If auction is live, pause it first
      if (wasLive) {
        const pauseResponse = await fetch(`/api/auctions/${auctionId}/control`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "pause" }),
        });

        const pauseData = await pauseResponse.json();
        if (!pauseData.success) {
          toast.error("Failed to pause auction");
          return;
        }
        
        // Update auction state after pause
        setAuction(pauseData.data);
      }

      // Update player statuses from unsold back to available
      const updateResults = await Promise.all(
        unsoldPlayers.map(async (player) => {
          try {
            const playerResponse = await fetch(`/api/players/${player._id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: "available",
                action: "requeue_unsold",
                auctionId: auctionId,
              }),
            });

            if (!playerResponse.ok) {
              const errorData = await playerResponse.json();
              console.warn(`Failed to update status for player ${player.name}:`, errorData.error);
              return { success: false, player: player.name };
            }
            
            const data = await playerResponse.json();
            return { success: true, player: player.name };
          } catch (error) {
            console.warn(`Error updating player ${player.name}:`, error);
            return { success: false, player: player.name };
          }
        })
      );

      // Check if all player updates were successful
      const failedUpdates = updateResults.filter(result => !result.success);
      if (failedUpdates.length > 0) {
        toast.error(`Failed to update ${failedUpdates.length} player(s): ${failedUpdates.map(r => r.player).join(', ')}`);
        return;
      }

      // Add all unsold players to the queue
      const playerIds = unsoldPlayers.map(player => player._id);
      const response = await fetch(`/api/auctions/${auctionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerQueue: playerIds,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAuction(data.data);
        toast.success(`Added ${unsoldPlayers.length} unsold players back to queue`);
        
        // If auction was live before, resume it
        if (wasLive) {
          const resumeResponse = await fetch(`/api/auctions/${auctionId}/control`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "resume" }),
          });

          const resumeData = await resumeResponse.json();
          if (resumeData.success) {
            setAuction(resumeData.data);
            toast.success("Auction resumed with unsold players");
          } else {
            toast.error("Failed to resume auction");
          }
        }
        
        // Wait for unsold players list to be refreshed
        await fetchUnsoldPlayers();
      } else {
        toast.error(data.error || "Failed to add unsold players to queue");
        
        // If we paused the auction but failed to update queue, resume it back
        if (wasLive) {
          await fetch(`/api/auctions/${auctionId}/control`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "resume" }),
          });
        }
      }
    } catch (error) {
      console.error("Error continuing with unsold players:", error);
      toast.error("Failed to continue with unsold players");
    } finally {
      setIsControlling(false);
    }
  };

  const handleCompleteAuction = async () => {
    if (!auctionId) return;

    try {
      setIsControlling(true);
      setShowCompletionModal(false);
      

      const response = await fetch(`/api/auctions/${auctionId}/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "stop" }),
      });

      const data = await response.json();
      if (data.success) {
        setAuction(data.data);
        toast.success("Auction completed successfully");
      } else {
        toast.error(data.error || "Failed to complete auction");
      }
    } catch (error) {
      console.error("Error completing auction:", error);
      toast.error("Failed to complete auction");
    } finally {
      setIsControlling(false);
    }
  };

  const handleAddTeamToAuction = async (teamId: string) => {
    if (!teamId) return;

    try {
      setIsControlling(true);
      const response = await fetch(`/api/auctions/${auctionId}/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamId }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Team added to auction");
        fetchAuctionDetails();
        setSelectedTeam("");
      } else {
        toast.error(data.error || "Failed to add team to auction");
      }
    } catch (error) {
      console.error("Error adding team to auction:", error);
      toast.error("Failed to add team to auction");
    } finally {
      setIsControlling(false);
    }
  };

  const handleRemoveTeamFromAuction = async (teamId: string) => {
    try {
      setIsControlling(true);
      const response = await fetch(`/api/auctions/${auctionId}/teams`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamId }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Team removed from auction");
        fetchAuctionDetails();
      } else {
        toast.error(data.error || "Failed to remove team");
      }
    } catch (error) {
      console.error("Error removing team:", error);
      toast.error("Failed to remove team");
    } finally {
      setIsControlling(false);
    }
  };

  const handleAddPlayerToQueue = async (playerId: string) => {
    try {
      // First, add player to auction queue
      const response = await fetch(`/api/auctions/${auctionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerQueue: [
            ...(auction?.playerQueue || []).map((p) => p._id),
            playerId,
          ],
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAuction(data.data);
        
        // Also add player to tournament if tournament exists
        if (auction?.tournament?._id) {
          try {
            const tournamentResponse = await fetch(
              `/api/tournaments/${auction.tournament._id}/players`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ playerId }),
              }
            );

            const tournamentData = await tournamentResponse.json();
            
            if (tournamentData.success) {
              console.log("Player added to tournament successfully");
            } else {
              console.warn("Player added to auction queue but failed to add to tournament:", tournamentData.error);
              toast.error("Player added to queue but failed to add to tournament");
            }
          } catch (tournamentError) {
            console.warn("Player added to auction queue but failed to add to tournament:", tournamentError);
            toast.error("Player added to queue but failed to add to tournament");
          }
        }
        
        toast.success("Player added to queue successfully");
        fetchAvailablePlayers();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error adding player:", error);
      toast.error("Failed to add player to queue");
    }
  };

  const handleRemovePlayerFromQueue = async (playerId: string) => {
    try {
      setIsControlling(true);
      const response = await fetch(`/api/auctions/${auctionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerQueue: (auction?.playerQueue || [])
            .filter((p) => p._id !== playerId)
            .map((p) => p._id),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAuction(data.data);
        toast.success("Player removed from queue successfully");
        fetchAvailablePlayers();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error removing player:", error);
      toast.error("Failed to remove player from queue");
    } finally {
      setIsControlling(false);
    }
  };

  const handleManualBid = async () => {
    if (!selectedTeam || !bidAmount || !auction) return;

    // Convert from lakh to actual amount
    const amount = lakhToAmount(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid bid amount');
      return;
    }

    const minimumBid =
      (auction.currentBid?.amount || auction.currentPlayer?.basePrice || 0) +
      auction.rules.maxBidIncrement;

    if (amount < minimumBid) {
      toast.error(`Minimum bid is ${formatCurrency(minimumBid)} (${amountToLakh(minimumBid).toFixed(2)}L)`);
      return;
    }

    try {
      setIsControlling(true);
      const response = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bidder: selectedTeam,
          amount: amount,
          bidderName:
            auction.participants.find((p) => p.team._id === selectedTeam)?.team
              .name || "Unknown Team",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentPlayerBids(data.data.bidHistory || []);
        setRecentBids((prev) => [data.data.bid, ...prev.slice(0, 19)]);

        // Update auction state
        if (auction.currentPlayer) {
          const selectedParticipant = auction.participants.find(
            (p) => p.team._id === selectedTeam
          );
          if (selectedParticipant) {
            setAuction((prev) =>
              prev
                ? {
                    ...prev,
                    currentBid: {
                      amount: amount,
                      team: {
                        _id: selectedParticipant.team._id,
                        name: selectedParticipant.team.name,
                        remainingBudget: selectedParticipant.remainingBudget,
                      },
                    },
                  }
                : null
            );
          }
        }

        setBidAmount("");
        setSelectedTeam("");
        // Reset timer to 30 seconds on new bid
        setTimeRemaining(30);
        setIsTimerActive(true);
        toast.success("Bid placed successfully");
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error placing bid:", error);
      toast.error("Failed to place bid");
    } finally {
      setIsControlling(false);
    }
  };

  const finalizeSale = async () => {
    if (!selectedTeam || !bidAmount) return;
    try {
      setIsControlling(true);
      // Convert from lakh to actual amount
      const amount = lakhToAmount(bidAmount);
      const response = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidder: selectedTeam,
          amount: amount,
          finalize: true,
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchAuctionDetails();
        setCurrentPlayerBids(data.data.bidHistory || []);
        setRecentBids((prev) => [data.data.bid, ...prev.slice(0, 19)]);
        setBidAmount("");
        setSelectedTeam("");
        toast.success("Player sold and moved to next");
        await fetchUnsoldPlayers();
      } else {
        toast.error(data.error || "Failed to finalize sale");
      }
    } catch (e) {
      toast.error("Failed to finalize sale");
    } finally {
      setIsControlling(false);
    }
  };

  const finalizeByCurrentBid = async () => {
    if (!auction?.currentPlayer) return;
    const bidderId = (auction.currentBid as any)?.team?._id;
    const amount = (auction.currentBid as any)?.amount || 0;
    // If there is a valid highest bid, finalize via bid endpoint
    if (bidderId && amount > 0) {
      try {
        setIsControlling(true);
        const response = await fetch(`/api/auctions/${auctionId}/bid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bidder: bidderId, amount, finalize: true }),
        });
        const data = await response.json();
        if (data.success) {
          await fetchAuctionDetails();
          setCurrentPlayerBids(data.data.bidHistory || []);
          setRecentBids((prev) => [data.data.bid, ...prev.slice(0, 19)]);
          setBidAmount("");
          setSelectedTeam("");
          toast.success("Player sold and moved to next");
          await fetchUnsoldPlayers();
          return;
        }
      } catch (e) {
        // fall through to next-player control
      } finally {
        setIsControlling(false);
      }
    }
    // No valid highest bid → mark unsold and go next via control endpoint
    // Only call next-player if there are still players in the queue
    if (auction?.playerQueue && auction.playerQueue.length > 0) {
      await handleAuctionControl("next-player");
    }
  };

  const incrementBy = (multiplier: number) => {
    if (!auction) return;
    const base =
      auction.currentBid?.amount || auction.currentPlayer?.basePrice || 0;
    const inc = (auction.rules?.maxBidIncrement || 0) * multiplier;
    const next = base + inc;
    setBidAmount(amountToLakh(next).toFixed(2));
  };

  const stepAdjust = (direction: "up" | "down") => {
    if (!auction) return;
    const inc = auction.rules?.maxBidIncrement || 0;
    const floor =
      (auction.currentBid?.amount || auction.currentPlayer?.basePrice || 0) +
      inc;
    const currentAmount = bidAmount ? lakhToAmount(bidAmount) : floor;
    const currentNumeric = currentAmount || floor;
    const next =
      direction === "up"
        ? currentNumeric + inc
        : Math.max(floor, currentNumeric - inc);
    setBidAmount(amountToLakh(next).toFixed(2));
  };

  const handleHammer = async () => {
    if (!auction) return;
    setHammerCount((prev) => {
      const next = Math.min(prev + 1, 3);
      return next;
    });
    setTimeout(async () => {
      if (hammerCount + 1 >= 3) {
        await finalizeByCurrentBid();
        setHammerCount(0);
      }
    }, 0);
  };

  const resetHammer = () => setHammerCount(0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-red-500 animate-pulse";
      case "upcoming":
        return "bg-blue-500";
      case "paused":
        return "bg-yellow-500";
      case "completed":
        return "bg-gray-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading auction data...</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">
            Auction Not Found
          </h2>
          <Button
            onClick={() => router.push("/admin/auction")}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Auctions
          </Button>
        </div>
      </div>
    );
  }

  const completionPercentage =
    auction.totalPlayers > 0
      ? ((auction.soldPlayers + auction.unsoldPlayers) / auction.totalPlayers) *
        100
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-md text-white">
      {/* Header */}
      <div className="sticky -top-2 z-30 bg-gray-900/95 backdrop-blur-md border-b rounded-t-md border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-gray-300 hover:text-white max-md:p-1"
              >
                <ArrowLeft className="h-4 w-4 md:mr-2" />
                <p className="hidden md:block">Back</p>
              </Button>
              <div className="h-6 w-px bg-gray-600"></div>
              <div>
                <h1 className="text-xl font-bold">{auction.name}</h1>
                <p className="text-sm text-gray-400">
                  {auction?.tournament?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Badge
                className={`${getStatusColor(
                  auction.status
                )} text-white font-medium px-3 py-1`}
              >
                {auction.status === "live" && (
                  <Activity className="w-3 h-3 mr-1" />
                )}
                {auction.status.toUpperCase()}
              </Badge>
              {/* Live socket indicator can be added here later */}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="max-sm:text-xs grid w-full grid-cols-3 bg-gray-800 border border-gray-700">
            <TabsTrigger
              value="live"
              className="max-sm:text-xs data-[state=active]:bg-blue-600"
            >
              <Zap className="w-4 h-4 mr-2 max-sm:hidden" />
              Live Auction
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="max-sm:text-xs data-[state=active]:bg-blue-600"
            >
              <Users className="w-4 h-4 mr-2 max-sm:hidden" />
              Teams
            </TabsTrigger>
            <TabsTrigger
              value="players"
              className="max-sm:text-xs data-[state=active]:bg-blue-600"
            >
              <Trophy className="w-4 h-4 mr-2 max-sm:hidden" />
              Players
            </TabsTrigger>
          </TabsList>

          {/* Live Auction Tab */}
          <TabsContent value="live" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Main Auction Center */}
              <div className="lg:col-span-3 space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Current Player Card */}
                  <div className="xl:col-span-2">
                    <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 overflow-hidden">
                      <CardContent className="p-0">
                        {auction.currentPlayer ? (
                          <div className="relative">
                            {/* Background Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>

                            <div className="relative p-6 md:p-8">
                              <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center space-x-4">
                                  <Avatar className="w-14 md:w-20 h-14 md:h-20 border-4 border-white/20">
                                    <AvatarImage
                                      src={auction.currentPlayer.image}
                                    />
                                    <AvatarFallback className="text-xl md:text-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                                      {auction?.currentPlayer?.name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h2 className="text-2xl md:text-3xl font-bold mb-2">
                                      {auction.currentPlayer.name}
                                    </h2>
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                                      <Badge
                                        variant="secondary"
                                        className="bg-blue-600/20 text-blue-300 border-blue-500/30"
                                      >
                                        {auction.currentPlayer.role}
                                      </Badge>
                                      <span className="max-md:text-sm text-gray-400">
                                        Base:{" "}
                                        {formatCurrency(
                                          auction.currentPlayer.basePrice
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Timer */}
                                {auction.status === "live" && (
                                  <div className="text-center">
                                    <div
                                      className={`text-3xl font-bold ${
                                        timeRemaining <= 10
                                          ? "text-red-400 animate-pulse"
                                          : "text-blue-400"
                                      }`}
                                    >
                                      {timeRemaining}s
                                    </div>
                                    <div className="text-sm text-gray-400">
                                      Remaining
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Current Bid */}
                              {auction.currentBid && (
                                <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
                                  <div className="text-center">
                                    <p className="text-sm text-gray-400 mb-2">
                                      Current Highest Bid
                                    </p>
                                    <p className="text-4xl font-bold text-green-400 mb-2">
                                      {formatCurrency(
                                        auction.currentBid.amount
                                      )}
                                    </p>
                                    <div className="flex items-center justify-center space-x-2">
                                      <Avatar className="w-6 h-6">
                                        <AvatarImage
                                          src={auction.currentBid.team?.logo}
                                        />
                                        <AvatarFallback>
                                          {auction.currentBid.team?.name[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-blue-400 font-medium">
                                        {auction.currentBid.team?.name}
                                      </span>
                                    </div>
                                    {currentPlayerBids.length > 1 && (
                                      <div className="mt-3 text-xs text-gray-400">
                                        Previous:{" "}
                                        {formatCurrency(
                                          (currentPlayerBids[1] as any)?.amount
                                        )}{" "}
                                        by{" "}
                                        {(currentPlayerBids[1] as any)?.team
                                          ?.name ||
                                          (currentPlayerBids[1] as any)?.bidder
                                            ?.name ||
                                          "—"}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <Gavel className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-medium text-gray-400 mb-2">
                              No Active Player
                            </h3>
                            <p className="text-gray-500 mb-6">
                              Start the auction to begin bidding
                            </p>
                            {auction.status === "upcoming" && (
                              <Button
                                onClick={() => handleAuctionControl("start")}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Start Auction
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Live Controls Panel */}
                  <div className="space-y-4">
                    {/* Auction Controls */}
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader className="pb-3 max-sm:p-4">
                        <CardTitle className="text-lg">Live Controls</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 max-sm:px-4 max-sm:pb-4">
                        {auction.status === "upcoming" && (
                          <Button
                            onClick={() => handleAuctionControl("start")}
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={isControlling}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start Auction
                          </Button>
                        )}

                        {auction.status === "live" && (
                          <>
                            <Button
                              onClick={() =>
                                handleAuctionControl("next-player")
                              }
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              disabled={isControlling}
                            >
                              <SkipForward className="w-4 h-4 mr-2" />
                              Next Player
                            </Button>
                            <Button
                              onClick={() => handleAuctionControl("pause")}
                              className="w-full bg-yellow-600 hover:bg-yellow-700"
                              disabled={isControlling}
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </Button>
                            <Button
                              onClick={() => handleAuctionControl("shuffle")}
                              variant="outline"
                              className="w-full"
                              disabled={isControlling}
                            >
                              <Shuffle className="w-4 h-4 mr-2" />
                              Shuffle Queue
                            </Button>
                            <Button
                              onClick={() => handleAuctionControl("stop")}
                              className="w-full bg-red-600 hover:bg-red-700"
                              disabled={isControlling}
                            >
                              <Square className="w-4 h-4 mr-2" />
                              Stop Auction
                            </Button>
                          </>
                        )}

                        {auction.status === "paused" && (
                          <Button
                            onClick={() => handleAuctionControl("resume")}
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={isControlling}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Manual Bidding */}
                {auction.currentPlayer && auction.status === "live" && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="max-sm:p-4">
                      <CardTitle className="flex items-center">
                        <Gavel className="w-5 h-5 mr-2 text-yellow-500" />
                        Place Manual Bid
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-sm:px-4 max-sm:pb-4">
                      <div className="mb-3 text-sm text-gray-400 flex items-center gap-2">
                        <span>Current:</span>
                        <span className="text-green-400 font-medium">
                          {formatCurrency(
                            auction.currentBid?.amount ||
                              auction.currentPlayer?.basePrice ||
                              0
                          )}
                        </span>
                        {auction.currentBid?.team && (
                          <span className="flex items-center gap-1">
                            by
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={auction.currentBid.team.logo} />
                              <AvatarFallback>
                                {auction.currentBid.team.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-blue-300">
                              {auction.currentBid.team.name}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => incrementBy(1)}
                          disabled={isControlling}
                        >
                          +{formatCurrency(auction.rules.maxBidIncrement)}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => incrementBy(2)}
                          disabled={isControlling}
                        >
                          +{formatCurrency(auction.rules.maxBidIncrement * 2)}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => incrementBy(5)}
                          disabled={isControlling}
                        >
                          +{formatCurrency(auction.rules.maxBidIncrement * 5)}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <Select
                          value={selectedTeam}
                          onValueChange={setSelectedTeam}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Team" />
                          </SelectTrigger>
                          <SelectContent>
                            {auction.participants.map((participant) => (
                              <SelectItem
                                key={participant.team._id}
                                value={participant.team._id}
                              >
                                {participant.team.name} (
                                {formatCurrency(participant.remainingBudget)}{" "}
                                left)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => stepAdjust("down")}
                            disabled={isControlling}
                          >
                            -
                          </Button>
                          <div className="flex-1 relative">
                            <Input
                              className="pr-16"
                              type="number"
                              step="0.01"
                              placeholder={`Min: ${amountToLakh(
                                (auction.currentBid?.amount ||
                                  auction.currentPlayer?.basePrice ||
                                  0) + auction.rules.maxBidIncrement
                              ).toFixed(2)}L`}
                              value={bidAmount}
                              onChange={(e) => setBidAmount(e.target.value)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Lakh</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => stepAdjust("up")}
                            disabled={isControlling}
                          >
                            +
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleManualBid}
                            disabled={
                              isControlling || !selectedTeam || !bidAmount
                            }
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isControlling ? "Placing..." : "Place Bid"}
                          </Button>
                          <Button
                            onClick={finalizeSale}
                            disabled={
                              isControlling || !selectedTeam || !bidAmount
                            }
                            className="bg-yellow-600 hover:bg-yellow-700"
                          >
                            Sell & Next
                          </Button>
                        </div>
                      </div>
                      {currentPlayerBids && currentPlayerBids.length > 0 && (
                        <div className="mt-4 text-xs text-gray-400">
                          Last bid:{" "}
                          {formatCurrency((currentPlayerBids[0] as any).amount)}{" "}
                          by{" "}
                          {(currentPlayerBids[0] as any)?.team?.name ||
                            (currentPlayerBids[0] as any)?.bidder?.name ||
                            "—"}{" "}
                          at{" "}
                          {new Date(
                            (currentPlayerBids[0] as any).timestamp
                          ).toLocaleTimeString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Player Queue Preview */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="max-sm:p-4">
                    <div className="flex gap-4 flex-wrap items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Users className="w-5 h-5 mr-2 text-blue-400" />
                        Next Players ({auction?.playerQueue?.length === 0 ? 0 : auction?.playerQueue?.length - 1 || 0})
                      </CardTitle>
                      <Button
                        onClick={() => handleAuctionControl("shuffle")}
                        variant="outline"
                        size="sm"
                        disabled={isControlling}
                        className="border-gray-600 hover:bg-gray-700 max-md:h-7"
                      >
                        <Shuffle className="w-4 h-4 md:mr-2" />
                        <p className="hidden md:block">Shuffle</p>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="max-sm:px-4 max-sm:pb-4">
                    {auction?.playerQueue && auction.playerQueue.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {auction.playerQueue
                          .filter((player: any) => player._id !== auction.currentPlayer?._id)
                          .map((player: any, index: number) => {
                            const isNextPlayer = index === 0;
                            return (
                              <Card
                                key={player._id}
                                className={`bg-gradient-to-r ${
                                  isNextPlayer
                                    ? "from-blue-900/50 to-purple-900/50 border-blue-500/30"
                                    : "from-gray-700 to-gray-800 border-gray-600"
                                } transition-all duration-200 hover:shadow-lg`}
                              >
                                <CardContent className="p-2 md:p-4">
                                  <div className="flex flex-wrap gap-2 items-center justify-between">
                                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                                      {/* Position Badge */}
                                      <div className="max-sm:hidden flex flex-col items-center">
                                        <Badge
                                          variant={isNextPlayer ? "default" : "secondary"}
                                          className={`font-mono text-xs mb-1 ${
                                            isNextPlayer
                                              ? "bg-blue-600 hover:bg-blue-700"
                                              : "bg-gray-600"
                                          }`}
                                        >
                                          #{index + 1}
                                        </Badge>
                                        {isNextPlayer && (
                                          <div className="text-[10px] text-blue-300 font-medium">
                                            NEXT
                                          </div>
                                        )}
                                      </div>

                                      {/* Player Avatar */}
                                      <Avatar className="w-8 md:w-12 h-8 md:h-12 border-2 border-gray-500">
                                        <AvatarImage src={player.image} />
                                        <AvatarFallback className="max-md:text-sm bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                          {player.name?.[0]?.toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>

                                      {/* Player Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center space-x-2 mb-1">
                                          <h4 className="font-semibold text-white truncate">
                                            {player.name}
                                          </h4>
                                          <Badge
                                            variant="outline"
                                            className="w-fit text-xs border-gray-500 text-gray-300"
                                          >
                                            {player.role}
                                          </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center space-x-3 text-sm">
                                          <span className="text-green-400 font-medium">
                                            {formatCurrency(player.basePrice)}
                                          </span>
                                          <span className="text-gray-400">•</span>
                                          <span className="text-gray-400">
                                            Base Price
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex items-center gap-1 justify-between max-sm:w-full">
                                      <div className="hidden max-sm:flex flex-col items-center">
                                          <Badge
                                            variant={isNextPlayer ? "default" : "secondary"}
                                            className={`font-mono text-xs mb-1 ${
                                              isNextPlayer
                                                ? "bg-blue-600 hover:bg-blue-700"
                                                : "bg-gray-600"
                                            }`}
                                          >
                                            #{index + 1}
                                          </Badge>
                                          {isNextPlayer && (
                                            <div className="text-[10px] text-blue-300 font-medium">
                                              NEXT
                                            </div>
                                          )}
                                        </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          onClick={() =>
                                            handleAuctionControl(
                                              "set-current-player",
                                              player._id
                                            )
                                          }
                                          size="sm"
                                          disabled={isControlling}
                                          className={`${
                                            isNextPlayer
                                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                                              : "bg-gray-600 hover:bg-gray-700 text-gray-200"
                                          } transition-colors duration-200`}
                                        >
                                          <Target className="w-4 h-4" />
                                          <p className="hidden lg:block ml-2">{isNextPlayer ? "Start Now" : "Set Current"}</p>
                                        </Button>
                                        {!(
                                          auction.currentPlayer &&
                                          player._id === auction.currentPlayer._id
                                        ) && (
                                          <Button
                                            onClick={() => handleRemovePlayerFromQueue(player._id)}
                                            size="sm"
                                            variant="outline"
                                            disabled={isControlling}
                                            className="text-red-400 border-red-500 hover:bg-red-600 hover:text-white"
                                          >
                                            <Minus className="w-4 h-4" />
                                            <p className="hidden lg:block ml-2">Remove</p>
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="relative mb-4">
                          <Users className="w-16 h-16 text-gray-600 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-400 mb-2">
                          No Players in Queue
                        </h3>
                        <p className="text-gray-500 text-sm">
                          Add players below to start the auction
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>


                {/* Team Budgets */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="max-sm:p-4">
                    <CardTitle>Team Budgets</CardTitle>
                  </CardHeader>
                  <CardContent className="max-sm:px-4 max-sm:pb-4">
                    <div className="space-y-3">
                      {auction.participants.map((participant) => (
                        <div
                          key={participant.team._id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={participant.team.logo} />
                              <AvatarFallback>
                                {participant.team.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {participant.team.name}
                            </span>
                          </div>
                          <span className="text-sm text-green-400">
                            {formatCurrency(participant.remainingBudget)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Hammer Controls */}
                {auction.status === "live" && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="max-sm:p-4">
                      <CardTitle className="flex items-center">
                        <Gavel className="w-4 h-4 mr-2" />
                        Hammer
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-sm:px-4 max-sm:pb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            hammerCount >= 1 ? "bg-green-600" : "bg-gray-700"
                          }`}
                        >
                          1
                        </div>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            hammerCount >= 2 ? "bg-green-600" : "bg-gray-700"
                          }`}
                        >
                          2
                        </div>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            hammerCount >= 3 ? "bg-green-600" : "bg-gray-700"
                          }`}
                        >
                          3
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={handleHammer}
                          disabled={isControlling}
                        >
                          Hammer
                        </Button>
                        <Button
                          variant="outline"
                          onClick={resetHammer}
                          disabled={isControlling}
                        >
                          Reset
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        On 3, current lot will be finalized automatically.
                      </p>
                    </CardContent>
                  </Card>
                )}
                {/* Team Purchases */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="max-sm:p-4">
                    <CardTitle>Team Purchases</CardTitle>
                  </CardHeader>
                  <CardContent className="max-sm:px-4 max-sm:pb-4">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {auction.participants.map((participant) => (
                        <div
                          key={participant.team._id}
                          className="bg-gray-700 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={participant.team.logo} />
                                <AvatarFallback>
                                  {participant.team.name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {participant.team.name}
                              </span>
                            </div>
                            <span className="text-xs text-green-400">
                              {formatCurrency(participant.remainingBudget)} left
                            </span>
                          </div>
                          {participant.playersWon?.length ? (
                            <div className="mt-2 grid grid-cols-1 gap-1">
                              {participant.playersWon
                                .slice(0, 3)
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
                              {participant.playersWon.length > 3 && (
                                <div className="text-[10px] text-gray-400 mt-1">
                                  +{participant.playersWon.length - 3} more
                                </div>
                              )}
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
                {/* Auction Stats */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="max-sm:p-4">
                    <CardTitle>Auction Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-sm:px-4 max-sm:pb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Players Auctioned</span>
                        <span>
                          {auction.soldPlayers + auction.unsoldPlayers}/
                          {auction.totalPlayers}
                        </span>
                      </div>
                      <Progress value={completionPercentage} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-gray-700 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-400">
                          {auction.soldPlayers}
                        </div>
                        <div className="text-xs text-gray-400">Sold</div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3">
                        <div className="text-2xl font-bold text-red-400">
                          {auction.unsoldPlayers}
                        </div>
                        <div className="text-xs text-gray-400">Unsold</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Bids */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="max-sm:p-4">
                    <CardTitle>Recent Bids</CardTitle>
                  </CardHeader>
                  <CardContent className="max-sm:px-4 max-sm:pb-4">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {recentBids.slice(0, 10).map((bid, idx) => (
                        <div
                          key={`${bid._id}-${idx}`}
                          className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={bid?.bidderName} />
                              <AvatarFallback>
                                {bid?.bidderName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">
                                {bid?.bidderName}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(bid?.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-green-400 font-medium">
                            {formatCurrency(bid?.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="max-sm:p-4">
                  <CardTitle>Teams Overview</CardTitle>
                </CardHeader>
                <CardContent className="max-sm:px-4 max-sm:pb-4">
                  <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-400">
                        {auction.participants.length}
                      </div>
                      <div className="text-sm text-gray-400">In Auction</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-400">
                        {tournamentTeams.length}
                      </div>
                      <div className="text-sm text-gray-400">In Tournament</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-2xl font-bold text-yellow-400">
                        {availableTeams.length}
                      </div>
                      <div className="text-sm text-gray-400">Total Teams</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Tournament Teams */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="max-sm:p-4">
                <CardTitle>Tournament Teams</CardTitle>
                <CardDescription>
                  Teams participating in the tournament
                </CardDescription>
              </CardHeader>
              <CardContent className="max-sm:px-4 max-sm:pb-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {tournamentTeams.map((team) => {
                    const isInAuction = auction?.participants?.some(
                      (p) => p.team._id === team._id
                    );
                    const participant = auction?.participants?.find(
                      (p) => p.team._id === team._id
                    );
                    return (
                      <Card
                        key={team._id}
                        className={`bg-gray-700 border-gray-600 ${
                          isInAuction ? "ring-2 ring-green-500" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-wrap gap-2  items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage src={team.logo} />
                                <AvatarFallback>{team.name[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{team.name}</p>
                                {isInAuction ? (
                                  <>
                                    <p className="text-sm text-green-400">
                                      {formatCurrency(
                                        auction.participants.find(
                                          (p) => p.team._id === team._id
                                        )?.remainingBudget || 0
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {auction.participants.find(
                                        (p) => p.team._id === team._id
                                      )?.playersWon.length || 0}{" "}
                                      players
                                    </p>
                                  </>
                                ) : (
                                  <Badge variant="secondary" className="mt-1">
                                    Not in Auction
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {isInAuction ? (
                              <Button
                                className="ml-auto"
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleRemoveTeamFromAuction(team._id)
                                }
                                disabled={
                                  isControlling || auction.status !== "upcoming"
                                }
                              >
                                Remove
                              </Button>
                            ) : (
                              <Button
                                className="ml-auto"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddTeamToAuction(team._id)}
                                disabled={
                                  isControlling || auction.status !== "upcoming"
                                }
                              >
                                Add
                              </Button>
                            )}
                          </div>
                          {participant?.playersWon?.length ? (
                            <div className="mt-3 space-y-2">
                              {participant.playersWon.map((p: any) => (
                                <div
                                  key={p._id}
                                  className="flex items-center justify-between text-xs text-gray-300 bg-gray-800 rounded p-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-5 h-5">
                                      <AvatarImage src={p.image} />
                                      <AvatarFallback>
                                        {p.name?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate max-w-[140px]">
                                      {p.name}
                                    </span>
                                  </div>
                                  <span className="text-blue-300">
                                    {formatCurrency((p as any)?.soldPrice || 0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-gray-400">
                              No purchases yet
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Add Team */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="max-sm:p-4">
                <CardTitle>Add Team</CardTitle>
                <CardDescription>
                  Add teams to tournament and auction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-sm:px-4 max-sm:pb-4">
                <div>
                  <Select
                    value={selectedTeam}
                    onValueChange={setSelectedTeam}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams.map((team) => {
                        const isInTournament = tournamentTeams.some(
                          (t) => t._id === team._id
                        );
                        const isInAuction = auction?.participants?.some(
                          (p) => p.team._id === team._id
                        );
                        return (
                          <SelectItem key={team._id} value={team._id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{team.name}</span>
                              <div className="flex gap-1">
                                {isInTournament && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    In Tournament
                                  </Badge>
                                )}
                                {isInAuction && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    In Auction
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAddTeamToTournament(selectedTeam)}
                    disabled={!selectedTeam || isControlling}
                    className="flex-1"
                    variant="outline"
                  >
                    Add to Tournament
                  </Button>
                  <Button
                    onClick={() => handleAddTeamToAuction(selectedTeam)}
                    disabled={!selectedTeam || isControlling}
                    className="flex-1"
                  >
                    Add to Auction
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* All Teams & Purchases */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="max-sm:p-4">
                <CardTitle>All Teams & Purchases</CardTitle>
                <CardDescription>
                  Overview of every team and their bought players in this
                  auction
                </CardDescription>
              </CardHeader>
              <CardContent className="max-sm:px-4 max-sm:pb-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {availableTeams.map((team) => {
                    const participant = auction.participants.find(
                      (p) => p.team._id === team._id
                    );
                    return (
                      <Card
                        key={team._id}
                        className="bg-gray-700 border-gray-600"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar>
                                <AvatarImage src={team.logo} />
                                <AvatarFallback>{team.name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{team.name}</span>
                            </div>
                            {participant ? (
                              <span className="text-xs text-green-400">
                                {formatCurrency(participant.remainingBudget)}{" "}
                                left
                              </span>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Not in Auction
                              </Badge>
                            )}
                          </div>
                          {participant?.playersWon?.length ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {participant.playersWon.map((p: any) => (
                                <div
                                  key={p._id}
                                  className="flex items-center justify-between text-xs text-gray-300 bg-gray-800 rounded p-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-5 h-5">
                                      <AvatarImage src={p.image} />
                                      <AvatarFallback>
                                        {p.name?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate max-w-[140px]">
                                      {p.name}
                                    </span>
                                  </div>
                                  <span className="text-blue-300">
                                    {formatCurrency((p as any)?.soldPrice || 0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">
                              No purchases yet
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players" className="space-y-6">
            {/* Quick Sell Current Player */}
            {auction.currentPlayer && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="max-sm:p-4">
                  <CardTitle>Sell Current Player to Team</CardTitle>
                  <CardDescription>
                    Select team and price to finalize the sale
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-sm:px-4 max-sm:pb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                    <Select
                      value={selectedTeam}
                      onValueChange={setSelectedTeam}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Team" />
                      </SelectTrigger>
                      <SelectContent>
                        {auction.participants.map((participant) => (
                          <SelectItem
                            key={participant.team._id}
                            value={participant.team._id}
                          >
                            {participant.team.name} (
                            {formatCurrency(participant.remainingBudget)} left)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => stepAdjust("down")}
                        disabled={isControlling}
                      >
                        -
                      </Button>
                      <Input
                        className="flex-1"
                        type="number"
                        placeholder={`Min: ${formatCurrency(
                          (auction.currentBid?.amount ||
                            auction.currentPlayer?.basePrice ||
                            0) + (auction.rules?.maxBidIncrement || 0)
                        )}`}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => stepAdjust("up")}
                        disabled={isControlling}
                      >
                        +
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={finalizeSale}
                        disabled={isControlling || !selectedTeam || !bidAmount}
                        className="bg-yellow-600 hover:bg-yellow-700 w-full"
                      >
                        Sell to Team
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Player Queue */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="max-sm:p-4">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div>
                    <CardTitle>
                      Player Queue ({auction?.playerQueue?.length || 0})
                    </CardTitle>
                    <CardDescription>
                      Manage the auction queue order
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => handleAuctionControl("shuffle")}
                    variant="outline"
                    disabled={isControlling}
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Shuffle
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="max-sm:px-4 max-sm:pb-4">
                {(() => {
                  const combinedQueue = auction?.currentPlayer
                    ? [
                        auction.currentPlayer,
                        ...(auction.playerQueue || []).filter(
                          (p: any) => p._id !== auction.currentPlayer?._id
                        ),
                      ]
                    : auction?.playerQueue || [];
                  return combinedQueue.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {combinedQueue.map((player: any, index: number) => (
                        <div
                          key={player._id}
                          className="flex flex-wrap gap-2 items-center justify-between p-4 bg-gray-700 rounded-lg"
                        >
                          <div className="flex flex-wrap items-center gap-1 lg:gap-4">
                            <Badge
                              variant={index === 0 ? "default" : "secondary"}
                              className="font-mono max-sm:hidden"
                            >
                              #{index + 1}
                            </Badge>
                            <Avatar>
                              <AvatarImage src={player.image} />
                              <AvatarFallback>{player.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex flex-wrap items-center space-y-1 space-x-2">
                                <span className="font-medium">
                                  {player.name}
                                </span>
                                <Badge variant="outline">{player.role}</Badge>
                                {auction.currentPlayer &&
                                  player._id === auction.currentPlayer._id && (
                                    <Badge className="bg-green-600">
                                      Current
                                    </Badge>
                                  )}
                              </div>
                              <p className="text-sm text-gray-400">
                                Base: {formatCurrency(player.basePrice)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between max-sm:w-full gap-2">
                            <Badge
                              variant={index === 0 ? "default" : "secondary"}
                              className="font-mono block sm:hidden"
                            >
                              #{index + 1}
                            </Badge>
                            <div className="flex space-x-2">
                              {auction.status === "live" &&
                                auction.currentPlayer &&
                                player._id === auction.currentPlayer._id && (
                                  <Button
                                    onClick={() =>
                                      handleAuctionControl("next-player")
                                    }
                                    size="sm"
                                    disabled={isControlling}
                                  >
                                    <SkipForward className="w-4 h-4 mr-1" />
                                    Next
                                  </Button>
                                )}
                              {!(
                                auction.currentPlayer &&
                                player._id === auction.currentPlayer._id
                              ) && (
                                <>
                                  <Button
                                    onClick={() =>
                                      handleAuctionControl(
                                        "set-current-player",
                                        player._id
                                      )
                                    }
                                    size="sm"
                                    variant="outline"
                                    disabled={isControlling}
                                  >
                                    <Target className="w-4 h-4 " />
                                    <p className="hidden lg:block ml-1">Set Current</p>
                                  </Button>
                                  <Button
                                    onClick={() => handleRemovePlayerFromQueue(player._id)}
                                    size="sm"
                                    variant="outline"
                                    disabled={isControlling}
                                    className="text-red-400 border-red-500 hover:bg-red-600 hover:text-white"
                                  >
                                    <Minus className="w-4 h-4" />
                                    <p className="hidden lg:block ml-1">Remove</p>
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400">
                        No Players in Queue
                      </h3>
                      <p className="text-gray-500">
                        Add players to start the auction
                      </p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Unsold Players (for this auction) */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="max-sm:p-4">
                <CardTitle>Unsold Players</CardTitle>
                <CardDescription>
                  Players marked unsold in this auction
                </CardDescription>
              </CardHeader>
              <CardContent className="max-sm:px-4 max-sm:pb-4">
                {unsoldPlayers.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {unsoldPlayers.map((player: any) => (
                      <Card
                        key={player._id}
                        className="bg-gray-700 border-gray-600"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={player.image} />
                              <AvatarFallback>{player.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm">
                                  {player.name}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  Unsold
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-400">
                                {player.role}
                              </p>
                              <p className="text-xs text-red-400">
                                Base: {formatCurrency(player.basePrice)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No unsold players yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Players */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="max-sm:p-4">
                <CardTitle>Add Players to Queue</CardTitle>
                <CardDescription>Select from available players</CardDescription>
              </CardHeader>
              <CardContent className="max-sm:px-4 max-sm:pb-4">
                <div className="mb-4">
                  <Select
                    onValueChange={(playerId) =>
                      handleAddPlayerToQueue(playerId)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Player to Add" />
                    </SelectTrigger>
                    <SelectContent>
                    {availablePlayers
                        .filter(
                          (player) => {
                            const isInQueue = auction?.playerQueue?.some(
                              (p) => p._id === player._id
                            );
                            const isCurrent = auction?.currentPlayer?._id === player._id;
                            const isSold = auction?.participants?.some((participant) =>
                              participant.playersWon?.some((p) => p._id === player._id)
                            );
                            const isUnsold = unsoldPlayers.some(
                              (p) => p._id === player._id
                            );
                            return !isInQueue && !isSold && !isUnsold && !isCurrent;
                          }
                        )
                        .map((player) => (
                          <SelectItem key={player._id} value={player._id}>
                            {player.name} - {player.role} (
                            {formatCurrency(player.basePrice)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-96 p-0.5 overflow-y-auto">
                  {availablePlayers.slice(0, 12).map((player: any) => {
                    const isInQueue = auction?.playerQueue?.some(
                      (p) => p._id === player._id
                    );
                    const isCurrent =
                      auction?.currentPlayer?._id === player._id;
                    const isSold = auction?.participants?.some((participant)=>
                      participant.playersWon?.some((p)=> p._id === player._id))
                    const isUnsold = unsoldPlayers.some(
                      (p) => p._id === player._id
                    );

                    return (
                      <Card
                        key={player._id}
                        className={`bg-gray-700 border-gray-600 ${
                          isCurrent ? "ring-2 ring-green-500" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={player.image} />
                              <AvatarFallback>{player.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center flex-wrap space-y-1 space-x-2 mb-1">
                                <span className="font-medium text-sm">
                                  {player.name}
                                </span>
                                {isCurrent && (
                                  <Badge className="bg-green-600 text-xs">
                                    Current
                                  </Badge>
                                )}
                                {isSold && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-red-600 text-white"
                                  >
                                    Sold
                                  </Badge>
                                )}
                                {!isSold && isUnsold && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-orange-600 text-white"
                                  >
                                    Unsold
                                  </Badge>
                                )}
                                {!isSold && !isUnsold && isInQueue && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Queued
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                {player.role}
                              </p>
                              <p className="text-xs text-green-400">
                                {formatCurrency(player.basePrice)}
                              </p>
                            </div>
                            <Button
                              onClick={() => handleAddPlayerToQueue(player._id)}
                              size="sm"
                              variant="outline"
                              disabled={isInQueue || isCurrent || isSold || isUnsold}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* All Teams & Purchases */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="max-sm:p-4">
                <CardTitle>All Teams & Purchases</CardTitle>
                <CardDescription>
                  Overview of every team and their bought players in this
                  auction
                </CardDescription>
              </CardHeader>
              <CardContent className="max-sm:px-4 max-sm:pb-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {availableTeams.map((team) => {
                    const participant = auction.participants.find(
                      (p) => p.team._id === team._id
                    );
                    return (
                      <Card
                        key={team._id}
                        className="bg-gray-700 border-gray-600"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar>
                                <AvatarImage src={team.logo} />
                                <AvatarFallback>{team.name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{team.name}</span>
                            </div>
                            {participant ? (
                              <span className="text-xs text-green-400">
                                {formatCurrency(participant.remainingBudget)}{" "}
                                left
                              </span>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Not in Auction
                              </Badge>
                            )}
                          </div>
                          {participant?.playersWon?.length ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {participant.playersWon.map((p: any) => (
                                <div
                                  key={p._id}
                                  className="flex items-center justify-between text-xs text-gray-300 bg-gray-800 rounded p-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-5 h-5">
                                      <AvatarImage src={p.image} />
                                      <AvatarFallback>
                                        {p.name?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate max-w-[140px]">
                                      {p.name}
                                    </span>
                                  </div>
                                  <span className="text-blue-300">
                                    {formatCurrency((p as any)?.soldPrice || 0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">
                              No purchases yet
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
      </div>

      {/* Auction Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="sm:max-w-md bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Auction Queue Completed
            </DialogTitle>
            <DialogDescription>
              {unsoldPlayers.length > 0 ? (
                <>
                  All players have been processed. You have {unsoldPlayers.length} unsold player(s) 
                  remaining. What would you like to do?
                </>
              ) : (
                <>
                  All players have been processed successfully! All players were either sold or 
                  went unsold. Would you like to complete the auction?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {unsoldPlayers.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {unsoldPlayers.length} player(s) went unsold
                  </span>
                </div>
              </div>
            )}
            
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p><strong>Continue with Unsold Players:</strong> Adds all {unsoldPlayers.length} unsold player(s) back to the auction queue for another round</p>
              <p><strong>Complete Auction:</strong> Ends the auction with current results</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            {unsoldPlayers.length > 0 && (
              <Button
                onClick={handleContinueWithUnsoldPlayers}
                disabled={isControlling}
                className="flex-1"
              >
                Continue with {unsoldPlayers.length} Unsold Player{unsoldPlayers.length !== 1 ? 's' : ''}
              </Button>
            )}
            <Button
              onClick={handleCompleteAuction}
              disabled={isControlling}
              variant={unsoldPlayers.length === 0 ? "default" : "outline"}
              className={unsoldPlayers.length === 0 ? "flex-1" : "flex-1"}
            >
              Complete Auction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
