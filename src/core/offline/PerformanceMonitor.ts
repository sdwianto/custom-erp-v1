/**
 * Performance Monitor & Optimization
 * Implementation Guide: Performance Monitoring & Optimization
 * 
 * Performance targets setup:
 * - API latency monitoring
 * - Database latency tracking
 * - Event processing metrics
 * - SSE reconnect performance
 * - Uptime monitoring
 * - RPO/RTO tracking
 */

import type { 
  OfflineQueueStats, 
  DeviceSyncStatus 
} from './types';

export interface PerformanceTargets {
  apiLatency: number;        // ms (improved from 300ms)
  databaseLatency: number;   // ms (improved from proposal)
  eventProcessing: number;   // ms (new target)
  sseReconnect: number;      // seconds (proposal requirement)
  uptime: number;            // % (proposal requirement)
  rpo: number;               // minutes (proposal requirement)
  rto: number;               // hours (proposal requirement)
}

export interface PerformanceMetrics {
  timestamp: string;
  apiLatency: number;
  databaseLatency: number;
  eventProcessingLatency: number;
  sseReconnectTime: number;
  uptime: number;
  queueStats: OfflineQueueStats;
  syncStatus: DeviceSyncStatus;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  errorRate: number;
  throughput: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'latency' | 'uptime' | 'error_rate' | 'queue_size' | 'sync_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'performance' | 'reliability' | 'scalability' | 'cost';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  metrics: string[];
  timestamp: string;
}

export class PerformanceMonitor {
  private readonly targets: PerformanceTargets;
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly alerts: PerformanceAlert[] = [];
  private readonly recommendations: OptimizationRecommendation[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(targets?: Partial<PerformanceTargets>) {
    this.targets = {
      apiLatency: 200,        // ms (improved from 300ms)
      databaseLatency: 100,   // ms (improved from proposal)
      eventProcessing: 50,    // ms (new target)
      sseReconnect: 5,        // seconds (proposal requirement)
      uptime: 99.5,           // % (proposal requirement)
      rpo: 15,                // minutes (proposal requirement)
      rto: 4,                 // hours (proposal requirement)
      ...targets
    };
  }

  /**
   * Start performance monitoring
   */
  async startMonitoring(intervalMs = 30000): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Start monitoring interval
    this.monitoringInterval = setInterval(() => {
      void this.collectMetrics();
      void this.checkAlerts();
      void this.generateRecommendations();
    }, intervalMs);

    // Initial metrics collection
    await this.collectMetrics();
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      // Collect various metrics
      const apiLatency = await this.measureApiLatency();
      const databaseLatency = await this.measureDatabaseLatency();
      const eventProcessingLatency = await this.measureEventProcessingLatency();
      const sseReconnectTime = await this.measureSSEReconnectTime();
      const uptime = await this.calculateUptime();
      const queueStats = await this.getQueueStats();
      const syncStatus = await this.getSyncStatus();
      const memoryUsage = await this.getMemoryUsage();
      const cpuUsage = await this.getCpuUsage();
      const networkLatency = await this.measureNetworkLatency();
      const errorRate = await this.calculateErrorRate();
      const throughput = await this.calculateThroughput();

      const metrics: PerformanceMetrics = {
        timestamp,
        apiLatency,
        databaseLatency,
        eventProcessingLatency,
        sseReconnectTime,
        uptime,
        queueStats,
        syncStatus,
        memoryUsage,
        cpuUsage,
        networkLatency,
        errorRate,
        throughput
      };

      this.metrics.push(metrics);
      
      // Keep only last 1000 metrics to prevent memory issues
      if (this.metrics.length > 1000) {
        this.metrics.splice(0, this.metrics.length - 1000);
      }

      console.log('Performance metrics collected:', {
        apiLatency,
        databaseLatency,
        eventProcessingLatency,
        uptime,
        errorRate
      });
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }

  /**
   * Measure API latency
   */
  private async measureApiLatency(): Promise<number> {
    try {
      const startTime = performance.now();
      
      // Make a test API call
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache'
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      return response.ok ? latency : -1;
    } catch (error) {
      console.error('Failed to measure API latency:', error);
      return -1;
    }
  }

