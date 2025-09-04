import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Cloud, 
  Wifi, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Download,
  Upload,
  Database,
  Activity,
  Settings,
  Eye,
  Play,

  ArrowUpDown,
  FileText,
  HardDrive,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';

const OfflineSyncPage: React.FC = () => {
  // Mock data for offline sync
  const syncStats = {
    totalDevices: 12,
    onlineDevices: 8,
    offlineDevices: 4,
    pendingSync: 156,
    syncedToday: 1247,
    conflicts: 3
  };

  const devices = [
    {
      id: 1,
      name: 'Port Moresby Office',
      type: 'Desktop',
      status: 'Online',
      lastSync: '2024-01-15 10:30',
      pendingRecords: 0,
      syncProgress: 100,
      location: 'Port Moresby',
      ip: '192.168.1.100'
    },
    {
      id: 2,
      name: 'Lae Warehouse',
      type: 'Desktop',
      status: 'Online',
      lastSync: '2024-01-15 10:25',
      pendingRecords: 0,
      syncProgress: 100,
      location: 'Lae',
      ip: '192.168.1.101'
    },
    {
      id: 3,
      name: 'Mount Hagen Site',
      type: 'Tablet',
      status: 'Offline',
      lastSync: '2024-01-15 08:15',
      pendingRecords: 45,
      syncProgress: 0,
      location: 'Mount Hagen',
      ip: '192.168.1.102'
    },
    {
      id: 4,
      name: 'Goroka Field Office',
      type: 'Mobile',
      status: 'Offline',
      lastSync: '2024-01-15 07:30',
      pendingRecords: 23,
      syncProgress: 0,
      location: 'Goroka',
      ip: '192.168.1.103'
    },
    {
      id: 5,
      name: 'Madang Branch',
      type: 'Desktop',
      status: 'Online',
      lastSync: '2024-01-15 10:20',
      pendingRecords: 0,
      syncProgress: 100,
      location: 'Madang',
      ip: '192.168.1.104'
    }
  ];

  const syncQueue = [
    {
      id: 1,
      type: 'Inventory Update',
      device: 'Mount Hagen Site',
      records: 45,
      status: 'Pending',
      timestamp: '2024-01-15 08:15',
      priority: 'High'
    },
    {
      id: 2,
      type: 'Customer Data',
      device: 'Goroka Field Office',
      records: 23,
      status: 'Pending',
      timestamp: '2024-01-15 07:30',
      priority: 'Medium'
    },
    {
      id: 3,
      type: 'Financial Transaction',
      device: 'Port Moresby Office',
      records: 12,
      status: 'Synced',
      timestamp: '2024-01-15 10:30',
      priority: 'High'
    },
    {
      id: 4,
      type: 'Equipment Status',
      device: 'Lae Warehouse',
      records: 8,
      status: 'Synced',
      timestamp: '2024-01-15 10:25',
      priority: 'Low'
    }
  ];

  const conflicts = [
    {
      id: 1,
      type: 'Inventory Conflict',
      device: 'Mount Hagen Site',
      description: 'Duplicate inventory entry for Excavator #EX-001',
      timestamp: '2024-01-15 08:15',
      status: 'Resolved',
      resolution: 'Auto-merged duplicate entries'
    },
    {
      id: 2,
      type: 'Customer Data Conflict',
      device: 'Goroka Field Office',
      description: 'Conflicting customer phone numbers',
      timestamp: '2024-01-15 07:30',
      status: 'Pending',
      resolution: 'Manual review required'
    },
    {
      id: 3,
      type: 'Financial Data Conflict',
      device: 'Port Moresby Office',
      description: 'Duplicate transaction ID detected',
      timestamp: '2024-01-15 10:30',
      status: 'Resolved',
      resolution: 'Kept most recent transaction'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Online':
      case 'Synced':
      case 'Resolved':
        return 'bg-green-500';
      case 'Offline':
      case 'Pending':
        return 'bg-yellow-500';
      case 'Failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Online':
      case 'Synced':
      case 'Resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Offline':
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Desktop':
        return <Monitor className="h-4 w-4" />;
      case 'Mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'Tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Offline Sync</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage offline synchronization across all devices</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Sync
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{syncStats.totalDevices}</div>
              <p className="text-xs text-muted-foreground">Connected devices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
              <Wifi className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{syncStats.onlineDevices}</div>
              <p className="text-xs text-muted-foreground">Currently connected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Sync</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{syncStats.pendingSync}</div>
              <p className="text-xs text-muted-foreground">Records waiting</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{syncStats.conflicts}</div>
              <p className="text-xs text-muted-foreground">Need resolution</p>
            </CardContent>
          </Card>
        </div>

        {/* Device Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Device Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Device</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Last Sync</th>
                    <th className="text-left py-3 px-4 font-medium">Pending</th>
                    <th className="text-left py-3 px-4 font-medium">Progress</th>
                    <th className="text-left py-3 px-4 font-medium">Location</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr key={device.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-muted-foreground">{device.ip}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(device.type)}
                          {device.type}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`}></div>
                          <Badge className={getStatusBadgeColor(device.status)}>
                            {device.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {device.lastSync}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{device.pendingRecords}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${device.syncProgress}%` }}
                          ></div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {device.syncProgress}%
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {device.location}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Sync Queue and Conflicts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sync Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                Sync Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncQueue.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}></div>
                      <div>
                        <div className="font-medium">{item.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.device} • {item.records} records
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{item.timestamp}</div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadgeColor(item.status)}>
                          {item.status}
                        </Badge>
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Conflicts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Data Conflicts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(conflict.status)}`}></div>
                      <div>
                        <div className="font-medium">{conflict.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {conflict.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{conflict.timestamp}</div>
                      <Badge className={getStatusBadgeColor(conflict.status)}>
                        {conflict.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sync Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="h-5 w-5 text-blue-500" />
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Auto Sync</h4>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Automatically sync data every 30 minutes when devices are online.
                </p>
                <div className="mt-3">
                  <Button variant="outline" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Enable
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h4 className="font-medium text-green-800 dark:text-green-200">Conflict Resolution</h4>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Automatic conflict resolution with manual review for complex cases.
                </p>
                <div className="mt-3">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-5 w-5 text-yellow-500" />
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Data Retention</h4>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Keep offline data for 30 days before automatic cleanup.
                </p>
                <div className="mt-3">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col gap-2">
                <RefreshCw className="h-6 w-6" />
                <span>Sync All Devices</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Download className="h-6 w-6" />
                <span>Download Data</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Upload className="h-6 w-6" />
                <span>Upload Data</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <FileText className="h-6 w-6" />
                <span>View Logs</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>  );
};

export default OfflineSyncPage; 