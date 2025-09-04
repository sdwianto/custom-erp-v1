import { type PrismaClient, type Equipment, type EquipmentStatus, type UsageLog, type Breakdown, BreakdownSeverity } from '@prisma/client';
import { BaseService } from './BaseService';
import { z } from 'zod';

// Validation schemas
const CreateEquipmentSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  acquisitionCost: z.number().positive().optional(),
  currentValue: z.number().positive().optional(),
  depreciationMethod: z.string().optional(),
  usefulLife: z.number().positive().optional(),
  salvageValue: z.number().positive().optional(),
  location: z.string().optional(),
});

const UpdateEquipmentSchema = CreateEquipmentSchema.partial();

const UsageLogSchema = z.object({
  equipmentId: z.string().uuid(),
  shiftDate: z.date(),
  hoursUsed: z.number().min(0),
  loadUnits: z.number().min(0).default(0),
  notes: z.string().optional(),
});

const BreakdownSchema = z.object({
  equipmentId: z.string().uuid(),
  startAt: z.date(),
  endAt: z.date().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  severity: z.nativeEnum(BreakdownSeverity).default('MINOR'),
});

export class EquipmentService extends BaseService {
  constructor(prisma: PrismaClient, tenantId: string, userId: string) {
    super(prisma, tenantId, userId);
  }

