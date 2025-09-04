import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { checkRedisHealth } from '@/core/cache/redis';

const prisma = new PrismaClient();

export async function GET() {
  const startTime = Date.now();
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks: {
      database: 'unknown',
      redis: 'unknown',
      uptime: process.uptime(),
    },
    responseTime: 0,
  };

  try {
    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = 'healthy';
    } catch (error) {
      health.checks.database = 'unhealthy';
      health.status = 'degraded';
      console.error('Database health check failed:', error);
    }

    // Check Redis connection
    try {
      const redisHealthy = await checkRedisHealth();
      health.checks.redis = redisHealthy ? 'healthy' : 'unhealthy';
      if (!redisHealthy) {
        health.status = 'degraded';
      }
    } catch (error) {
      health.checks.redis = 'unhealthy';
      health.status = 'degraded';
      console.error('Redis health check failed:', error);
    }

    // Calculate response time
    health.responseTime = Date.now() - startTime;

    // Determine overall status
    if (health.checks.database === 'unhealthy' && health.checks.redis === 'unhealthy') {
      health.status = 'down';
    }

    const statusCode = health.status === 'down' ? 503 : health.status === 'degraded' ? 200 : 200;

    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    health.status = 'down';
    health.responseTime = Date.now() - startTime;
    console.error('Health check failed:', error);
    
    return NextResponse.json(health, { status: 503 });
  } finally {
    await prisma.$disconnect();
  }
}
