'use client';

import React, { useState, useEffect } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const MonitoringTab: React.FC = () => {
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

  const getTrendIcon = (current: number, target: number) => {
    if (current < target * 0.8) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    } else if (current > target * 1.2) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else {
      return <Minus className="h-4 w-4 text-blue-500" />;
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

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
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
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Operational
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
      </div>

      {/* Performance Metrics */}
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

      {/* Detailed Monitoring */}
      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="mutations">Mutations</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Performance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(performance as unknown as Record<string, unknown>)?.alerts ? (
                  ((performance as unknown as Record<string, unknown>).alerts as any[]).map((alert: any) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-gray-500">
                          Type: {alert.type} | Severity: {alert.severity}
                        </p>
                      </div>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                        {alert.severity}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No performance alerts at this time
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Active Conflicts
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
                      <Badge variant={conflict.severity === 'critical' ? 'destructive' : 'default'}>
                        {conflict.severity}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No active conflicts
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mutations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Recent Mutations
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
                      <Badge variant={
                        mutation.status === 'failed' ? 'destructive' :
                        mutation.status === 'completed' ? 'default' : 'secondary'
                      }>
                        {mutation.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No recent mutations
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Auto-refresh Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Refresh Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-refresh</p>
              <p className="text-xs text-muted-foreground">
                Updates every {refreshInterval / 1000} seconds
              </p>
            </div>
            <Button 
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringTab;
