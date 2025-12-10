"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Play,
  Pause,
  Square,
  Gavel,
  Timer,
  DollarSign,
  Users,
  Trophy,
  TrendingUp,
  Eye,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { amountToLakh, lakhToAmount, formatCurrency } from '@/lib/format';

interface AuctionEvent {
  _id: string;
  name: string;
  tournament:
    | {
        _id: string;
        name: string;
      }
    | string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "live" | "paused" | "completed" | "cancelled";
  totalBudget: number;
  totalPlayers: number;
  soldPlayers: number;
  unsoldPlayers: number;
  currentPlayer?: {
    _id: string;
    name: string;
    role: string;
    basePrice: number;
    image?: string;
  };
  currentBid?: {
    amount: number;
    bidder: string;
    bidderName: string;
  };
  participants: Array<{
    team: {
      _id: string;
      name: string;
    };
    remainingBudget: number;
    playersWon: string[];
  }>;
  createdAt: string;
}

interface BidHistory {
  _id: string;
  auction: string;
  player: {
    _id: string;
    name: string;
    role: string;
  };
  bidder: {
    _id: string;
    name: string;
  };
  bidderName: string;
  amount: number;
  timestamp: string;
  status: "active" | "won" | "outbid";
}

interface AuctionStats {
  totalAuctions: number;
  liveAuctions: number;
  totalRevenue: number;
  averageBid: number;
  topBid: number;
  mostExpensivePlayer: string;
}

