'use client';

import React, { useEffect } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useDeviceManagement } from '@/hooks/useDeviceManagement';
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
  Eye,
  HardDrive,
  Smartphone,
  Monitor,
  Tablet,
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

interface Device {
  deviceId: string;
  deviceInfo: {
    type: string;
    name: string;
    lastSeen: Date | string;
    platform: string;
    version: string;
    syncStatus: string;
  };
  isActive: boolean;
  tenantId: string;
  userId: string;
}

const SyncTab: React.FC = () => {
  const [isClient, setIsClient] = React.useState(false);

  // Use offline sync hook
  const {
    isOnline,
    isInitialized,
    stats,
    performance,
    conflicts: rawConflicts,
    pendingMutations: rawPendingMutations,
    error,
    initialize,
    retryMutation,
    resolveConflict,
    clearError
  } = useOfflineSync('default-tenant', 'current-user');

  // Use device management hook
  const {
    devices,
    currentDevice,
    deviceStats,
    isLoading: deviceLoading,
    error: deviceError,
    registerDevice,
    unregisterDevice,
    syncAllDevices,
    refreshDevices
  } = useDeviceManagement();

  // Ensure conflicts and pendingMutations are arrays with proper types
  const conflicts: Conflict[] = Array.isArray(rawConflicts) ? rawConflicts as unknown as Conflict[] : [];
  const pendingMutations: PendingMutation[] = Array.isArray(rawPendingMutations) ? rawPendingMutations as unknown as PendingMutation[] : [];

  // Initialize on mount
  useEffect(() => {
    setIsClient(true);
    if (!isInitialized) {
      void initialize();
    }
    
    // Register current device
    if (isClient && !currentDevice) {
      void registerDevice('default-tenant', 'current-user');
    }
  }, [isInitialized, initialize, isClient, currentDevice, registerDevice]);

  // Helper functions for device display
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

  const formatTime = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString();
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Connected Devices ({deviceStats.total})
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refreshDevices()}
                disabled={deviceLoading}
              >
                <RefreshCw className={`h-4 w-4 ${deviceLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => syncAllDevices()}
                disabled={deviceLoading}
              >
                <Activity className="h-4 w-4" />
                Sync All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deviceError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Device management error: {deviceError}
              </AlertDescription>
            </Alert>
          )}
          
          {deviceLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8">
              <HardDrive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No devices registered</p>
              <p className="text-sm text-gray-400">Devices will appear here when they connect</p>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => {
                const typedDevice = device as Device;
                return (
                  <div key={typedDevice.deviceId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(typedDevice.deviceInfo.type)}
                      <div>
                        <p className="font-medium">{typedDevice.deviceInfo.name}</p>
                        <p className="text-sm text-gray-500">
                          Last seen: {formatTime(typedDevice.deviceInfo.lastSeen)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {typedDevice.deviceInfo.platform} • {typedDevice.deviceInfo.version}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(typedDevice.deviceInfo.syncStatus)}>
                        {typedDevice.deviceInfo.syncStatus}
                      </Badge>
                      <Badge variant={typedDevice.isActive ? 'default' : 'secondary'}>
                        {typedDevice.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          // Toggle device status
                          if (typedDevice.isActive) {
                            void unregisterDevice(typedDevice.deviceId);
                          } else {
                            void registerDevice(typedDevice.tenantId, typedDevice.userId);
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncTab;
