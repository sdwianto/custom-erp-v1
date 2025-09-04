import { type PrismaClient, type Product, type InventoryTransaction, InventoryTransactionType } from '@prisma/client';
import { BaseService } from './BaseService';
import { z } from 'zod';

// Validation schemas
const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  sku: z.string().min(1).max(100),
  price: z.number().positive(),
  costPrice: z.number().positive(),
  minStockLevel: z.number().min(0).default(0),
  maxStockLevel: z.number().min(0).optional(),
  unitOfMeasure: z.string().default('PCS'),
  reorderPoint: z.number().min(0).default(0),
  reorderQuantity: z.number().min(1).default(1),
  safetyStock: z.number().min(0).default(0),
  leadTimeDays: z.number().min(0).default(0),
  lotSize: z.number().min(1).default(1),
});

const UpdateProductSchema = CreateProductSchema.partial();

const InventoryTransactionSchema = z.object({
  productId: z.string().uuid(),
  transactionType: z.nativeEnum(InventoryTransactionType),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).default(0),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
  lotNumber: z.string().optional(),
  binLocation: z.string().optional(),
});

export class InventoryService extends BaseService {
  constructor(prisma: PrismaClient, tenantId: string, userId: string) {
    super(prisma, tenantId, userId);
  }

  /**
   * Create a new product with validation
   */
  async createProduct(data: z.infer<typeof CreateProductSchema>): Promise<Product> {
    const result = await this.ensureIdempotency(
      `create_product_${data.code}`,
      async () => {
        // Validate input
        const validatedData = CreateProductSchema.parse(data);
        
        // Check if product code already exists
        const existingProduct = await this.prisma.product.findFirst({
          where: {
            code: validatedData.code,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (existingProduct) {
          throw new Error('Product with this code already exists');
        }

        // Check if SKU already exists
        const existingSku = await this.prisma.product.findFirst({
          where: {
            sku: validatedData.sku,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (existingSku) {
          throw new Error('Product with this SKU already exists');
        }

        // Create product
        const product = await this.prisma.product.create({
          data: {
            ...validatedData,
            tenantId: this.tenantId,
            currentStock: 0,
          },
        });

        // Audit log
        await this.auditLog({
          action: 'CREATE',
          entityType: 'Product',
          entityId: product.id,
          changes: { new: product },
        });

        // Publish event
        await this.publishEvent('PRODUCT_CREATED', 'Product', product.id, {
          code: product.code,
          sku: product.sku,
          name: product.name,
        });

        return product;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to create product');
    }
    
    return result.result;
  }

  /**
   * Update product with validation
   */
  async updateProduct(
    productId: string,
    data: z.infer<typeof UpdateProductSchema>
  ): Promise<Product> {
    const result = await this.ensureIdempotency(
      `update_product_${productId}`,
      async () => {
        // Validate input
        const validatedData = UpdateProductSchema.parse(data);
        
        // Get existing product
        const existingProduct = await this.prisma.product.findFirst({
          where: {
            id: productId,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (!existingProduct) {
          throw new Error('Product not found');
        }

        // Check permissions
        if (!(await this.hasPermission('inventory:update'))) {
          throw new Error('Insufficient permissions');
        }

        // Update product
        const updatedProduct = await this.prisma.product.update({
          where: { id: productId },
          data: {
            ...validatedData,
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });

        // Audit log
        await this.auditLog({
          action: 'UPDATE',
          entityType: 'Product',
          entityId: productId,
          changes: { old: existingProduct, new: updatedProduct },
        });

        // Publish event
        await this.publishEvent('PRODUCT_UPDATED', 'Product', productId, {
          code: updatedProduct.code,
          sku: updatedProduct.sku,
        });

        return updatedProduct;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to update product');
    }
    
    return result.result;
  }

  /**
   * Record inventory transaction (IN, OUT, ADJUSTMENT, etc.)
   */
  async recordTransaction(data: z.infer<typeof InventoryTransactionSchema>): Promise<InventoryTransaction> {
    const result = await this.ensureIdempotency(
      `inventory_tx_${data.productId}_${Date.now()}`,
      async () => {
        // Validate input
        const validatedData = InventoryTransactionSchema.parse(data);
        
        // Get product
        const product = await this.prisma.product.findFirst({
          where: {
            id: validatedData.productId,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (!product) {
          throw new Error('Product not found');
        }

        // Check permissions
        if (!(await this.hasPermission('inventory:transaction'))) {
          throw new Error('Insufficient permissions');
        }

        // Calculate new stock level
        let newStock = product.currentStock;
        switch (validatedData.transactionType) {
          case 'IN':
            newStock += validatedData.quantity;
            break;
          case 'OUT':
            if (newStock < validatedData.quantity) {
              throw new Error('Insufficient stock');
            }
            newStock -= validatedData.quantity;
            break;
          case 'ADJUSTMENT':
            newStock = validatedData.quantity;
            break;
          case 'TRANSFER':
            // Transfer logic would go here
            break;
        }

        // Create transaction record
        const transaction = await this.prisma.inventoryTransaction.create({
          data: {
            ...validatedData,
            tenantId: this.tenantId,
            userId: this.userId,
          },
        });

        // Update product stock
        await this.prisma.product.update({
          where: { id: validatedData.productId },
          data: {
            currentStock: newStock,
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });

        // Audit log
        await this.auditLog({
          action: 'INVENTORY_TRANSACTION',
          entityType: 'InventoryTransaction',
          entityId: transaction.id,
          changes: { new: {
            ...transaction,
            newStock,
            oldStock: product.currentStock,
          }},
        });

        // Publish event
        await this.publishEvent('INVENTORY_TRANSACTION_RECORDED', 'InventoryTransaction', transaction.id, {
          productCode: product.code,
          transactionType: transaction.transactionType,
          quantity: transaction.quantity,
          newStock,
        });

        return transaction;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to record transaction');
    }
    
    return result.result;
  }

  /**
   * Get product by ID with current stock
   */
  async getProductById(productId: string): Promise<Product | null> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: this.tenantId,
        isDeleted: false,
      },
    });

    if (!product) {
      return null;
    }

    // Check permissions
    if (!(await this.hasPermission('inventory:read'))) {
      throw new Error('Insufficient permissions');
    }

    return product;
  }

  /**
   * Get products with pagination, filtering, and stock alerts
   */
  async getProducts(params: {
    page?: number;
    limit?: number;
    search?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
    isActive?: boolean;
  }): Promise<{
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
    stockAlerts: {
      lowStock: number;
      outOfStock: number;
    };
  }> {
    const { page = 1, limit = 20, search, lowStock, outOfStock, isActive } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: this.tenantId,
      isDeleted: false,
    };

    if (search) {
      Object.assign(where, {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (lowStock) {
      Object.assign(where, {
        currentStock: {
          lte: this.prisma.product.fields.reorderPoint,
        },
      });
    }

    if (outOfStock) {
      Object.assign(where, {
        currentStock: 0,
      });
    }

    if (isActive !== undefined) {
      Object.assign(where, {
        isActive,
      });
    }

    // Get products and count
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Get stock alerts
    const [lowStockCount, outOfStockCount] = await Promise.all([
      this.prisma.product.count({
        where: {
          tenantId: this.tenantId,
          isDeleted: false,
          isActive: true,
          currentStock: {
            lte: this.prisma.product.fields.reorderPoint,
          },
        },
      }),
      this.prisma.product.count({
        where: {
          tenantId: this.tenantId,
          isDeleted: false,
          isActive: true,
          currentStock: 0,
        },
      }),
    ]);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stockAlerts: {
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
    };
  }

  /**
   * Get inventory transactions for a product
   */
  async getProductTransactions(
    productId: string,
    params: {
      page?: number;
      limit?: number;
      transactionType?: InventoryTransactionType;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    transactions: InventoryTransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, transactionType, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      productId,
      tenantId: this.tenantId,
    };

    if (transactionType) {
      Object.assign(where, {
        transactionType,
      });
    }

    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (startDate) createdAtFilter.gte = startDate;
      if (endDate) createdAtFilter.lte = endDate;
      Object.assign(where, {
        createdAt: createdAtFilter,
      });
    }

    // Get transactions and count
    const [transactions, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get low stock products that need reordering
   */
  async getLowStockProducts(): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        tenantId: this.tenantId,
        isDeleted: false,
        isActive: true,
        currentStock: {
          lte: this.prisma.product.fields.reorderPoint,
        },
      },
      orderBy: [
        { currentStock: 'asc' },
        { reorderPoint: 'desc' },
      ],
    });
  }

  /**
   * Soft delete product
   */
  async deleteProduct(productId: string): Promise<void> {
    await this.ensureIdempotency(
      `delete_product_${productId}`,
      async () => {
        // Get existing product
        const existingProduct = await this.prisma.product.findFirst({
          where: {
            id: productId,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (!existingProduct) {
          throw new Error('Product not found');
        }

        // Check permissions
        if (!(await this.hasPermission('inventory:delete'))) {
          throw new Error('Insufficient permissions');
        }

        // Check if product has transactions
        const transactionCount = await this.prisma.inventoryTransaction.count({
          where: { productId },
        });

        if (transactionCount > 0) {
          throw new Error('Cannot delete product with existing transactions');
        }

        // Soft delete
        await this.prisma.product.update({
          where: { id: productId },
          data: {
            isDeleted: true,
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });

        // Audit log
        await this.auditLog({
          action: 'DELETE',
          entityType: 'Product',
          entityId: productId,
          changes: { old: existingProduct },
        });

        // Publish event
        await this.publishEvent('PRODUCT_DELETED', 'Product', productId, {
          code: existingProduct.code,
          sku: existingProduct.sku,
        });
      }
    );
  }
}