  /**
   * Create a new equipment with validation
   */
  async createEquipment(data: z.infer<typeof CreateEquipmentSchema>): Promise<Equipment> {
    const result = await this.ensureIdempotency(
      `create_equipment_${data.code}`,
      async () => {
        // Validate input
        const validatedData = CreateEquipmentSchema.parse(data);
        
        // Check if equipment code already exists
        const existingEquipment = await this.prisma.equipment.findFirst({
          where: {
            code: validatedData.code,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (existingEquipment) {
          throw new Error('Equipment with this code already exists');
        }

        // Check if serial number already exists (if provided)
        if (validatedData.serialNumber) {
          const existingSerial = await this.prisma.equipment.findFirst({
            where: {
              serialNumber: validatedData.serialNumber,
              tenantId: this.tenantId,
              isDeleted: false,
            },
          });

          if (existingSerial) {
            throw new Error('Equipment with this serial number already exists');
          }
        }

        // Create equipment
        const equipment = await this.prisma.equipment.create({
          data: {
            ...validatedData,
            tenantId: this.tenantId,
            status: 'AVAILABLE',
            totalOperatingHours: 0,
          },
        });

        // Audit log
        await this.auditLog({
          action: 'CREATE',
          entityType: 'Equipment',
          entityId: equipment.id,
          changes: { new: equipment },
        });

        // Publish event
        await this.publishEvent('EQUIPMENT_CREATED', 'Equipment', equipment.id, {
          code: equipment.code,
          name: equipment.name,
          status: equipment.status,
        });

        return equipment;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to create equipment');
    }
    
    return result.result;
  }

  /**
   * Update equipment with validation
   */
  async updateEquipment(
    equipmentId: string,
    data: z.infer<typeof UpdateEquipmentSchema>
  ): Promise<Equipment> {
    const result = await this.ensureIdempotency(
      `update_equipment_${equipmentId}`,
      async () => {
        // Validate input
        const validatedData = UpdateEquipmentSchema.parse(data);
        
        // Get existing equipment
        const existingEquipment = await this.prisma.equipment.findFirst({
          where: {
            id: equipmentId,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (!existingEquipment) {
          throw new Error('Equipment not found');
        }

        // Check permissions
        if (!(await this.hasPermission('equipment:update'))) {
          throw new Error('Insufficient permissions');
        }

        // Update equipment
        const updatedEquipment = await this.prisma.equipment.update({
          where: { id: equipmentId },
          data: {
            ...validatedData,
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });

        // Audit log
        await this.auditLog({
          action: 'UPDATE',
          entityType: 'Equipment',
          entityId: equipmentId,
          changes: { old: existingEquipment, new: updatedEquipment },
        });

        // Publish event
        await this.publishEvent('EQUIPMENT_UPDATED', 'Equipment', equipmentId, {
          code: updatedEquipment.code,
          name: updatedEquipment.name,
          status: updatedEquipment.status,
        });

        return updatedEquipment;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to update equipment');
    }
    
    return result.result;
  }

  /**
   * Record equipment usage for a shift
   */
  async recordUsage(data: z.infer<typeof UsageLogSchema>): Promise<UsageLog> {
    const result = await this.ensureIdempotency(
      `usage_log_${data.equipmentId}_${data.shiftDate.toISOString().split('T')[0]}`,
      async () => {
        // Validate input
        const validatedData = UsageLogSchema.parse(data);
        
        // Get equipment
        const equipment = await this.prisma.equipment.findFirst({
          where: {
            id: validatedData.equipmentId,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (!equipment) {
          throw new Error('Equipment not found');
        }

        // Check permissions
        if (!(await this.hasPermission('equipment:usage'))) {
          throw new Error('Insufficient permissions');
        }

        // Create usage log
        const usageLog = await this.prisma.usageLog.create({
          data: {
            ...validatedData,
            tenantId: this.tenantId,
            userId: this.userId,
          },
        });

        // Update equipment operating hours
        await this.prisma.equipment.update({
          where: { id: validatedData.equipmentId },
          data: {
            totalOperatingHours: {
              increment: validatedData.hoursUsed,
            },
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });

        // Audit log
        await this.auditLog({
          action: 'USAGE_RECORDED',
          entityType: 'UsageLog',
          entityId: usageLog.id,
          changes: { new: {
            ...usageLog,
            equipmentCode: equipment.code,
            equipmentName: equipment.name,
          }},
        });

        // Publish event
        await this.publishEvent('EQUIPMENT_USAGE_RECORDED', 'UsageLog', usageLog.id, {
          equipmentCode: equipment.code,
          hoursUsed: usageLog.hoursUsed,
          totalOperatingHours: equipment.totalOperatingHours + Number(usageLog.hoursUsed),
        });

        return usageLog;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to record usage');
    }
    
    return result.result;
  }

  /**
   * Record equipment breakdown
   */
  async recordBreakdown(data: z.infer<typeof BreakdownSchema>): Promise<Breakdown> {
    const result = await this.ensureIdempotency(
      `breakdown_${data.equipmentId}_${Date.now()}`,
      async () => {
        // Validate input
        const validatedData = BreakdownSchema.parse(data);
        
        // Get equipment
        const equipment = await this.prisma.equipment.findFirst({
          where: {
            id: validatedData.equipmentId,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (!equipment) {
          throw new Error('Equipment not found');
        }

        // Check permissions
        if (!(await this.hasPermission('equipment:breakdown'))) {
          throw new Error('Insufficient permissions');
        }

        // Create breakdown record
        const breakdown = await this.prisma.breakdown.create({
          data: {
            ...validatedData,
            tenantId: this.tenantId,
            userId: this.userId,
          },
        });

        // Update equipment status if breakdown is active
        if (!validatedData.endAt) {
          await this.prisma.equipment.update({
            where: { id: validatedData.equipmentId },
            data: {
              status: 'REPAIR',
              updatedAt: new Date(),
              version: { increment: 1 },
            },
          });
        }

        // Audit log
        await this.auditLog({
          action: 'BREAKDOWN_RECORDED',
          entityType: 'Breakdown',
          entityId: breakdown.id,
          changes: { new: {
            ...breakdown,
            equipmentCode: equipment.code,
            equipmentName: equipment.name,
          }},
        });

        // Publish event
        await this.publishEvent('EQUIPMENT_BREAKDOWN_RECORDED', 'Breakdown', breakdown.id, {
          equipmentCode: equipment.code,
          severity: breakdown.severity,
          status: equipment.status,
        });

        return breakdown;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to record breakdown');
    }
    
    return result.result;
  }

  /**
   * Update equipment status
   */
  async updateStatus(equipmentId: string, status: EquipmentStatus): Promise<Equipment> {
    const result = await this.ensureIdempotency(
      `status_update_${equipmentId}_${status}`,
      async () => {
        // Get existing equipment
        const existingEquipment = await this.prisma.equipment.findFirst({
          where: {
            id: equipmentId,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (!existingEquipment) {
          throw new Error('Equipment not found');
        }

        // Check permissions
        if (!(await this.hasPermission('equipment:status'))) {
          throw new Error('Insufficient permissions');
        }

        // Update status
        const updatedEquipment = await this.prisma.equipment.update({
          where: { id: equipmentId },
          data: {
            status,
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });

        // Audit log
        await this.auditLog({
          action: 'STATUS_UPDATED',
          entityType: 'Equipment',
          entityId: equipmentId,
          changes: { old: { status: existingEquipment.status }, new: { status: updatedEquipment.status } },
        });

        // Publish event
        await this.publishEvent('EQUIPMENT_STATUS_UPDATED', 'Equipment', equipmentId, {
          code: updatedEquipment.code,
          oldStatus: existingEquipment.status,
          newStatus: updatedEquipment.status,
        });

        return updatedEquipment;
      }
    );

    if (result.isDuplicate && result.result) {
      return result.result;
    }
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.result) {
      throw new Error('Failed to update equipment status');
    }
    
    return result.result;
  }

  /**
   * Get equipment by ID with usage history
   */
  async getEquipmentById(equipmentId: string): Promise<Equipment | null> {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        tenantId: this.tenantId,
        isDeleted: false,
      },
    });

    if (!equipment) {
      return null;
    }

    // Check permissions
    if (!(await this.hasPermission('equipment:read'))) {
      throw new Error('Insufficient permissions');
    }

    return equipment;
  }

  /**
   * Get equipment list with filtering and pagination
   */
  async getEquipment(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: EquipmentStatus;
    location?: string;
    manufacturer?: string;
  }): Promise<{
    equipment: Equipment[];
    total: number;
    page: number;
    totalPages: number;
    statusSummary: Record<EquipmentStatus, number>;
  }> {
    const { page = 1, limit = 20, search, status, location, manufacturer } = params;
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
          { model: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (status) {
      Object.assign(where, {
        status,
      });
    }

    if (location) {
      Object.assign(where, {
        location: { contains: location, mode: 'insensitive' },
      });
    }

    if (manufacturer) {
      Object.assign(where, {
        manufacturer: { contains: manufacturer, mode: 'insensitive' },
      });
    }

    // Get equipment and count
    const [equipment, total] = await Promise.all([
      this.prisma.equipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.equipment.count({ where }),
    ]);

    // Get status summary
    const statusSummary = await this.prisma.equipment.groupBy({
      by: ['status'],
      where: {
        tenantId: this.tenantId,
        isDeleted: false,
      },
      _count: {
        status: true,
      },
    });

    const statusCounts: Record<EquipmentStatus, number> = {
      AVAILABLE: 0,
      IN_USE: 0,
      MAINTENANCE: 0,
      REPAIR: 0,
      RETIRED: 0,
      LOST: 0,
    };

    statusSummary.forEach((item) => {
      statusCounts[item.status] = item._count.status;
    });

    return {
      equipment,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      statusSummary: statusCounts,
    };
  }

  /**
   * Get equipment usage history
   */
  async getUsageHistory(
    equipmentId: string,
    params: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    usageLogs: UsageLog[];
    total: number;
    page: number;
    totalPages: number;
    totalHours: number;
  }> {
    const { page = 1, limit = 20, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      equipmentId,
      tenantId: this.tenantId,
    };

    if (startDate || endDate) {
      const shiftDateFilter: Record<string, Date> = {};
      if (startDate) shiftDateFilter.gte = startDate;
      if (endDate) shiftDateFilter.lte = endDate;
      Object.assign(where, {
        shiftDate: shiftDateFilter,
      });
    }

    // Get usage logs and count
    const [usageLogs, total, totalHours] = await Promise.all([
      this.prisma.usageLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { shiftDate: 'desc' },
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
      this.prisma.usageLog.count({ where }),
      this.prisma.usageLog.aggregate({
        where,
        _sum: {
          hoursUsed: true,
        },
      }),
    ]);

    return {
      usageLogs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      totalHours: Number(totalHours._sum.hoursUsed) || 0,
    };
  }

  /**
   * Get equipment breakdown history
   */
  async getBreakdownHistory(
    equipmentId: string,
    params: {
      page?: number;
      limit?: number;
      severity?: BreakdownSeverity;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    breakdowns: Breakdown[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, severity, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      equipmentId,
      tenantId: this.tenantId,
    };

    if (severity) {
      Object.assign(where, {
        severity,
      });
    }

    if (startDate || endDate) {
      const startAtFilter: Record<string, Date> = {};
      if (startDate) startAtFilter.gte = startDate;
      if (endDate) startAtFilter.lte = endDate;
      Object.assign(where, {
        startAt: startAtFilter,
      });
    }

    // Get breakdowns and count
    const [breakdowns, total] = await Promise.all([
      this.prisma.breakdown.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'desc' },
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
      this.prisma.breakdown.count({ where }),
    ]);

    return {
      breakdowns,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get equipment maintenance schedule
   */
  async getMaintenanceSchedule(): Promise<Equipment[]> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return this.prisma.equipment.findMany({
      where: {
        tenantId: this.tenantId,
        isDeleted: false,
        nextMaintenanceDate: {
          lte: thirtyDaysFromNow,
        },
      },
      orderBy: { nextMaintenanceDate: 'asc' },
    });
  }

  /**
   * Soft delete equipment
   */
  async deleteEquipment(equipmentId: string): Promise<void> {
    await this.ensureIdempotency(
      `delete_equipment_${equipmentId}`,
      async () => {
        // Get existing equipment
        const existingEquipment = await this.prisma.equipment.findFirst({
          where: {
            id: equipmentId,
            tenantId: this.tenantId,
            isDeleted: false,
          },
        });

        if (!existingEquipment) {
          throw new Error('Equipment not found');
        }

        // Check permissions
        if (!(await this.hasPermission('equipment:delete'))) {
          throw new Error('Insufficient permissions');
        }

        // Check if equipment has usage logs or breakdowns
        const [usageCount, breakdownCount] = await Promise.all([
          this.prisma.usageLog.count({ where: { equipmentId } }),
          this.prisma.breakdown.count({ where: { equipmentId } }),
        ]);

        if (usageCount > 0 || breakdownCount > 0) {
          throw new Error('Cannot delete equipment with existing usage logs or breakdowns');
        }

        // Soft delete
        await this.prisma.equipment.update({
          where: { id: equipmentId },
          data: {
            isDeleted: true,
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });

        // Audit log
        await this.auditLog({
          action: 'DELETE',
          entityType: 'Equipment',
          entityId: equipmentId,
          changes: { old: existingEquipment },
        });

        // Publish event
        await this.publishEvent('EQUIPMENT_DELETED', 'Equipment', equipmentId, {
          code: existingEquipment.code,
          name: existingEquipment.name,
        });
      }
    );
  }
}
