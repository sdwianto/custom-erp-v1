'use client';

import React, { useEffect } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Wifi, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Database,
  Activity,
  Settings,
  Eye,
  HardDrive,
  Smartphone,
  Monitor,
  Tablet,
  X,
  WifiOff
} from 'lucide-react';

// Types for conflicts and mutations
interface Conflict {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conflictType: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface PendingMutation {
  id: string;
  kind: string;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  entityType: string;
  entityId: string;
}

const SyncTab: React.FC = () => {
  const [isClient, setIsClient] = React.useState(false);

  // Use offline sync hook
  const {
    isOnline,
    isInitialized,
    isSyncing,
    stats,
    performance,
    conflicts: rawConflicts,
    pendingMutations: rawPendingMutations,
    error,
    initialize,
    retryMutation,
    resolveConflict,
    clearError,
    forceSync
  } = useOfflineSync('default-tenant', 'current-user');

  // Ensure conflicts and pendingMutations are arrays with proper types
  const conflicts: Conflict[] = Array.isArray(rawConflicts) ? rawConflicts as unknown as Conflict[] : [];
  const pendingMutations: PendingMutation[] = Array.isArray(rawPendingMutations) ? rawPendingMutations as unknown as PendingMutation[] : [];

  // Initialize on mount
  useEffect(() => {
    setIsClient(true);
    if (!isInitialized) {
      void initialize();
    }
  }, [isInitialized, initialize]);

  // Mock data for devices (in real app, this would come from API)
  const devices = [
    { id: '1', name: 'Field Tablet 1', type: 'tablet', status: 'online', lastSync: '2024-01-15T10:30:00Z' },
    { id: '2', name: 'Office Desktop', type: 'desktop', status: 'online', lastSync: '2024-01-15T10:25:00Z' },
    { id: '3', name: 'Mobile Phone', type: 'mobile', status: 'offline', lastSync: '2024-01-15T09:45:00Z' },
    { id: '4', name: 'Field Tablet 2', type: 'tablet', status: 'online', lastSync: '2024-01-15T10:20:00Z' }
  ];

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'offline':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'syncing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Prevent hydration error by not rendering until client-side
  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error initializing offline sync: {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => clearError()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isInitialized ? 'Sync initialized' : 'Initializing...'}
              </p>
            </div>
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mutations</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats as unknown as Record<string, unknown>)?.queueSize as number ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              In queue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats as unknown as Record<string, unknown>)?.pendingMutations as number ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting sync
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats as unknown as Record<string, unknown>)?.completedMutations as number ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully synced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conflicts.length}</div>
            <p className="text-xs text-muted-foreground">
              {conflicts.filter(c => c.severity === 'critical').length} critical
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {performance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">API Latency</p>
                <p className="text-2xl font-bold">{performance?.apiLatency?.toFixed(0) ?? '0'}ms</p>
                <Progress 
                  value={((performance?.apiLatency ?? 0) / 200) * 100} 
                  className="mt-2"
                />
              </div>
              <div>
                <p className="text-sm font-medium">Database Latency</p>
                <p className="text-2xl font-bold">{performance?.databaseLatency?.toFixed(0) ?? '0'}ms</p>
                <Progress 
                  value={((performance?.databaseLatency ?? 0) / 100) * 100} 
                  className="mt-2"
                />
              </div>
              <div>
                <p className="text-sm font-medium">Event Processing</p>
                <p className="text-2xl font-bold">{performance?.eventProcessingLatency?.toFixed(0) ?? '0'}ms</p>
                <Progress 
                  value={((performance?.eventProcessingLatency ?? 0) / 50) * 100}
                  className="mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Conflicts ({conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{conflict.description}</p>
                    <p className="text-sm text-gray-500">
                      Severity: {conflict.severity} | Type: {conflict.conflictType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={conflict.severity === 'critical' ? 'destructive' : 'default'}>
                      {conflict.severity}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => resolveConflict(conflict.id, 'server_wins')}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Mutations */}
      {pendingMutations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Pending Mutations ({pendingMutations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingMutations.slice(0, 5).map((mutation) => (
                <div key={mutation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{mutation.kind}</p>
                    <p className="text-sm text-gray-500">
                      Created: {formatTime(mutation.createdAt)} | 
                      Retries: {mutation.retryCount}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      mutation.status === 'failed' ? 'destructive' :
                      mutation.status === 'completed' ? 'default' : 'secondary'
                    }>
                      {mutation.status}
                    </Badge>
                    {mutation.status === 'failed' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => retryMutation(mutation.id)}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {pendingMutations.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... and {pendingMutations.length - 5} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Connected Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getDeviceIcon(device.type)}
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-sm text-gray-500">
                      Last sync: {formatTime(device.lastSync)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(device.status)}>
                    {device.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncTab;
