'use client';

import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users2, PlusCircle, History } from 'lucide-react';

export default function TeamOwnerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Team Owner Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Users2 className="h-5 w-5" />
              <span className="font-medium">Team Management</span>
            </div>
            <CardTitle>My Team</CardTitle>
            <CardDescription>
              Manage your team roster and player information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">
              View your current team composition, player statistics, and manage team details.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="default">
              View Team
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <PlusCircle className="h-5 w-5" />
              <span className="font-medium">New Auction</span>
            </div>
            <CardTitle>Create Auction</CardTitle>
            <CardDescription>
              Create and manage your player auctions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">
              Initiate new auction listings, set parameters, and track active auctions.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="default">
              New Auction
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <History className="h-5 w-5" />
              <span className="font-medium">Activity</span>
            </div>
            <CardTitle>Auction History</CardTitle>
            <CardDescription>
              View your past auction activity and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">
              Access completed auctions, transaction records, and historical bidding data.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="default">
              View History
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 