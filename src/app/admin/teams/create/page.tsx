'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface TeamFormData {
  name: string;
  shortName: string;
  logo: string;
  bannerImage: string;
  primaryColor: string;
  secondaryColor: string;
  city: string;
  state: string;
  country: string;
  homeGround: {
    name: string;
    city: string;
    capacity: number;
  };
  owner: string;
  management: {
    coach: {
      name: string;
      role: string;
      experience: number;
    };
    support: {
      name: string;
      role: string;
    }[];
  };
  social: {
    website: string;
    twitter: string;
    instagram: string;
    facebook: string;
  };
}

const initialFormData: TeamFormData = {
  name: '',
  shortName: '',
  logo: '',
  bannerImage: '',
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  city: '',
  state: '',
  country: 'India',
  homeGround: {
    name: '',
    city: '',
    capacity: 0
  },
  owner: '',
  management: {
    coach: {
      name: '',
      role: 'Head Coach',
      experience: 0
    },
    support: []
  },
  social: {
    website: '',
    twitter: '',
    instagram: '',
    facebook: ''
  }
};

export default function CreateTeamPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<TeamFormData>(initialFormData);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string | number) => {
    const fields = field.split('.');
    if (fields.length === 1) {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => {
        const newData = { ...prev };
        let current: any = newData;
        for (let i = 0; i < fields.length - 1; i++) {
          current = current[fields[i]];
        }
        current[fields[fields.length - 1]] = value;
        return newData;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Validate shortName length
      if (formData.shortName.length > 4) {
        toast.error('Team short name must be 4 characters or less');
        return;
      }

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create team');
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Team created successfully');
        router.push('/admin/teams');
      } else {
        toast.error(data.error || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.push('/admin/teams')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Team</h1>
          <p className="text-gray-500">Add a new cricket team to the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name (max 4 chars)</Label>
              <Input
                id="shortName"
                value={formData.shortName}
                onChange={(e) => handleInputChange('shortName', e.target.value.toUpperCase())}
                maxLength={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Team Logo URL</Label>
              <Input
                id="logo"
                value={formData.logo}
                onChange={(e) => handleInputChange('logo', e.target.value)}
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bannerImage">Banner Image URL</Label>
              <Input
                id="bannerImage"
                value={formData.bannerImage}
                onChange={(e) => handleInputChange('bannerImage', e.target.value)}
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <Input
                id="primaryColor"
                value={formData.primaryColor}
                onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                type="color"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <Input
                id="secondaryColor"
                value={formData.secondaryColor}
                onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                type="color"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Home Ground</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="homeGround.name">Stadium Name</Label>
              <Input
                id="homeGround.name"
                value={formData.homeGround.name}
                onChange={(e) => handleInputChange('homeGround.name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="homeGround.city">Stadium City</Label>
              <Input
                id="homeGround.city"
                value={formData.homeGround.city}
                onChange={(e) => handleInputChange('homeGround.city', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="homeGround.capacity">Stadium Capacity</Label>
              <Input
                id="homeGround.capacity"
                value={formData.homeGround.capacity}
                onChange={(e) => handleInputChange('homeGround.capacity', parseInt(e.target.value) || 0)}
                type="number"
                min="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Management</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner">Owner ID</Label>
              <Input
                id="owner"
                value={formData.owner}
                onChange={(e) => handleInputChange('owner', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="management.coach.name">Coach Name</Label>
              <Input
                id="management.coach.name"
                value={formData.management.coach.name}
                onChange={(e) => handleInputChange('management.coach.name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="management.coach.role">Coach Role</Label>
              <Select
                value={formData.management.coach.role}
                onValueChange={(value) => handleInputChange('management.coach.role', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Head Coach">Head Coach</SelectItem>
                  <SelectItem value="Assistant Coach">Assistant Coach</SelectItem>
                  <SelectItem value="Batting Coach">Batting Coach</SelectItem>
                  <SelectItem value="Bowling Coach">Bowling Coach</SelectItem>
                  <SelectItem value="Fielding Coach">Fielding Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="management.coach.experience">Experience (years)</Label>
              <Input
                id="management.coach.experience"
                value={formData.management.coach.experience}
                onChange={(e) => handleInputChange('management.coach.experience', parseInt(e.target.value) || 0)}
                type="number"
                min="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="social.website">Website</Label>
              <Input
                id="social.website"
                value={formData.social.website}
                onChange={(e) => handleInputChange('social.website', e.target.value)}
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social.twitter">Twitter</Label>
              <Input
                id="social.twitter"
                value={formData.social.twitter}
                onChange={(e) => handleInputChange('social.twitter', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social.instagram">Instagram</Label>
              <Input
                id="social.instagram"
                value={formData.social.instagram}
                onChange={(e) => handleInputChange('social.instagram', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social.facebook">Facebook</Label>
              <Input
                id="social.facebook"
                value={formData.social.facebook}
                onChange={(e) => handleInputChange('social.facebook', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/teams')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Team'}
          </Button>
        </div>
      </form>
    </div>
  );
} 