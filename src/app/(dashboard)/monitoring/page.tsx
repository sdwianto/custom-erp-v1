'use client';

import React, { useState, useEffect } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus
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

const MonitoringPage: React.FC = () => {
  const [isClient, setIsClient] = React.useState(false);

  const {
    isOnline,
    isInitialized,
    stats,
    performance,
    conflicts: rawConflicts,
    pendingMutations: rawPendingMutations,
    error
  } = useOfflineSync('default-tenant', 'current-user');

  // Ensure conflicts and pendingMutations are arrays with proper types
  const conflicts: Conflict[] = Array.isArray(rawConflicts) ? rawConflicts as unknown as Conflict[] : [];
  const pendingMutations: PendingMutation[] = Array.isArray(rawPendingMutations) ? rawPendingMutations as unknown as PendingMutation[] : [];

  const [refreshInterval] = useState(5000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initialize client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Trigger refresh by re-initializing
      if (isInitialized) {
        window.location.reload();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isInitialized]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTrendIcon = (current: number, target: number) => {
    if (current <= target) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (current <= target * 1.5) {
      return <Minus className="h-4 w-4 text-yellow-500" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Prevent hydration error by not rendering until client-side
  if (!isClient) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Monitoring</h1>
          <p className="text-gray-600 dark:text-gray-400">Real-time monitoring of offline sync performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isInitialized ? 'Operational' : 'Initializing'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isOnline ? 'Connected' : 'Offline Mode'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Health</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats as unknown as Record<string, unknown>)?.queueSize as number ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(stats as unknown as Record<string, unknown>)?.pendingMutations as number ?? 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conflicts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {conflicts.filter((c: any) => c?.severity === 'critical').length} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats as unknown as Record<string, unknown>)?.successRate ? `${((stats as unknown as Record<string, unknown>).successRate as number * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {performance && (
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            <TabsTrigger value="queue">Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">API Latency</p>
                      {getTrendIcon(performance?.apiLatency ?? 0, 200)}
                    </div>
                    <p className="text-2xl font-bold">{performance?.apiLatency?.toFixed(0) ?? '0'}ms</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(((performance?.apiLatency ?? 0) / 200) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Target: 200ms</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Database Latency</p>
                      {getTrendIcon(performance?.databaseLatency ?? 0, 100)}
                    </div>
                    <p className="text-2xl font-bold">{performance?.databaseLatency?.toFixed(0) ?? '0'}ms</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(((performance?.databaseLatency ?? 0) / 100) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Target: 100ms</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Event Processing</p>
                      {getTrendIcon(performance?.eventProcessingLatency ?? 0, 50)}
                    </div>
                    <p className="text-2xl font-bold">{performance?.eventProcessingLatency?.toFixed(0) ?? '0'}ms</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(((performance?.eventProcessingLatency ?? 0) / 50) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Target: 50ms</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Memory Usage</p>
                      <Minus className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold">
                      {performance?.memoryUsage ? `${(performance.memoryUsage / 1024 / 1024).toFixed(0)}MB` : 'N/A'}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${performance?.memoryUsage ? (performance.memoryUsage / 1024 / 1024 / 100) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Heap usage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(performance as unknown as Record<string, unknown>)?.alerts && ((performance as unknown as Record<string, unknown>).alerts as unknown[])?.length > 0 ? (
                    ((performance as unknown as Record<string, unknown>).alerts as unknown[]).map((alert: unknown, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className={`h-5 w-5 ${
                            (alert as Record<string, unknown>).severity === 'critical' ? 'text-red-500' :
                            (alert as Record<string, unknown>).severity === 'high' ? 'text-orange-500' :
                            'text-yellow-500'
                          }`} />
                          <div>
                            <p className="font-medium">{(alert as Record<string, unknown>).message as string}</p>
                            <p className="text-sm text-gray-500">
                              {formatTime((alert as Record<string, unknown>).timestamp as string)}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor((alert as Record<string, unknown>).severity as string)}>
                          {(alert as Record<string, unknown>).severity as string}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>No active alerts</p>
                      <p className="text-sm">System is running normally</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Conflict Resolution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {conflicts.length > 0 ? (
                    conflicts.map((conflict: any) => (
                      <div key={conflict.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{conflict.description}</p>
                          <p className="text-sm text-gray-500">
                            Type: {conflict.conflictType} | 
                            Created: {formatTime(conflict.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(conflict.severity)}>
                            {conflict.severity}
                          </Badge>
                          <Badge variant="outline">
                            {conflict.resolution}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>No conflicts</p>
                      <p className="text-sm">All data is synchronized</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Queue Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingMutations.length > 0 ? (
                    pendingMutations.slice(0, 10).map((mutation: any) => (
                      <div key={mutation.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{mutation.kind}</p>
                          <p className="text-sm text-gray-500">
                            Created: {formatTime(mutation.createdAt)} | 
                            Retries: {mutation.retryCount}
                          </p>
                        </div>
                        <Badge 
                          className={
                            mutation.status === 'failed' ? 'bg-red-100 text-red-800' :
                            mutation.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {mutation.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>Queue is empty</p>
                      <p className="text-sm">All mutations processed</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              System Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MonitoringPage;
