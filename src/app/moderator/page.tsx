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
import { ShieldCheck, Gavel } from 'lucide-react';

export default function ModeratorPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Moderator Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-medium">Content Moderation</span>
            </div>
            <CardTitle>Review Content</CardTitle>
            <CardDescription>
              Monitor and moderate user-generated content across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">
              Review reported content, enforce community guidelines, and maintain platform integrity.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="default">
              Review Content
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Gavel className="h-5 w-5" />
              <span className="font-medium">Auction Approval</span>
            </div>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>
              Review and approve team owner auction requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">
              Verify auction details, ensure compliance with platform policies, and approve or reject auction listings.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="default">
              Pending Approvals
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 