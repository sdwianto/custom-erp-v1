/**
 * Database Health Check API
 * Used by PerformanceMonitor to measure database latency
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const startTime = performance.now();
  
  try {
    // Simple database query to measure latency
    await prisma.$queryRaw`SELECT 1`;
    
    const endTime = performance.now();
    const latency = endTime - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      latency: Math.round(latency * 100) / 100, // Round to 2 decimal places
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const endTime = performance.now();
    const latency = endTime - startTime;
    
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      latency: Math.round(latency * 100) / 100,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
