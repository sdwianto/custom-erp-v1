/**
 * Events Backfill API Endpoint
 * Implementation Guide: Hybrid Online/Offline Engine - Backfill mechanism
 * 
 * Provides backfill functionality:
 * - Redis Streams integration
 * - Cursor tracking per client
 * - Ordered event delivery
 * - Performance optimization
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ulid } from 'ulid';

// Validation schemas
const BackfillRequestSchema = z.object({
  tenantId: z.string(),
  cursor: z.string(),
  limit: z.number().min(1).max(1000).default(100),
  includeDeleted: z.boolean().default(false)
});

// In-memory event store (in production, use Redis Streams)
const eventStore = new Map<string, Array<{
  id: string;
  type: string;
  entity: string;
  entityId: string;
  version: number;
  timestamp: string;
  payload: unknown;
  deleted?: boolean;
}>>();

// Initialize with some sample events
function initializeEventStore() {
  if (eventStore.size === 0) {
    const tenantId = 'default-tenant';
    const events = [
      {
        id: '01HZ1234567890ABCDEFGHIJK',
        type: 'inventory.item.created',
        entity: 'Item',
        entityId: 'item-001',
        version: 1,
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        payload: {
          name: 'Sample Item 1',
          quantity: 100,
          category: 'Equipment'
        }
      },
      {
        id: '01HZ1234567890ABCDEFGHIJL',
        type: 'inventory.item.updated',
        entity: 'Item',
        entityId: 'item-001',
        version: 2,
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        payload: {
          name: 'Sample Item 1 Updated',
          quantity: 95,
          category: 'Equipment'
        }
      },
      {
        id: '01HZ1234567890ABCDEFGHIJM',
        type: 'operations.equipment.usage',
        entity: 'EquipmentUsage',
        entityId: 'usage-001',
        version: 1,
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        payload: {
          equipmentId: 'equipment-001',
          hours: 8.5,
          operator: 'John Doe'
        }
      }
    ];
    
    eventStore.set(tenantId, events);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize event store if needed
    initializeEventStore();

    // Parse and validate request
    const body = await request.json() as Record<string, unknown>;
    const { tenantId, cursor, limit, includeDeleted } = BackfillRequestSchema.parse(body);

    // Get events for tenant
    const tenantEvents = eventStore.get(tenantId) ?? [];
    
    // Filter events based on cursor
    const filteredEvents = filterEventsByCursor(tenantEvents, cursor);
    
    // Apply limit
    const limitedEvents = filteredEvents.slice(0, limit);
    
    // Filter deleted events if not requested
    const finalEvents = includeDeleted 
      ? limitedEvents 
      : limitedEvents.filter(event => !event.deleted);

    // Generate next cursor
    const nextCursor = finalEvents.length > 0 
      ? finalEvents[finalEvents.length - 1]?.id ?? cursor
      : cursor;

    // Check if there are more events
    const hasMore = filteredEvents.length > limit;

    const result = {
      events: finalEvents,
      nextCursor,
      hasMore,
      totalCount: finalEvents.length,
      cursor: cursor,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Backfill error:', error);
    
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
 * Filter events by cursor
 */
function filterEventsByCursor(
  events: Array<{
    id: string;
    type: string;
    entity: string;
    entityId: string;
    version: number;
    timestamp: string;
    payload: unknown;
    deleted?: boolean;
  }>,
  cursor: string
): Array<{
  id: string;
  type: string;
  entity: string;
  entityId: string;
  version: number;
  timestamp: string;
  payload: unknown;
  deleted?: boolean;
}> {
  if (cursor === '0-0' || cursor === '') {
    return events;
  }

  // Find the index of the cursor event
  const cursorIndex = events.findIndex(event => event.id === cursor);
  
  if (cursorIndex === -1) {
    // Cursor not found, return all events
    return events;
  }

  // Return events after the cursor
  return events.slice(cursorIndex + 1);
}

/**
 * Add sample event (for testing)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { tenantId, type, entity, entityId, payload } = body as {
      tenantId: string;
      type: string;
      entity: string;
      entityId: string;
      payload?: unknown;
    };

    if (!tenantId || !type || !entity || !entityId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize event store if needed
    initializeEventStore();

    const event = {
      id: ulid(),
      type,
      entity,
      entityId,
      version: 1,
      timestamp: new Date().toISOString(),
      payload: payload ?? {}
    };

    const tenantEvents = eventStore.get(tenantId) ?? [];
    tenantEvents.push(event);
    eventStore.set(tenantId, tenantEvents);

    return NextResponse.json({
      success: true,
      event,
      message: 'Event added successfully'
    });

  } catch (error) {
    console.error('Add event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get event statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    // Initialize event store if needed
    initializeEventStore();

    if (tenantId) {
      const tenantEvents = eventStore.get(tenantId) ?? [];
      return NextResponse.json({
        tenantId,
        totalEvents: tenantEvents.length,
        eventTypes: [...new Set(tenantEvents.map(e => e.type))],
        entities: [...new Set(tenantEvents.map(e => e.entity))],
        lastEvent: tenantEvents[tenantEvents.length - 1] ?? null
      });
    } else {
      const stats = Array.from(eventStore.entries()).map(([tenant, events]) => ({
        tenantId: tenant,
        totalEvents: events.length,
        eventTypes: [...new Set(events.map(e => e.type))],
        entities: [...new Set(events.map(e => e.entity))],
        lastEvent: events[events.length - 1] ?? null
      }));

      return NextResponse.json({
        tenants: stats,
        totalTenants: eventStore.size
      });
    }

  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