  /**
   * Measure database latency
   */
  private async measureDatabaseLatency(): Promise<number> {
    try {
      const startTime = performance.now();
      
      // Make a test database query
      const response = await fetch('/api/health/database', {
        method: 'GET',
        cache: 'no-cache'
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      return response.ok ? latency : -1;
    } catch (error) {
      console.error('Failed to measure database latency:', error);
      return -1;
    }
  }

  /**
   * Measure event processing latency
   */
  private async measureEventProcessingLatency(): Promise<number> {
    try {
      const startTime = performance.now();
      
      // Simulate event processing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      const endTime = performance.now();
      return endTime - startTime;
    } catch (error) {
      console.error('Failed to measure event processing latency:', error);
      return -1;
    }
  }

  /**
   * Measure SSE reconnect time
   */
  private async measureSSEReconnectTime(): Promise<number> {
    try {
      // This would measure actual SSE reconnection time
      // For now, return a simulated value
      return Math.random() * 5; // 0-5 seconds
    } catch (error) {
      console.error('Failed to measure SSE reconnect time:', error);
      return -1;
    }
  }

  /**
   * Calculate uptime
   */
  private async calculateUptime(): Promise<number> {
    try {
      // This would calculate actual uptime based on monitoring data
      // For now, return a simulated value
      return 99.8; // 99.8% uptime
    } catch (error) {
      console.error('Failed to calculate uptime:', error);
      return 0;
    }
  }

  /**
   * Get queue statistics
   */
  private async getQueueStats(): Promise<OfflineQueueStats> {
    try {
      // This would get actual queue stats from OfflineQueueManager
      // For now, return simulated data
      return {
        totalMutations: 150,
        pendingMutations: 25,
        processingMutations: 5,
        completedMutations: 120,
        failedMutations: 0,
        conflictMutations: 0,
        oldestPendingAge: 30000, // 30 seconds
        averageProcessingTime: 150, // 150ms
        retryRate: 2.5 // 2.5%
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        totalMutations: 0,
        pendingMutations: 0,
        processingMutations: 0,
        completedMutations: 0,
        failedMutations: 0,
        conflictMutations: 0,
        oldestPendingAge: 0,
        averageProcessingTime: 0,
        retryRate: 0
      };
    }
  }

  /**
   * Get sync status
   */
  private async getSyncStatus(): Promise<DeviceSyncStatus> {
    try {
      // This would get actual sync status from SSEBackfillService
      // For now, return simulated data
      return {
        isOnline: true,
        lastSyncAt: new Date().toISOString(),
        pendingCount: 25,
        processingCount: 5,
        failedCount: 0,
        conflictCount: 0,
        connectionQuality: 'excellent'
      } as unknown as DeviceSyncStatus;
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        isOnline: false,
        pendingCount: 0,
        processingCount: 0,
        failedCount: 0,
        conflictCount: 0,
        connectionQuality: 'offline'
      } as unknown as DeviceSyncStatus;
    }
  }

  /**
   * Get memory usage
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      if ('memory' in performance) {
        const memory = (performance as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        return memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100;
      }
      return 0;
    } catch (error) {
      console.error('Failed to get memory usage:', error);
      return 0;
    }
  }

  /**
   * Get CPU usage
   */
  private async getCpuUsage(): Promise<number> {
    try {
      // This would measure actual CPU usage
      // For now, return a simulated value
      return Math.random() * 50; // 0-50%
    } catch (error) {
      console.error('Failed to get CPU usage:', error);
      return 0;
    }
  }

  /**
   * Measure network latency
   */
  private async measureNetworkLatency(): Promise<number> {
    try {
      const startTime = performance.now();
      
      // Make a small request to measure network latency
      await fetch('/api/ping', { method: 'HEAD' });
      
      const endTime = performance.now();
      return endTime - startTime;
    } catch (error) {
      console.error('Failed to measure network latency:', error);
      return -1;
    }
  }

  /**
   * Calculate error rate
   */
  private async calculateErrorRate(): Promise<number> {
    try {
      // This would calculate actual error rate from logs/metrics
      // For now, return a simulated value
      return 0.1; // 0.1% error rate
    } catch (error) {
      console.error('Failed to calculate error rate:', error);
      return 0;
    }
  }

  /**
   * Calculate throughput
   */
  private async calculateThroughput(): Promise<number> {
    try {
      // This would calculate actual throughput
      // For now, return a simulated value
      return 1000; // 1000 requests per minute
    } catch (error) {
      console.error('Failed to calculate throughput:', error);
      return 0;
    }
  }

  /**
   * Check performance alerts
   */
  private async checkAlerts(): Promise<void> {
    if (this.metrics.length === 0) return;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    
    // Check API latency alert
    if (latestMetrics && latestMetrics.apiLatency > this.targets.apiLatency) {
      await this.createAlert({
        type: 'latency',
        severity: latestMetrics.apiLatency > this.targets.apiLatency * 2 ? 'critical' : 'high',
        message: `API latency exceeded target: ${latestMetrics.apiLatency.toFixed(2)}ms > ${this.targets.apiLatency}ms`,
        threshold: this.targets.apiLatency,
        currentValue: latestMetrics.apiLatency
      });
    }

    // Check database latency alert
    if (latestMetrics && latestMetrics.databaseLatency > this.targets.databaseLatency) {
      await this.createAlert({
        type: 'latency',
        severity: latestMetrics.databaseLatency > this.targets.databaseLatency * 2 ? 'critical' : 'high',
        message: `Database latency exceeded target: ${latestMetrics.databaseLatency.toFixed(2)}ms > ${this.targets.databaseLatency}ms`,
        threshold: this.targets.databaseLatency,
        currentValue: latestMetrics.databaseLatency
      });
    }

    // Check uptime alert
    if (latestMetrics && latestMetrics.uptime < this.targets.uptime) {
      await this.createAlert({
        type: 'uptime',
        severity: latestMetrics.uptime < this.targets.uptime * 0.95 ? 'critical' : 'high',
        message: `Uptime below target: ${latestMetrics.uptime.toFixed(2)}% < ${this.targets.uptime}%`,
        threshold: this.targets.uptime,
        currentValue: latestMetrics.uptime
      });
    }

    // Check error rate alert
    if (latestMetrics && latestMetrics.errorRate > 1) { // 1% error rate threshold
      await this.createAlert({
        type: 'error_rate',
        severity: latestMetrics.errorRate > 5 ? 'critical' : 'high',
        message: `Error rate exceeded threshold: ${latestMetrics.errorRate.toFixed(2)}% > 1%`,
        threshold: 1,
        currentValue: latestMetrics.errorRate
      });
    }

    // Check queue size alert
    if (latestMetrics && latestMetrics.queueStats.pendingMutations > 1000) {
      await this.createAlert({
        type: 'queue_size',
        severity: latestMetrics.queueStats.pendingMutations > 5000 ? 'critical' : 'high',
        message: `Queue size exceeded threshold: ${latestMetrics.queueStats.pendingMutations} > 1000`,
        threshold: 1000,
        currentValue: latestMetrics.queueStats.pendingMutations
      });
    }
  }

  /**
   * Create performance alert
   */
  private async createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const alert: PerformanceAlert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100);
    }

    console.warn('Performance alert created:', alert);
    
    // Emit alert event
    this.emitAlert(alert);
  }

  /**
   * Generate optimization recommendations
   */
  private async generateRecommendations(): Promise<void> {
    if (this.metrics.length < 10) return; // Need enough data

    const recentMetrics = this.metrics.slice(-10);
    const avgApiLatency = this.calculateAverage(recentMetrics.map(m => m.apiLatency));
    const avgDatabaseLatency = this.calculateAverage(recentMetrics.map(m => m.databaseLatency));
    const avgErrorRate = this.calculateAverage(recentMetrics.map(m => m.errorRate));

    // API latency optimization
    if (avgApiLatency > this.targets.apiLatency * 0.8) {
      await this.createRecommendation({
        type: 'performance',
        priority: avgApiLatency > this.targets.apiLatency ? 'high' : 'medium',
        title: 'Optimize API Response Times',
        description: 'API latency is approaching target threshold. Consider implementing caching, query optimization, or API response compression.',
        impact: 'Improved user experience and reduced server load',
        effort: 'medium',
        metrics: ['apiLatency', 'throughput']
      });
    }

    // Database optimization
    if (avgDatabaseLatency > this.targets.databaseLatency * 0.8) {
      await this.createRecommendation({
        type: 'performance',
        priority: avgDatabaseLatency > this.targets.databaseLatency ? 'high' : 'medium',
        title: 'Optimize Database Queries',
        description: 'Database latency is approaching target threshold. Consider adding indexes, optimizing queries, or implementing connection pooling.',
        impact: 'Faster data retrieval and improved system responsiveness',
        effort: 'high',
        metrics: ['databaseLatency', 'apiLatency']
      });
    }

    // Error rate optimization
    if (avgErrorRate > 0.5) {
      await this.createRecommendation({
        type: 'reliability',
        priority: avgErrorRate > 2 ? 'critical' : 'high',
        title: 'Reduce Error Rate',
        description: 'Error rate is above acceptable threshold. Investigate and fix common error sources.',
        impact: 'Improved system reliability and user satisfaction',
        effort: 'high',
        metrics: ['errorRate', 'uptime']
      });
    }
  }

  /**
   * Create optimization recommendation
   */
  private async createRecommendation(recData: Omit<OptimizationRecommendation, 'id' | 'timestamp'>): Promise<void> {
    const recommendation: OptimizationRecommendation = {
      ...recData,
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    // Check if similar recommendation already exists
    const existing = this.recommendations.find(r => 
      r.type === recommendation.type && 
      r.title === recommendation.title
    );

    if (!existing) {
      this.recommendations.push(recommendation);
      
      // Keep only last 50 recommendations
      if (this.recommendations.length > 50) {
        this.recommendations.splice(0, this.recommendations.length - 50);
      }

      console.log('Optimization recommendation created:', recommendation);
    }
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    const validNumbers = numbers.filter(n => n >= 0);
    if (validNumbers.length === 0) return 0;
    
    return validNumbers.reduce((sum, num) => sum + num, 0) / validNumbers.length;
  }

  /**
   * Emit alert event
   */
  private emitAlert(alert: PerformanceAlert): void {
    // This would emit the alert to the application
    console.log('Performance alert emitted:', alert);
  }

  /**
   * Get performance metrics
   */
  getMetrics(limit?: number): PerformanceMetrics[] {
    return limit ? this.metrics.slice(-limit) : this.metrics;
  }

  /**
   * Get performance alerts
   */
  getAlerts(resolved?: boolean): PerformanceAlert[] {
    if (resolved === undefined) return this.alerts;
    return this.alerts.filter(alert => alert.resolved === resolved);
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(priority?: string): OptimizationRecommendation[] {
    if (!priority) return this.recommendations;
    return this.recommendations.filter(rec => rec.priority === priority);
  }

  /**
   * Get performance targets
   */
  getTargets(): PerformanceTargets {
    return { ...this.targets };
  }

  /**
   * Update performance targets
   */
  updateTargets(newTargets: Partial<PerformanceTargets>): void {
    Object.assign(this.targets, newTargets);
    console.log('Performance targets updated:', this.targets);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      console.log('Alert resolved:', alertId);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    targets: PerformanceTargets;
    currentMetrics: PerformanceMetrics | null;
    activeAlerts: number;
    recommendations: number;
    overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  } {
    const currentMetrics = this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
    const activeAlerts = this.alerts.filter(a => !a.resolved).length;
    const recommendations = this.recommendations.length;
    
    let overallHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
    
    if (activeAlerts > 0) {
      const criticalAlerts = this.alerts.filter(a => !a.resolved && a.severity === 'critical').length;
      const highAlerts = this.alerts.filter(a => !a.resolved && a.severity === 'high').length;
      
      if (criticalAlerts > 0) {
        overallHealth = 'critical';
      } else if (highAlerts > 2) {
        overallHealth = 'warning';
      } else {
        overallHealth = 'good';
      }
    }
    
    return {
      targets: this.targets,
      currentMetrics: currentMetrics ?? null,
      activeAlerts,
      recommendations,
      overallHealth
    };
  }
}
