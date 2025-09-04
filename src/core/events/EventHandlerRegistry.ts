import type { Logger } from '../services/Logger';
import type { EventHandler, EventHandlerRegistry as IEventHandlerRegistry } from './types';

/**
 * Event Handler Registry Implementation
 * Follows Implementation Guide requirements for event handler registry
 */
export class EventHandlerRegistry implements IEventHandlerRegistry {
  private readonly handlers = new Map<string, EventHandler[]>();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register event handler
   * Implementation Guide: Event handler registry untuk async processing
   */
  register(handler: EventHandler): void {
    const eventType = handler.eventType;
    
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(handler);
    
    this.logger.info('Event handler registered', {
      eventType,
      handlerCount: this.handlers.get(eventType)!.length
    });
  }

  /**
   * Unregister event handler
   */
  unregister(eventType: string): void {
    const removed = this.handlers.delete(eventType);
    
    if (removed) {
      this.logger.info('Event handler unregistered', {
        eventType
      });
    }
  }

  /**
   * Get handlers for specific event type
   */
  getHandlers(eventType: string): EventHandler[] {
    return this.handlers.get(eventType) ?? [];
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): EventHandler[] {
    const allHandlers: EventHandler[] = [];
    for (const handlers of this.handlers.values()) {
      allHandlers.push(...handlers);
    }
    return allHandlers;
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if event type has handlers
   */
  hasHandlers(eventType: string): boolean {
    return this.handlers.has(eventType) && this.handlers.get(eventType)!.length > 0;
  }

  /**
   * Get handler count for event type
   */
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length ?? 0;
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    const eventTypeCount = this.handlers.size;
    this.handlers.clear();
    
    this.logger.info('All event handlers cleared', {
      clearedEventTypes: eventTypeCount
    });
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalEventTypes: number;
    totalHandlers: number;
    eventTypes: string[];
    handlerCounts: Record<string, number>;
  } {
    const eventTypes = Array.from(this.handlers.keys());
    const handlerCounts: Record<string, number> = {};
    
    for (const [eventType, handlers] of this.handlers.entries()) {
      handlerCounts[eventType] = handlers.length;
    }
    
    const totalHandlers = Object.values(handlerCounts).reduce((sum, count) => sum + count, 0);
    
    return {
      totalEventTypes: eventTypes.length,
      totalHandlers,
      eventTypes,
      handlerCounts
    };
  }
}
