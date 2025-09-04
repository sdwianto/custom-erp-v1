import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { Logger } from '../Logger';
import { BaseService } from '../BaseService';
import { AuditService } from '../AuditService';
import { ValidationService } from '../ValidationService';
import { EntityNotFoundError, ValidationError } from '../ErrorHandler';

/**
 * Item Service - Enterprise-grade inventory management
 * Follows Implementation Guide requirements for inventory operations
 */

export interface CreateItemRequest extends Record<string, unknown> {
  number: string;
  description: string;
  type: string;
  stdCost?: number;
  lastCost?: number;
  avgCost?: number;
}

export interface UpdateItemRequest {
  description?: string;
  type?: string;
  stdCost?: number;
  lastCost?: number;
  avgCost?: number;
}

export interface ItemQuery {
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ItemService extends BaseService<unknown> {
  private readonly auditService: AuditService;
  private readonly validationService: ValidationService;

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    logger: Logger,
    tenantId: string
  ) {
    super(prisma, redis, logger, tenantId);
    this.auditService = new AuditService(prisma, redis, logger, tenantId);
    this.validationService = new ValidationService(this.logger);
  }

  /**
   * Create new item
   * Implementation Guide: Validation, audit logging, caching
   */
  async createItem(request: CreateItemRequest, userId: string): Promise<any> {
    try {
      this.validateTenantContext();

      // Validate request
      const validationResult = this.validationService.validateObject(request, [
        { field: 'number', required: true, type: 'string', minLength: 1, maxLength: 50 },
        { field: 'description', required: true, type: 'string', minLength: 1, maxLength: 255 },
        { field: 'type', required: true, type: 'string', minLength: 1, maxLength: 50 }
      ]);

      if (!validationResult.isValid) {
        throw new ValidationError('Invalid item data', {
          tenantId: this.tenantId,
          userId,
          errors: validationResult.errors
        });
      }

      // Check if item number already exists
      const existingItem = await this.prisma.item.findFirst({
        where: {
          number: request.number,
          tenantId: this.tenantId,
          isDeleted: false
        }
      });

      if (existingItem) {
        throw new ValidationError('Item number already exists', {
          tenantId: this.tenantId,
          userId,
          itemNumber: request.number
        });
      }

      // Create item
      const item = await this.prisma.item.create({
        data: {
          ...request,
          tenantId: this.tenantId,
          createdBy: userId,
          updatedBy: userId
        }
      });

      // Log audit event
      await this.auditService.logEvent({
        tenantId: this.tenantId,
        actorId: userId,
        entity: 'Item',
        entityId: item.id,
        action: 'created',
        changes: { newValues: item, metadata: { source: 'ItemService.createItem' } }
      });

      // Invalidate related cache
      await this.invalidateCache('items:*');

      this.logger.info('Item created successfully', {
        tenantId: this.tenantId,
        userId,
        itemId: item.id,
        itemNumber: item.number
      });

      return item;

    } catch (error) {
      this.logger.error('Failed to create item', {
        tenantId: this.tenantId,
        userId,
        request,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get item by ID
   * Implementation Guide: Caching strategy
   */
  async getItemById(itemId: string, userId: string): Promise<any> {
    try {
      this.validateTenantContext();

      // Try to get from cache first
      const cachedItem = await this.getCachedOrFetch(
        `item:${itemId}`,
        async () => {
          const item = await this.prisma.item.findFirst({
            where: {
              id: itemId,
              tenantId: this.tenantId,
              isDeleted: false
            }
          });

          if (!item) {
            throw new EntityNotFoundError('Item', itemId, {
              tenantId: this.tenantId,
              userId
            });
          }

          return item;
        },
        1800 // 30 minutes TTL
      );

      return cachedItem;

    } catch (error) {
      this.logger.error('Failed to get item by ID', {
        tenantId: this.tenantId,
        userId,
        itemId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update item
   * Implementation Guide: Version control and conflict detection
   */
  async updateItem(
    itemId: string,
    request: UpdateItemRequest,
    userId: string,
    baseVersion?: number
  ): Promise<any> {
    try {
      this.validateTenantContext();

      // Get current item
      const currentItem = await this.prisma.item.findFirst({
        where: {
          id: itemId,
          tenantId: this.tenantId,
          isDeleted: false
        }
      });

      if (!currentItem) {
        throw new EntityNotFoundError('Item', itemId, {
          tenantId: this.tenantId,
          userId
        });
      }

      // Version conflict check
      if (baseVersion && currentItem.version !== baseVersion) {
        throw new ValidationError('Item has been modified by another user', {
          tenantId: this.tenantId,
          userId,
          itemId,
          currentVersion: currentItem.version,
          baseVersion
        });
      }

      // Update item
      const updatedItem = await this.prisma.item.update({
        where: { id: itemId },
        data: {
          ...request,
          updatedBy: userId,
          version: { increment: 1 }
        }
      });

      // Log audit event
      await this.auditService.logEvent({
        tenantId: this.tenantId,
        actorId: userId,
        entity: 'Item',
        entityId: itemId,
        action: 'updated',
        changes: { 
          oldValues: currentItem, 
          newValues: updatedItem, 
          metadata: { source: 'ItemService.updateItem' } 
        }
      });

      // Invalidate related cache
      await this.invalidateCache(`item:${itemId}`);
      await this.invalidateCache('items:*');

      this.logger.info('Item updated successfully', {
        tenantId: this.tenantId,
        userId,
        itemId,
        itemNumber: updatedItem.number
      });

      return updatedItem;

    } catch (error) {
      this.logger.error('Failed to update item', {
        tenantId: this.tenantId,
        userId,
        itemId,
        request,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete item (soft delete)
   * Implementation Guide: Soft delete with audit trail
   */
  async deleteItem(itemId: string, userId: string): Promise<void> {
    try {
      this.validateTenantContext();

      // Get current item
      const currentItem = await this.prisma.item.findFirst({
        where: {
          id: itemId,
          tenantId: this.tenantId,
          isDeleted: false
        }
      });

      if (!currentItem) {
        throw new EntityNotFoundError('Item', itemId, {
          tenantId: this.tenantId,
          userId
        });
      }

      // Soft delete
      await this.prisma.item.update({
        where: { id: itemId },
        data: {
          isDeleted: true,
          updatedBy: userId,
          version: { increment: 1 }
        }
      });

      // Log audit event
      await this.auditService.logEvent({
        tenantId: this.tenantId,
        actorId: userId,
        entity: 'Item',
        entityId: itemId,
        action: 'deleted',
        changes: { 
          oldValues: currentItem, 
          metadata: { source: 'ItemService.deleteItem' } 
        }
      });

      // Invalidate related cache
      await this.invalidateCache(`item:${itemId}`);
      await this.invalidateCache('items:*');

      this.logger.info('Item deleted successfully', {
        tenantId: this.tenantId,
        userId,
        itemId,
        itemNumber: currentItem.number
      });

    } catch (error) {
      this.logger.error('Failed to delete item', {
        tenantId: this.tenantId,
        userId,
        itemId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get items with pagination and filtering
   * Implementation Guide: Caching and performance optimization
   */
  async getItems(query: ItemQuery, userId: string): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      this.validateTenantContext();

      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Record<string, unknown> = {
        tenantId: this.tenantId,
        isDeleted: false
      };

      if (query.type) {
        where.type = query.type;
      }

      if (query.search) {
        where.OR = [
          { number: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } }
        ];
      }

      // Get total count
      const total = await this.prisma.item.count({ where });

      // Get items
      const items = await this.prisma.item.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      this.logger.error('Failed to get items', {
        tenantId: this.tenantId,
        userId,
        query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get item statistics
   * Implementation Guide: Performance monitoring
   */
  async getItemStats(userId: string): Promise<{
    totalItems: number;
    itemsByType: Record<string, number>;
    totalValue: number;
  }> {
    try {
      this.validateTenantContext();

      // Get total count
      const totalItems = await this.prisma.item.count({
        where: {
          tenantId: this.tenantId,
          isDeleted: false
        }
      });

      // Get count by type
      const itemsByType = await this.prisma.item.groupBy({
        by: ['type'],
        where: {
          tenantId: this.tenantId,
          isDeleted: false
        },
        _count: {
          type: true
        }
      });

      // Calculate total value
      const totalValueResult = await this.prisma.item.aggregate({
        where: {
          tenantId: this.tenantId,
          isDeleted: false
        },
        _sum: {
          avgCost: true
        }
      });

      const totalValue = Number(totalValueResult._sum.avgCost ?? 0);

      return {
        totalItems,
        itemsByType: itemsByType.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {} as Record<string, number>),
        totalValue
      };

    } catch (error) {
      this.logger.error('Failed to get item stats', {
        tenantId: this.tenantId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