export default function AuctionPage() {
  const [auctions, setAuctions] = useState<AuctionEvent[]>([]);
  const [bidHistory, setBidHistory] = useState<BidHistory[]>([]);
  const [stats, setStats] = useState<AuctionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<AuctionEvent | null>(
    null
  );
  const [bidAmount, setBidAmount] = useState("");
  const [bidder, setBidder] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    tournament: "",
    startDate: "",
    endDate: "",
    totalBudget: "",
  });
  const [tournaments, setTournaments] = useState<
    Array<{ _id: string; name: string; description?: string; status?: string }>
  >([]);
  const [teams, setTeams] = useState<Array<{ _id: string; name: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const router = useRouter();

  const debouncedSearchTerm = useDebounce(searchTerm, 1000);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants:any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const fetchTournaments = async () => {
    try {
      const response = await fetch("/api/tournaments?limit=100");
      const data = await response.json();

      if (data.success) {
        setTournaments(data.data.tournaments || []);
      }
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams");
      const data = await response.json();

      if (data.success) {
        setTeams(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const fetchAuctions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
      params.append("page", currentPage.toString());
      params.append("limit", pageSize.toString());

      const url = `/api/auctions?${params}`;

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setAuctions(data.data.auctions || []);
        setTotalItems(data.data.pagination?.totalItems || 0);
        setTotalPages(data.data.pagination?.totalPages || 1);
        setStats({
          totalAuctions: data.data.stats.totalAuctions || 0,
          liveAuctions: data.data.stats.liveAuctions || 0,
          totalRevenue: data.data.stats.totalBudget || 0,
          averageBid:
            data.data.stats.totalBudget > 0
              ? data.data.stats.totalBudget / data.data.stats.totalAuctions
              : 0,
          topBid: 25000000, // This would come from bids API
          mostExpensivePlayer: "Loading...",
        });
      } else {
        console.error("API Error:", data.error);
        toast.error("Failed to load auctions");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      if (error instanceof Error && error.name === "AbortError") {
        toast.error("Request timed out - please try again");
      } else {
        toast.error("Failed to load auctions");
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearchTerm, currentPage, pageSize]);

  // Fetch data from API
  useEffect(() => {
    fetchAuctions();
    fetchTournaments();
    fetchTeams();
  }, [fetchAuctions]);

  // Fetch bid history when auctions change
  useEffect(() => {
    if (auctions.length > 0) {
      fetchBidHistory();
    }
  }, [auctions]);

  const fetchBidHistory = async () => {
    try {
      // For now, we'll fetch from the first live auction
      const liveAuction = auctions.find((a) => a.status === "live");
      if (liveAuction) {
        const response = await fetch(`/api/auctions/${liveAuction._id}/bid`);
        const data = await response.json();

        if (data.success) {
          setBidHistory(data.data.bids || []);
        }
      }
    } catch (error) {
      console.error("Error fetching bid history:", error);
    }
  };

  const filteredAuctions = useMemo(() => {
    return auctions.filter((auction) => {
      const tournamentName =
        typeof auction.tournament === "string"
          ? auction.tournament
          : auction.tournament?.name;
      const matchesSearch =
        auction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tournamentName && tournamentName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "all" || auction.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [auctions, searchTerm, statusFilter]);

  const handleCreateAuction = async () => {
    try {
      // Convert from lakh to actual amount
      const totalBudgetAmount = lakhToAmount(formData.totalBudget);
      
      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          tournament: formData.tournament,
          startDate: formData.startDate,
          endDate: formData.endDate,
          totalBudget: totalBudgetAmount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchAuctions(); // Refresh the list
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success("Auction created successfully");
      } else {
        toast.error(data.error || "Failed to create auction");
      }
    } catch (error) {
      console.error("Error creating auction:", error);
      toast.error("Failed to create auction");
    }
  };

  const handleAuctionControl = async (
    auctionId: string,
    action: "start" | "pause" | "resume" | "stop"
  ) => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchAuctions(); // Refresh the list
        toast.success(data.message || `Auction ${action}ed successfully`);
      } else {
        toast.error(data.error || `Failed to ${action} auction`);
      }
    } catch (error) {
      console.error(`Error ${action}ing auction:`, error);
      toast.error(`Failed to ${action} auction`);
    }
  };

  const handlePlaceBid = async () => {
    if (!selectedAuction || !bidAmount || !bidder) return;

    try {
      const response = await fetch(`/api/auctions/${selectedAuction._id}/bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bidder: bidder,
          amount: parseInt(bidAmount),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setBidHistory(data.data.bidHistory || []);
        await fetchAuctions(); // Refresh auctions to get updated current bid

        setBidAmount("");
        setBidder("");
        toast.success("Bid placed successfully");
      } else {
        toast.error(data.error || "Failed to place bid");
      }
    } catch (error) {
      console.error("Error placing bid:", error);
      toast.error("Failed to place bid");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      tournament: "",
      startDate: "",
      endDate: "",
      totalBudget: "",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-green-500 animate-pulse";
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

  const getTournamentName = (tournament: AuctionEvent["tournament"]) => {
    return typeof tournament === "string" ? tournament : tournament?.name;
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (newPageSize: string) => {
    const size = parseInt(newPageSize);
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [statusFilter, debouncedSearchTerm]);

  if (loading) {
    return (
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md animate-pulse">
          <div className="h-8 bg-gray-700/50 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-700/50 rounded w-32"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-2xl animate-pulse"
            ></div>
          ))}
        </div>
        <div className="h-96 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 rounded-2xl animate-pulse"></div>
      </motion.div>
    );
  }

  console.log(
    auctions,
    "auctions",
    bidHistory,
    "bidHistory",
    stats,
    "stats",
    loading,
    "loading",
    searchTerm,
    "searchTerm",
    statusFilter,
    "statusFilter",
    isCreateDialogOpen,
    "isCreateDialogOpen",
    selectedAuction,
    "selectedAuction",
    bidAmount,
    "bidAmount",
    bidder,
    "bidder",
    formData,
    "formData",
    tournaments,
    "tournaments",
    teams,
    "teams"
  );

  return (
    <div className="space-y-8">
      <motion.div
        className="p-4 ms:p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 text-transparent bg-clip-text">
              Auction Management
            </h1>
            <p className="text-gray-400 mt-1">
              Manage player auctions and bidding events
            </p>
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Create Auction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Create New Auction
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Set up a new player auction event.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">
                    Auction Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Premier League 2024 Auction"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tournament" className="text-white">
                    Tournament
                  </Label>
                  <Select
                    value={formData.tournament}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tournament: value })
                    }
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Select tournament">
                        {formData.tournament
                          ? tournaments.find(
                              (t) => t._id === formData.tournament
                            )?.name || "Select tournament"
                          : "Select tournament"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {tournaments.map((tournament) => (
                        <SelectItem key={tournament._id} value={tournament._id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {tournament?.name}
                            </span>
                            {tournament.description && (
                              <span className="text-xs text-gray-400 truncate">
                                {tournament.description}
                              </span>
                            )}
                            {tournament.status && (
                              <span
                                className={`text-xs px-1 rounded ${
                                  tournament.status === "upcoming"
                                    ? "text-blue-400"
                                    : tournament.status === "active"
                                    ? "text-green-400"
                                    : tournament.status === "completed"
                                    ? "text-gray-400"
                                    : "text-red-400"
                                }`}
                              >
                                {tournament.status}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-white">
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-white">
                      End Date
                    </Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalBudget" className="text-white">
                    Total Budget (Lakh)
                  </Label>
                  <div className="relative">
                    <Input
                      id="totalBudget"
                      type="number"
                      step="0.01"
                      value={formData.totalBudget}
                      onChange={(e) =>
                        setFormData({ ...formData, totalBudget: e.target.value })
                      }
                      className="bg-gray-800 border-gray-600 text-white pr-16"
                      placeholder="8000"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Lakh</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Current:{" "}
                    {formData.totalBudget
                      ? formatCurrency(lakhToAmount(formData.totalBudget))
                      : "₹0Cr"}
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAuction}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create Auction
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div
          className="grid gap-3 xl:gap-6 lg:grid-cols-2 xl:grid-cols-4"
          variants={itemVariants}
        >
          {[
            {
              title: "Total Auctions",
              value: stats.totalAuctions,
              icon: <DollarSign className="w-6 h-6" />,
              color: "from-blue-600 to-blue-400",
              trend: "+12%",
              subtitle: "from last month",
            },
            {
              title: "Live Auctions",
              value: stats.liveAuctions,
              icon: <Users className="w-6 h-6" />,
              color: "from-green-600 to-green-400",
              trend: `${stats.liveAuctions > 0 ? "Active" : "None"}`,
              subtitle: "currently running",
            },
            {
              title: "Total Revenue",
              value: formatCurrency(stats.totalRevenue),
              icon: <Trophy className="w-6 h-6" />,
              color: "from-yellow-600 to-yellow-400",
              trend: "+8.2%",
              subtitle: "vs last period",
            },
            {
              title: "Top Bid",
              value: formatCurrency(stats.topBid),
              icon: <TrendingUp className="w-6 h-6" />,
              color: "from-purple-600 to-purple-400",
              trend: "Record",
              subtitle: "highest ever",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: index * 0.1,
                type: "spring" as const,
                stiffness: 260,
                damping: 20,
              }}
            >
              <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-lg h-full backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-400">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold mt-1 text-white">
                        {stat.value}
                      </p>
                      <div className="flex items-center mt-2 text-xs">
                        <span className="text-green-400 font-medium">
                          {stat.trend}
                        </span>
                        <span className="text-gray-500 ml-1">
                          {stat.subtitle}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}
                    >
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="auctions" className="space-y-6">
          <TabsList className="bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm">
            <TabsTrigger
              value="auctions"
              className="max-sm:text-xs data-[state=active]:bg-gray-700/50"
            >
              Auctions
            </TabsTrigger>
            <TabsTrigger
              value="live"
              className="max-sm:text-xs data-[state=active]:bg-gray-700/50"
            >
              Live Bidding
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="max-sm:text-xs data-[state=active]:bg-gray-700/50"
            >
              Bid History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auctions" className="space-y-6">
            {/* Filters */}
            <motion.div
              className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-700/50 backdrop-blur-md"
              variants={itemVariants}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search auctions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-600 text-white backdrop-blur-sm"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48 bg-gray-800/50 border-gray-600 text-white backdrop-blur-sm">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Auction Cards */}
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {auctions.length === 0 ? (
                <motion.div
                  className="col-span-full text-center py-12"
                  variants={itemVariants}
                >
                  <Gavel className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">
                    No Auctions Found
                  </h3>
                  <p className="text-gray-500">
                    Create your first auction to get started.
                  </p>
                </motion.div>
              ) : (
                auctions.map((auction, index) => (
                  <motion.div
                    key={auction._id}
                    variants={itemVariants}
                    custom={index}
                  >
                    <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 shadow-lg h-full backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-white text-lg group-hover:text-blue-400 transition-colors">
                              {auction.name}
                            </CardTitle>
                            <CardDescription className="text-gray-400 mt-1">
                              {getTournamentName(auction.tournament)}
                            </CardDescription>
                          </div>
                          <Badge
                            className={`${getStatusColor(
                              auction.status
                            )} text-white shadow-md`}
                          >
                            {auction.status}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-gray-300">
                            <div className="font-medium text-gray-400">
                              Budget
                            </div>
                            <div className="text-yellow-400 font-semibold">
                              {formatCurrency(auction.totalBudget)}
                            </div>
                          </div>
                          <div className="text-gray-300">
                            <div className="font-medium text-gray-400">
                              Players
                            </div>
                            <div className="text-white font-semibold">
                              {auction.totalPlayers}
                            </div>
                          </div>
                          <div className="text-gray-300">
                            <div className="font-medium text-gray-400">
                              Sold
                            </div>
                            <div className="text-green-400 font-semibold">
                              {auction.soldPlayers}
                            </div>
                          </div>
                          <div className="text-gray-300">
                            <div className="font-medium text-gray-400">
                              Unsold
                            </div>
                            <div className="text-red-400 font-semibold">
                              {auction.unsoldPlayers}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {auction.status === "upcoming" && (
                            <Button
                              onClick={() =>
                                handleAuctionControl(auction._id, "start")
                              }
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 shadow-md"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Start
                            </Button>
                          )}

                          {auction.status === "live" && (
                            <>
                              <Button
                                onClick={() =>
                                  handleAuctionControl(auction._id, "pause")
                                }
                                size="sm"
                                variant="outline"
                                className="border-gray-600 hover:bg-gray-700"
                              >
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </Button>
                              <Button
                                onClick={() =>
                                  handleAuctionControl(auction._id, "stop")
                                }
                                size="sm"
                                variant="destructive"
                              >
                                <Square className="w-4 h-4 mr-1" />
                                Stop
                              </Button>
                            </>
                          )}

                          {auction.status === "paused" && (
                            <Button
                              onClick={() =>
                                handleAuctionControl(auction._id, "resume")
                              }
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Resume
                            </Button>
                          )}

                          <Button
                            onClick={() =>
                              router.push(`/moderator/auctions/${auction._id}`)
                            }
                            size="sm"
                            variant="outline"
                            className="border-gray-600 hover:bg-gray-700"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalItems > 0 && (
              <motion.div
                className="flex flex-col lg:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-700/50"
                variants={itemVariants}
              >
                {/* Items per page selector */}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>Show</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="w-20 bg-gray-800/50 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                </div>

                {/* Pagination info */}
                <div className="text-sm text-gray-400">
                  Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to{" "}
                  {Math.min(currentPage * pageSize, totalItems)} of {totalItems} auctions
                </div>

                {/* Page navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <p className="hidden md:block">Previous</p>
                  </Button>

                  {/* Page numbers */}
                  <div className="flex max-md:flex-wrap max-md:justify-center items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-10 h-10 p-0 ${
                            currentPage === pageNum
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "border-gray-600 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                  >
                    <p className="hidden md:block">Next</p>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            {auctions.find((a) => a.status === "live") ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Current Player */}
                <motion.div variants={itemVariants}>
                  <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Timer className="w-5 h-5 text-green-500" />
                        Current Player
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {auctions.find((a) => a.status === "live")
                        ?.currentPlayer && (
                        <div className="flex items-center space-x-4">
                          <Avatar className="w-16 h-16 border-2 border-blue-500/20">
                            <AvatarImage
                              src={
                                auctions.find((a) => a.status === "live")
                                  ?.currentPlayer?.image
                              }
                            />
                            <AvatarFallback className="bg-blue-600 text-white">
                              {auctions
                                .find((a) => a.status === "live")
                                ?.currentPlayer?.name?.split(" ")
                                .map((n) => n[0])
                                .join("") || "P"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white">
                              {
                                auctions.find((a) => a.status === "live")
                                  ?.currentPlayer?.name
                              }
                            </h3>
                            <p className="text-gray-400">
                              {
                                auctions.find((a) => a.status === "live")
                                  ?.currentPlayer?.role
                              }
                            </p>
                            <div className="mt-2 space-y-1">
                              <div className="text-sm text-gray-400">
                                Base Price:{" "}
                                {formatCurrency(
                                  auctions.find((a) => a.status === "live")
                                    ?.currentPlayer?.basePrice || 0
                                )}
                              </div>
                              <div className="text-lg font-bold text-green-400">
                                Current Bid:{" "}
                                {formatCurrency(
                                  auctions.find((a) => a.status === "live")
                                    ?.currentBid?.amount || 0
                                )}
                              </div>
                              <div className="text-sm text-blue-400">
                                Leading:{" "}
                                {auctions.find((a) => a.status === "live")
                                  ?.currentBid?.bidderName || "No bids yet"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Place Bid */}
                {/* <motion.div variants={itemVariants}>
                  <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-white">Place Bid</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="bidder" className="text-white">
                          Team/Bidder
                        </Label>
                        <Select value={bidder} onValueChange={setBidder}>
                          <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white backdrop-blur-sm">
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            {teams.map((team) => (
                              <SelectItem key={team._id} value={team._id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bidAmount" className="text-white">
                          Bid Amount
                        </Label>
                        <Input
                          id="bidAmount"
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          className="bg-gray-700/50 border-gray-600 text-white backdrop-blur-sm"
                          placeholder="18000000"
                        />
                      </div>

                      <Button
                        onClick={handlePlaceBid}
                        className="w-full bg-green-600 hover:bg-green-700 shadow-lg"
                        disabled={!bidAmount || !bidder}
                      >
                        <Gavel className="w-4 h-4 mr-2" />
                        Place Bid
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div> */}
              </div>
            ) : (
              <motion.div className="text-center py-12" variants={itemVariants}>
                <Timer className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">
                  No Live Auctions
                </h3>
                <p className="text-gray-500">
                  Start an auction to begin live bidding.
                </p>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <motion.div variants={itemVariants}>
              <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-white">
                    Recent Bid History
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Latest bidding activity across all auctions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bidHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Gavel className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">
                        No Bid History
                      </h3>
                      <p className="text-gray-500">
                        Bid history will appear here once auctions begin.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-300">
                            Player
                          </TableHead>
                          <TableHead className="text-gray-300">
                            Bidder
                          </TableHead>
                          <TableHead className="text-gray-300">
                            Amount
                          </TableHead>
                          <TableHead className="text-gray-300">Time</TableHead>
                          <TableHead className="text-gray-300">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bidHistory.map((bid) => (
                          <TableRow key={bid._id} className="border-gray-700">
                            <TableCell className="text-white font-medium">
                              {typeof bid.player === "object"
                                ? bid.player.name
                                : "Unknown Player"}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {bid.bidderName ||
                                (typeof bid.bidder === "object"
                                  ? bid.bidder.name
                                  : bid.bidder)}
                            </TableCell>
                            <TableCell className="text-yellow-400 font-semibold">
                              {formatCurrency(bid.amount)}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {new Date(bid.timestamp).toLocaleTimeString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  bid.status === "won"
                                    ? "bg-green-500"
                                    : bid.status === "active"
                                    ? "bg-blue-500"
                                    : "bg-gray-500"
                                }
                              >
                                {bid.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}