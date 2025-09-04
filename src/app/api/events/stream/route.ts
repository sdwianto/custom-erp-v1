import type { NextRequest } from 'next/server';
import { redis, getTenantStreamKey } from '@/core/cache/redis';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') ?? '0';
  const tenantId = searchParams.get('tenant') ?? 'default';
  const limit = parseInt(searchParams.get('limit') ?? '100');

  // Set SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  };

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      let isConnected = true;
      let heartbeatInterval: NodeJS.Timeout;

      // Send initial connection message
      const sendEvent = (data: unknown, eventType = 'message') => {
        if (!isConnected) return;
        
        const event = `event: ${eventType}\n`;
        const dataStr = `data: ${JSON.stringify(data)}\n\n`;
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(event + dataStr));
      };

      // Send heartbeat every 15 seconds
      const startHeartbeat = () => {
        heartbeatInterval = setInterval(() => {
          sendEvent({ type: 'heartbeat', timestamp: new Date().toISOString() }, 'heartbeat');
        }, 15000);
      };

      // Send initial backfill events
      const sendBackfill = async () => {
        try {
          const streamKey = getTenantStreamKey(tenantId);
          
          // Read from Redis Streams for backfill
          const streamData = await redis.xread(
            'COUNT',
            limit,
            'STREAMS',
            streamKey,
            cursor
          );

          if (streamData && streamData.length > 0) {
            const streamEntry = streamData[0];
            if (Array.isArray(streamEntry) && streamEntry.length >= 2) {
              const [, messages] = streamEntry;
              
              if (Array.isArray(messages)) {
                for (const message of messages) {
                  if (Array.isArray(message) && message.length >= 2) {
                    const [id, fields] = message;
                    const eventData = fields.find((field: unknown) => 
                      Array.isArray(field) && field[0] === 'event'
                    ) as [string, string] | undefined;
                    if (eventData?.[1]) {
                      try {
                        const event = JSON.parse(eventData[1]) as Record<string, unknown>;
                        sendEvent({
                          ...event,
                          streamId: id,
                          isBackfill: true
                        }, 'backfill');
                      } catch (error) {
                        console.error('Failed to parse backfill event:', error);
                      }
                    }
                  }
                }
              }
            }
          }

          // Send backfill complete message
          sendEvent({ 
            type: 'backfill.complete', 
            timestamp: new Date().toISOString() 
          }, 'system');

          // Start heartbeat after backfill
          startHeartbeat();

        } catch (error) {
          console.error('Backfill failed:', error);
          sendEvent({ 
            type: 'error', 
            message: 'Backfill failed',
            timestamp: new Date().toISOString() 
          }, 'error');
        }
      };

      // Send connection established message
      sendEvent({ 
        type: 'connected', 
        tenantId,
        timestamp: new Date().toISOString() 
      }, 'system');

      // Start backfill process
      void sendBackfill();

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        isConnected = false;
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        controller.close();
      });

      // Handle stream close
      request.signal.addEventListener('abort', () => {
        isConnected = false;
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}

// Handle preflight request
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    },
  });
}
