import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { Logger } from './Logger';
import { BaseService } from './BaseService';
import { DatabaseError, DatabaseConnectionError } from './ErrorHandler';

/**
 * Database Service - Enterprise-grade database operations and monitoring
 * Follows Implementation Guide requirements for database performance and optimization
 */

export interface DatabaseStats {
  connectionCount: number;
  activeConnections: number;
  idleConnections: number;
  queryCount: number;
  slowQueryCount: number;
  averageQueryTime: number;
}

export interface QueryPerformance {
  query: string;
  executionTime: number;
  timestamp: Date;
  tenantId: string;
  userId?: string;
}

export interface IndexUsage {
  tableName: string;
  indexName: string;
  scans: number;
  tuplesRead: number;
  tuplesFetched: number;
}

/**
 * Database Service Class
 * Implementation Guide: Database performance monitoring and optimization
 */
export class DatabaseService extends BaseService<unknown> {
  constructor(
    prisma: PrismaClient,
    redis: Redis,
    logger: Logger,
    tenantId: string
  ) {
    super(prisma, redis, logger, tenantId);
  }

  /**
   * Health check for database connection
   * Implementation Guide: Database health monitoring
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    try {
      const startTime = Date.now();
      
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1 as health_check`;
      
      const responseTime = Date.now() - startTime;
      
      const health = {
        healthy: true,
        responseTime,
        timestamp: new Date().toISOString(),
        database: 'postgresql',
        status: 'connected'
      };

      this.logger.info('Database health check passed', {
        tenantId: this.tenantId,
        responseTime,
        status: 'healthy'
      });

      return {
        ...health,
        details: {
          database: health.database,
          status: health.status,
          responseTime: health.responseTime
        }
      };

    } catch (error) {
      this.logger.error('Database health check failed', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          database: 'postgresql',
          status: 'disconnected'
        }
      };
    }
  }

  /**
   * Get database performance statistics
   * Implementation Guide: Performance monitoring and SLOs
   */
  async getPerformanceStats(): Promise<DatabaseStats> {
    try {
      this.validateTenantContext();

      // Get connection pool statistics
      const connectionStats = await this.getConnectionStats();
      
      // Get query performance statistics
      const queryStats = await this.getQueryStats();

      const stats: DatabaseStats = {
        connectionCount: connectionStats.totalConnections,
        activeConnections: connectionStats.activeConnections,
        idleConnections: connectionStats.idleConnections,
        queryCount: queryStats.totalQueries,
        slowQueryCount: queryStats.slowQueries,
        averageQueryTime: queryStats.averageTime
      };

      this.logger.debug('Database performance stats retrieved', {
        tenantId: this.tenantId,
        stats
      });

      return stats;

    } catch (error) {
      this.logger.error('Failed to get database performance stats', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new DatabaseError('Failed to get performance statistics', {
        tenantId: this.tenantId,
        operation: 'getPerformanceStats'
      });
    }
  }

  /**
   * Get connection pool statistics
   */
  private async getConnectionStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
  }> {
    try {
      const result = await this.prisma.$queryRaw<[{
        total: bigint;
        active: bigint;
        idle: bigint;
      }]>`
        SELECT 
          count(*) as total,
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;

      const stats = result[0];
      return {
        totalConnections: Number(stats.total),
        activeConnections: Number(stats.active),
        idleConnections: Number(stats.idle)
      };

    } catch (error) {
      this.logger.warn('Failed to get connection stats, using defaults', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0
      };
    }
  }

  /**
   * Get query performance statistics
   */
  private async getQueryStats(): Promise<{
    totalQueries: number;
    slowQueries: number;
    averageTime: number;
  }> {
    try {
      // Check if pg_stat_statements extension is available
      const extensionResult = await this.prisma.$queryRaw<Array<{ extname: string }>>`
        SELECT extname FROM pg_extension WHERE extname = 'pg_stat_statements'
      `;

      if (extensionResult.length === 0) {
        this.logger.warn('pg_stat_statements extension not available', {
          tenantId: this.tenantId
        });
        
        return {
          totalQueries: 0,
          slowQueries: 0,
          averageTime: 0
        };
      }

      const result = await this.prisma.$queryRaw<[{
        total_calls: bigint;
        total_time: bigint;
        mean_time: bigint;
        slow_queries: bigint;
      }]>`
        SELECT 
          sum(calls) as total_calls,
          sum(total_time) as total_time,
          avg(mean_time) as mean_time,
          count(*) FILTER (WHERE mean_time > 100) as slow_queries
        FROM pg_stat_statements
      `;

      const stats = result[0];
      return {
        totalQueries: Number(stats.total_calls || 0),
        slowQueries: Number(stats.slow_queries || 0),
        averageTime: Number(stats.mean_time || 0)
      };

    } catch (error) {
      this.logger.warn('Failed to get query stats, using defaults', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageTime: 0
      };
    }
  }

  /**
   * Get index usage statistics
   * Implementation Guide: Index optimization recommendations
   */
  async getIndexUsageStats(): Promise<IndexUsage[]> {
    try {
      this.validateTenantContext();

      const result = await this.prisma.$queryRaw<[{
        schemaname: string;
        tablename: string;
        indexname: string;
        idx_scan: bigint;
        idx_tup_read: bigint;
        idx_tup_fetch: bigint;
      }]>`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY idx_scan DESC
        LIMIT 50
      `;

      const indexUsage: IndexUsage[] = result.map(row => ({
        tableName: `${row.schemaname}.${row.tablename}`,
        indexName: row.indexname,
        scans: Number(row.idx_scan || 0),
        tuplesRead: Number(row.idx_tup_read || 0),
        tuplesFetched: Number(row.idx_tup_fetch || 0)
      }));

      this.logger.debug('Index usage stats retrieved', {
        tenantId: this.tenantId,
        indexCount: indexUsage.length
      });

      return indexUsage;

    } catch (error) {
      this.logger.error('Failed to get index usage stats', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new DatabaseError('Failed to get index usage statistics', {
        tenantId: this.tenantId,
        operation: 'getIndexUsageStats'
      });
    }
  }

  /**
   * Get table statistics
   * Implementation Guide: Table performance monitoring
   */
  async getTableStats(): Promise<Record<string, any>> {
    try {
      this.validateTenantContext();

      const result = await this.prisma.$queryRaw<[{
        schemaname: string;
        tablename: string;
        n_tup_ins: bigint;
        n_tup_upd: bigint;
        n_tup_del: bigint;
        n_live_tup: bigint;
        n_dead_tup: bigint;
        last_vacuum: Date | null;
        last_autovacuum: Date | null;
        last_analyze: Date | null;
        last_autoanalyze: Date | null;
      }]>`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          n_live_tup,
          n_dead_tup,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY n_live_tup DESC
        LIMIT 50
      `;

      const tableStats: Record<string, any> = {};
      result.forEach(row => {
        const tableName = `${row.schemaname}.${row.tablename}`;
        tableStats[tableName] = {
          inserts: Number(row.n_tup_ins || 0),
          updates: Number(row.n_tup_upd || 0),
          deletes: Number(row.n_tup_del || 0),
          liveTuples: Number(row.n_live_tup || 0),
          deadTuples: Number(row.n_dead_tup || 0),
          lastVacuum: row.last_vacuum,
          lastAutovacuum: row.last_autovacuum,
          lastAnalyze: row.last_analyze,
          lastAutoanalyze: row.last_autoanalyze
        };
      });

      this.logger.debug('Table stats retrieved', {
        tenantId: this.tenantId,
        tableCount: Object.keys(tableStats).length
      });

      return tableStats;

    } catch (error) {
      this.logger.error('Failed to get table stats', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new DatabaseError('Failed to get table statistics', {
        tenantId: this.tenantId,
        operation: 'getTableStats'
      });
    }
  }

  /**
   * Execute database maintenance tasks
   * Implementation Guide: Database optimization and maintenance
   */
  async performMaintenance(): Promise<{ success: boolean; details: Record<string, any> }> {
    try {
      this.validateTenantContext();

      const startTime = Date.now();
      const results: Record<string, any> = {};

      // Analyze tables for better query planning
      try {
        await this.prisma.$executeRaw`ANALYZE`;
        results.analyze = 'completed';
      } catch (error) {
        results.analyze = 'failed';
        this.logger.warn('Table analysis failed', {
          tenantId: this.tenantId,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Vacuum tables to reclaim storage
      try {
        await this.prisma.$executeRaw`VACUUM ANALYZE`;
        results.vacuum = 'completed';
      } catch (error) {
        results.vacuum = 'failed';
        this.logger.warn('Table vacuum failed', {
          tenantId: this.tenantId,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      const duration = Date.now() - startTime;
      results.duration = duration;
      results.timestamp = new Date().toISOString();

      this.logger.info('Database maintenance completed', {
        tenantId: this.tenantId,
        results,
        duration
      });

      return {
        success: true,
        details: results
      };

    } catch (error) {
      this.logger.error('Database maintenance failed', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get database size information
   */
  async getDatabaseSize(): Promise<Record<string, any>> {
    try {
      this.validateTenantContext();

      const result = await this.prisma.$queryRaw<[{
        database_name: string;
        size: string;
        size_bytes: bigint;
      }]>`
        SELECT 
          datname as database_name,
          pg_size_pretty(pg_database_size(datname)) as size,
          pg_database_size(datname) as size_bytes
        FROM pg_database
        WHERE datname = current_database()
      `;

      const sizeInfo = result[0];
      
      return {
        databaseName: sizeInfo.database_name,
        size: sizeInfo.size,
        sizeBytes: Number(sizeInfo.size_bytes),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to get database size', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new DatabaseError('Failed to get database size', {
        tenantId: this.tenantId,
        operation: 'getDatabaseSize'
      });
    }
  }
}
