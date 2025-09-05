'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Activity,
  RefreshCw,
  Settings,
  Wifi,
  WifiOff,
  Database,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import SyncTab from '@/components/offline/SyncTab';
import MonitoringTab from '@/components/offline/MonitoringTab';
import { useOfflineSync } from '@/hooks/useOfflineSync';

const OfflineDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sync');
  const [isClient, setIsClient] = React.useState(false);

  // Use offline sync hook for global status
  const {
    isOnline,
    isInitialized,
    isSyncing,
    stats,
    error,
    clearError,
    forceSync
  } = useOfflineSync('default-tenant', 'current-user');

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration error
  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Offline Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Integrated dashboard for sync management and system monitoring
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            onClick={forceSync} 
            disabled={isSyncing || !isOnline}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Force Sync'}
          </Button>
        </div>
      </div>

      {/* Global Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection</CardTitle>
            {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isInitialized ? 'Initialized' : 'Initializing...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isSyncing ? 'Syncing' : 'Idle'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isSyncing ? 'Processing...' : 'Ready'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats as unknown as Record<string, unknown>)?.queueSize as number ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending mutations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {error ? 'Error' : 'Healthy'}
            </div>
            <p className="text-xs text-muted-foreground">
              {error ? 'Issues detected' : 'All systems operational'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              System Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => clearError()}
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
            >
              Clear Error
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync Management
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="mt-6">
          <SyncTab />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          <MonitoringTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OfflineDashboard;
