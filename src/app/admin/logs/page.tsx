'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Activity, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  User,
  Settings,
  Database,
  Shield,
  Clock,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface ActivityLog {
  _id: string;
  user: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  status: 'success' | 'failed' | 'warning';
}

interface SystemLog {
  _id: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  service: string;
  message: string;
  details?: any;
  timestamp: string;
  resolved: boolean;
}

interface AuditLog {
  _id: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  action: string;
  table: string;
  recordId: string;
  oldValues?: any;
  newValues?: any;
  timestamp: string;
}

export default function LogsPage() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  // Fetch real activity logs
  useEffect(() => {
    fetchActivityLogs();
  }, [searchTerm, levelFilter, dateFilter, currentPage]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (levelFilter !== 'all') params.append('level', levelFilter);
      if (dateFilter !== 'all') params.append('date', dateFilter);
      params.append('page', currentPage.toString());
      params.append('limit', '20');

      const response = await fetch(`/api/logs?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setActivityLogs(data.data.logs || []);
        setPagination(data.data.pagination);
      } else {
        toast.error('Failed to load activity logs');
        // Set fallback data
        setActivityLogs([
          {
            _id: '1',
            user: {
              name: 'System',
              email: 'system@auction.com',
              role: 'system'
            },
            action: 'TOURNAMENT_CREATED',
            resource: 'Tournament',
            resourceId: 'auto-generated',
            details: 'Tournament created with automatic auction',
            ipAddress: '127.0.0.1',
            userAgent: 'System',
            timestamp: new Date().toISOString(),
            status: 'success'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  // Mock system logs for now (would be replaced with real API)
  useEffect(() => {
    const mockSystemLogs: SystemLog[] = [
      {
        _id: '1',
        level: 'info',
        service: 'Database',
        message: 'Database connection established successfully',
        details: {
          host: 'MongoDB Atlas',
          connectionTime: '150ms'
        },
        timestamp: new Date().toISOString(),
        resolved: true
      },
      {
        _id: '2',
        level: 'warning',
        service: 'API',
        message: 'High response time detected on auction endpoints',
        details: {
          endpoint: '/api/auctions',
          responseTime: '1.2s',
          threshold: '1s'
        },
        timestamp: new Date(Date.now() - 60000).toISOString(),
        resolved: false
      }
    ];

    setSystemLogs(mockSystemLogs);
  }, []);

  // Mock audit logs for now (would be replaced with real API)
  useEffect(() => {
    const mockAuditLogs: AuditLog[] = [
      {
        _id: '1',
        user: {
          name: 'Admin User',
          email: 'admin@auction.com',
          role: 'admin'
        },
        action: 'UPDATE',
        table: 'tournaments',
        recordId: 'tournament_123',
        oldValues: { status: 'upcoming' },
        newValues: { status: 'active' },
        timestamp: new Date().toISOString()
      }
    ];

    setAuditLogs(mockAuditLogs);
  }, []);

  const handleRefresh = () => {
    fetchActivityLogs();
    toast.success('Logs refreshed');
  };

  const handleExport = (type: string) => {
    toast.success(`Exporting ${type} logs...`);
    // Implement export functionality
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      case 'debug': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      case 'debug': return <Settings className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'tournament_created':
        return <Database className="w-4 h-4" />;
      case 'update': return <Settings className="w-4 h-4" />;
      case 'delete': return <XCircle className="w-4 h-4" />;
      case 'login': return <User className="w-4 h-4" />;
      case 'login_failed': return <Shield className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-800 rounded-lg animate-pulse"></div>
        <div className="h-96 bg-gray-800 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">System Logs</h1>
          <p className="text-gray-400">Monitor system activity and user actions</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleExport('activity')}
            className="border-gray-600 text-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Level</label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Date Range</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-300">User</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Tabs */}
      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="activity" className="data-[state=active]:bg-gray-700">
            Activity Logs
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-gray-700">
            System Logs
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-gray-700">
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Activity Logs</CardTitle>
              <CardDescription className="text-gray-400">
                User actions and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Action</TableHead>
                    <TableHead className="text-gray-300">Resource</TableHead>
                    <TableHead className="text-gray-300">Details</TableHead>
                    <TableHead className="text-gray-300">Time</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.map((log) => (
                    <TableRow key={log._id} className="border-gray-700">
                      <TableCell className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={log.user.avatar} />
                          <AvatarFallback className="bg-gray-600 text-white text-xs">
                            {log.user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-white font-medium">{log.user.name}</div>
                          <div className="text-gray-400 text-xs">{log.user.role}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="text-gray-300">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{log.resource}</TableCell>
                      <TableCell className="text-gray-300 max-w-xs truncate">
                        {log.details}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(log.status)} text-white`}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-400">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} logs
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={pagination.page <= 1}
                      className="border-gray-600 text-gray-300"
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-3 py-1 text-sm text-gray-400">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                      disabled={pagination.page >= pagination.pages}
                      className="border-gray-600 text-gray-300"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">System Logs</CardTitle>
              <CardDescription className="text-gray-400">
                Application and infrastructure events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Level</TableHead>
                    <TableHead className="text-gray-300">Service</TableHead>
                    <TableHead className="text-gray-300">Message</TableHead>
                    <TableHead className="text-gray-300">Time</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemLogs.map((log) => (
                    <TableRow key={log._id} className="border-gray-700">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getLevelIcon(log.level)}
                          <Badge className={`${getLevelColor(log.level)} text-white`}>
                            {log.level}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{log.service}</TableCell>
                      <TableCell className="text-gray-300">{log.message}</TableCell>
                      <TableCell className="text-gray-300">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge className={log.resolved ? 'bg-green-500' : 'bg-red-500'}>
                          {log.resolved ? 'Resolved' : 'Active'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Audit Trail</CardTitle>
              <CardDescription className="text-gray-400">
                Database changes and administrative actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Action</TableHead>
                    <TableHead className="text-gray-300">Table</TableHead>
                    <TableHead className="text-gray-300">Record ID</TableHead>
                    <TableHead className="text-gray-300">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log._id} className="border-gray-700">
                      <TableCell>
                        <div>
                          <div className="text-white font-medium">{log.user.name}</div>
                          <div className="text-gray-400 text-xs">{log.user.role}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{log.action}</TableCell>
                      <TableCell className="text-gray-300">{log.table}</TableCell>
                      <TableCell className="text-gray-300 font-mono text-xs">
                        {log.recordId}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 