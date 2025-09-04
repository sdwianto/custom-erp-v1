/**
 * Sync Mutate API Endpoint
 * Implementation Guide: Hybrid Online/Offline Engine - Sync Contracts
 * 
 * Handles mutation sync with:
 * - Idempotency checking
 * - Version conflict detection
 * - Server-authoritative merge
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ulid } from 'ulid';

// Validation schemas
const LocalMutationSchema = z.object({
  id: z.string(),
  kind: z.string(),
  payload: z.unknown(),
  idempotencyKey: z.string(),
  baseVersion: z.number().optional(),
  createdAt: z.string(),
  priority: z.number().min(1).max(10),
  retryCount: z.number(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'conflict']),
  tenantId: z.string(),
  userId: z.string()
});

const MutateRequestSchema = z.object({
  mutation: LocalMutationSchema,
  baseVersion: z.number().optional()
});

// In-memory idempotency store (in production, use Redis or database)
const idempotencyStore = new Map<string, {
  result: unknown;
  committedAt: string;
  ttl: number;
}>();

// In-memory entity versions (in production, use database)
const entityVersions = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json() as Record<string, unknown>;
    const { mutation, baseVersion } = MutateRequestSchema.parse(body) as {
      mutation: Record<string, unknown>;
      baseVersion?: number;
    };

    // Get idempotency key from header or mutation
    const idempotencyKey = request.headers.get('Idempotency-Key') ?? (mutation.idempotencyKey as string);
    
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Idempotency-Key header is required' },
        { status: 400 }
      );
    }

    // Check idempotency
    const existingResult = await checkIdempotency(idempotencyKey, mutation.tenantId as string, mutation.userId as string);
    if (existingResult) {
      return NextResponse.json({
        success: true,
        idempotent: true,
        data: existingResult.result,
        message: 'Operation already processed'
      });
    }

    // Check version conflicts
    const versionConflict = await checkVersionConflict(
      mutation.kind as string,
      mutation.tenantId as string,
      baseVersion ?? (mutation.baseVersion as number | undefined)
    );

    if (versionConflict.hasConflict) {
      return NextResponse.json({
        success: false,
        conflict: true,
        serverData: versionConflict.serverData,
        clientData: mutation.payload,
        message: 'Version conflict detected'
      }, { status: 409 });
    }

    // Process mutation
    const result = await processMutation(mutation as { kind: string; payload: Record<string, unknown>; });

    // Store idempotency result
    await storeIdempotencyResult(idempotencyKey, mutation.tenantId as string, mutation.userId as string, result);

    // Update entity version
    await updateEntityVersion(mutation.kind as string, mutation.tenantId as string);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Mutation processed successfully'
    });

  } catch (error) {
    console.error('Sync mutate error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check idempotency
 */
async function checkIdempotency(
  key: string,
  tenantId: string,
  userId: string
): Promise<{ result: unknown; committedAt: string; ttl: number } | null> {
  const storeKey = `${tenantId}:${userId}:${key}`;
  const record = idempotencyStore.get(storeKey);
  
  if (!record) {
    return null;
  }

  // Check TTL
  const now = Date.now();
  const committedAt = new Date(record.committedAt).getTime();
  const ttlMs = record.ttl * 1000;
  
  if (now - committedAt > ttlMs) {
    idempotencyStore.delete(storeKey);
    return null;
  }

  return record;
}

/**
 * Store idempotency result
 */
async function storeIdempotencyResult(
  key: string,
  tenantId: string,
  userId: string,
  result: unknown
): Promise<void> {
  const storeKey = `${tenantId}:${userId}:${key}`;
  const record = {
    result,
    committedAt: new Date().toISOString(),
    ttl: 3600 // 1 hour TTL
  };
  
  idempotencyStore.set(storeKey, record);
}

/**
 * Check version conflict
 */
async function checkVersionConflict(
  kind: string,
  tenantId: string,
  clientVersion?: number
): Promise<{
  hasConflict: boolean;
  serverData?: unknown;
}> {
  if (!clientVersion) {
    return { hasConflict: false };
  }

  const entityKey = `${tenantId}:${kind}`;
  const serverVersion = entityVersions.get(entityKey) ?? 0;

  if (serverVersion > clientVersion) {
    // Simulate server data
    const serverData = {
      id: ulid(),
      version: serverVersion,
      updatedAt: new Date().toISOString(),
      data: `Server data for ${kind}`
    };

    return {
      hasConflict: true,
      serverData
    };
  }

  return { hasConflict: false };
}

/**
 * Process mutation
 */
async function processMutation(mutation: {
  kind: string;
  payload: Record<string, unknown>;
}): Promise<unknown> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

  // Simulate different processing based on mutation kind
  switch (mutation.kind) {
    case 'inventory.item.created':
      return {
        id: ulid(),
        type: 'item',
        name: mutation.payload.name,
        quantity: mutation.payload.quantity,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

    case 'inventory.item.updated':
      return {
        id: mutation.payload.id,
        type: 'item',
        name: mutation.payload.name,
        quantity: mutation.payload.quantity,
        version: ((mutation.payload.version as number) ?? 0) + 1,
        updatedAt: new Date().toISOString()
      };

    case 'operations.equipment.usage':
      return {
        id: ulid(),
        type: 'equipment_usage',
        equipmentId: mutation.payload.equipmentId,
        hours: mutation.payload.hours,
        timestamp: new Date().toISOString(),
        version: 1
      };

    default:
      return {
        id: ulid(),
        type: 'generic',
        kind: mutation.kind,
        data: mutation.payload,
        version: 1,
        processedAt: new Date().toISOString()
      };
  }
}

/**
 * Update entity version
 */
async function updateEntityVersion(kind: string, tenantId: string): Promise<void> {
  const entityKey = `${tenantId}:${kind}`;
  const currentVersion = entityVersions.get(entityKey) ?? 0;
  entityVersions.set(entityKey, currentVersion + 1);
}

/**
 * Cleanup expired idempotency records
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    const committedAt = new Date(record.committedAt).getTime();
    const ttlMs = record.ttl * 1000;
    
    if (now - committedAt > ttlMs) {
      idempotencyStore.delete(key);
    }
  }
}, 300000); // Cleanup every 5 minutes
