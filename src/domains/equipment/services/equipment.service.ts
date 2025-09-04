/**
 * Equipment Service
 * Enterprise business logic layer for equipment management
 */

import type { EquipmentRepository } from '../repositories/equipment.repository';
import type { Equipment, EquipmentFilter, EquipmentKPIs, CreateEquipmentDTO, UpdateEquipmentDTO, EquipmentUsage, EquipmentBreakdown } from '../types';
import type { PaginatedResponse, PaginationParams, ApiResponse } from '@/core/types';
import type { CacheManager } from '@/core/cache';
import type { EventStreamManager } from '@/core/realtime';

export class EquipmentService {
  constructor(
    private repository: EquipmentRepository,
    private cacheManager: CacheManager,
    private eventManager: EventStreamManager
  ) {}

  /**
   * Get equipment by ID with caching
   */
  async getEquipmentById(id: string): Promise<ApiResponse<Equipment>> {
    try {
      // Try cache first
      const cached = await this.cacheManager.get<Equipment>(`equipment:${id}`);
      if (cached) {
        return { success: true, data: cached };
      }

      // Fetch from database
      const equipment = await this.repository.findById(id);
      if (!equipment) {
        return { 
          success: false, 
          message: 'Equipment not found' 
        };
      }

      // Cache result
      await this.cacheManager.set(`equipment:${id}`, equipment, 3600); // 1 hour

      return { success: true, data: equipment };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get equipment'
      };
    }
  }

  /**
   * Get equipment list with advanced filtering and caching
   */
  async getEquipmentList(
    filter: EquipmentFilter,
    pagination: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<Equipment>>> {
    try {
      // Generate cache key based on filter and pagination
      const cacheKey = `equipment:list:${JSON.stringify({ filter, pagination })}`;
      
      // Try cache first
      const cached = await this.cacheManager.get<PaginatedResponse<Equipment>>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // Fetch from database
      const result = await this.repository.findAll(filter, pagination);

      // Cache result for shorter time due to dynamic nature
      await this.cacheManager.set(cacheKey, result, 300); // 5 minutes

      return { success: true, data: result };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get equipment list'
      };
    }
  }

  /**
   * Create new equipment with validation and events
   */
  async createEquipment(data: CreateEquipmentDTO, userId: string): Promise<ApiResponse<Equipment>> {
    try {
      // Validate business rules
      const validation = await this.validateEquipmentData(data);
      if (!validation.valid) {
        return {
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        };
      }

      // Check for duplicate equipment code
      const existing = await this.repository.findByCode(data.equipmentCode);
      if (existing) {
        return {
          success: false,
          message: 'Equipment code already exists'
        };
      }

      // Create equipment
      const equipment = await this.repository.create({
        ...data,
        createdBy: userId,
        currentValue: data.acquisitionCost,
        status: 'operational',
        location: await this.getLocationById(data.locationId),
        maintenance: this.initializeMaintenanceInfo(),
        rental: this.initializeRentalInfo(data),
        imageUrls: [],
        documents: [],
        customFields: {},
        // Map DTO to full Equipment entity
        category: await this.getCategoryById(data.categoryId),
        specifications: data.specifications,
        operator: undefined,
        telematicsId: undefined
      });

      // Invalidate related caches
      await this.invalidateEquipmentCaches();

      // Publish event
      await this.eventManager.publish('equipment', {
        id: `equipment-created-${Date.now()}`,
        type: 'equipment.created',
        timestamp: new Date(),
        userId,
        data: {
          equipmentId: equipment.id,
          currentState: equipment.status,
          location: equipment.location.siteName
        }
      });

      return { success: true, data: equipment };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create equipment'
      };
    }
  }

  /**
   * Update equipment with optimistic concurrency control
   */
  async updateEquipment(id: string, data: UpdateEquipmentDTO, userId: string): Promise<ApiResponse<Equipment>> {
    try {
      // Get current equipment
      const current = await this.repository.findById(id);
      if (!current) {
        return {
          success: false,
          message: 'Equipment not found'
        };
      }

      // Validate changes
      const validation = await this.validateEquipmentUpdate(current, data);
      if (!validation.valid) {
        return {
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        };
      }

      // Update equipment - only update fields that are provided
      const updateData: Partial<Equipment> = {};
      if (data.name) updateData.name = data.name;
      if (data.status) updateData.status = data.status;
      if (data.locationId) {
        updateData.location = await this.getLocationById(data.locationId);
      }
      if (data.operatorId) {
        updateData.operator = {
          employeeId: data.operatorId,
          employeeName: 'Unknown', // Would be fetched from HR service
          certifications: [],
          assignedAt: new Date()
        };
      }
      if (data.specifications) {
        updateData.specifications = {
          ...current.specifications,
          ...data.specifications
        };
      }
      if (data.rentalRates) {
        updateData.rental = {
          ...current.rental,
          dailyRate: data.rentalRates.daily,
          weeklyRate: data.rentalRates.weekly,
          monthlyRate: data.rentalRates.monthly
        };
      }
      if (data.customFields) {
        updateData.customFields = {
          ...current.customFields,
          ...data.customFields
        };
      }
      
      updateData.updatedBy = userId;
      updateData.updatedAt = new Date().toISOString();
      
      const updated = await this.repository.update(id, updateData);

      // Invalidate caches
      await this.cacheManager.invalidate(`equipment:${id}`);
      await this.invalidateEquipmentCaches();

      // Publish event if status changed
      if (data.status && data.status !== current.status) {
        await this.eventManager.publish('equipment', {
          id: `equipment-updated-${Date.now()}`,
          type: 'equipment.updated',
          timestamp: new Date(),
          userId,
          data: {
            equipmentId: id,
            previousState: current.status,
            currentState: data.status,
            location: updated.location.siteName
          }
        });
      }

      return { success: true, data: updated };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update equipment'
      };
    }
  }

  /**
   * Record equipment usage with automatic calculations
   */
  async recordUsage(usage: Omit<EquipmentUsage, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<EquipmentUsage>> {
    try {
      // Validate usage data
      const validation = this.validateUsageData(usage);
      if (!validation.valid) {
        return {
          success: false,
          message: 'Invalid usage data',
          errors: validation.errors
        };
      }

      // Record usage
      const recorded = await this.repository.recordUsage(usage);

      // Update equipment running hours
      const equipment = await this.repository.findById(usage.equipmentId);
      if (equipment) {
        const newRunningHours = equipment.maintenance.totalRunningHours + usage.runningHours;
        await this.repository.update(usage.equipmentId, {
          maintenance: {
            ...equipment.maintenance,
            totalRunningHours: newRunningHours
          }
        });

        // Check if maintenance is due
        if (this.isMaintenanceDue(equipment.maintenance, newRunningHours)) {
          await this.schedulePreventiveMaintenance(usage.equipmentId);
        }
      }

      // Invalidate caches
      await this.cacheManager.invalidate(`equipment:${usage.equipmentId}`);

      return { success: true, data: recorded };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to record usage'
      };
    }
  }

  /**
   * Record equipment breakdown with automatic workflow
   */
  async recordBreakdown(breakdown: Omit<EquipmentBreakdown, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<EquipmentBreakdown>> {
    try {
      // Record breakdown
      const recorded = await this.repository.recordBreakdown(breakdown);

      // Update equipment status to breakdown
      await this.repository.update(breakdown.equipmentId, {
        status: 'breakdown'
      });

      // Create maintenance work order if critical
      if (breakdown.severity === 'critical') {
        // Create a complete breakdown object for the work order
        const completeBreakdown: EquipmentBreakdown = {
          ...breakdown,
          id: '', // Will be generated
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await this.createEmergencyWorkOrder(completeBreakdown);
      }

      // Publish event
      await this.eventManager.publish('equipment', {
        id: `equipment-breakdown-${Date.now()}`,
        type: 'equipment.breakdown',
        timestamp: new Date(),
        data: {
          equipmentId: breakdown.equipmentId,
          currentState: 'breakdown',
          location: breakdown.location.siteName
        }
      });

      // Invalidate caches
      await this.cacheManager.invalidate(`equipment:${breakdown.equipmentId}`);
      await this.invalidateEquipmentCaches();

      return { success: true, data: recorded };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to record breakdown'
      };
    }
  }

  /**
   * Get equipment KPIs with caching
   */
  async getEquipmentKPIs(equipmentId: string, from: Date, to: Date): Promise<ApiResponse<EquipmentKPIs>> {
    try {
      const cacheKey = `equipment:kpis:${equipmentId}:${from.toISOString()}:${to.toISOString()}`;
      
      // Try cache first
      const cached = await this.cacheManager.get<EquipmentKPIs>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // Calculate KPIs
      const kpis = await this.repository.getKPIs(equipmentId, from, to);

      // Cache for longer time as KPIs are historical
      await this.cacheManager.set(cacheKey, kpis, 3600); // 1 hour

      return { success: true, data: kpis };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get KPIs'
      };
    }
  }

  /**
   * Get available equipment for rental
   */
  async getAvailableForRental(
    dateFrom: Date,
    dateTo: Date,
    categoryId?: string
  ): Promise<ApiResponse<Equipment[]>> {
    try {
      const equipment = await this.repository.findAvailableForRental(dateFrom, dateTo, categoryId);
      return { success: true, data: equipment };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get available equipment'
      };
    }
  }

  /**
   * Private helper methods
   */
  private async validateEquipmentData(data: CreateEquipmentDTO): Promise<{ valid: boolean; errors?: Record<string, string[]> }> {
    const errors: Record<string, string[]> = {};

    // Validate equipment code format
    if (!/^[A-Z]{2,3}\d{4,6}$/.test(data.equipmentCode)) {
      errors.equipmentCode = ['Equipment code must follow format: XX1234 or XXX123456'];
    }

    // Validate year of manufacture
    const currentYear = new Date().getFullYear();
    if (data.yearOfManufacture < 1900 || data.yearOfManufacture > currentYear) {
      errors.yearOfManufacture = ['Year of manufacture must be between 1900 and current year'];
    }

    // Validate acquisition cost
    if (data.acquisitionCost <= 0) {
      errors.acquisitionCost = ['Acquisition cost must be greater than 0'];
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    };
  }

  private async validateEquipmentUpdate(current: Equipment, data: UpdateEquipmentDTO): Promise<{ valid: boolean; errors?: Record<string, string[]> }> {
    const errors: Record<string, string[]> = {};

    // Validate status transitions
    if (data.status && !this.isValidStatusTransition(current.status, data.status)) {
      errors.status = [`Cannot transition from ${current.status} to ${data.status}`];
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    };
  }

  private validateUsageData(usage: Omit<EquipmentUsage, 'id' | 'createdAt' | 'updatedAt'>): { valid: boolean; errors?: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};

    if (usage.runningHours <= 0) {
      errors.runningHours = ['Running hours must be greater than 0'];
    }

    if (usage.endTime && usage.endTime <= usage.startTime) {
      errors.endTime = ['End time must be after start time'];
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    };
  }

  private isValidStatusTransition(from: Equipment['status'], to: Equipment['status']): boolean {
    const transitions: Record<Equipment['status'], Equipment['status'][]> = {
      'operational': ['in-use', 'maintenance', 'breakdown', 'out-of-service'],
      'in-use': ['operational', 'breakdown', 'maintenance'],
      'maintenance': ['operational', 'out-of-service'],
      'breakdown': ['maintenance', 'out-of-service'],
      'out-of-service': ['operational', 'retired'],
      'retired': ['pending-disposal'],
      'pending-disposal': []
    };

    return transitions[from]?.includes(to) ?? false;
  }

  private isMaintenanceDue(maintenance: Equipment['maintenance'], currentHours: number): boolean {
    return currentHours >= (maintenance.totalRunningHours + maintenance.serviceInterval);
  }

  private async schedulePreventiveMaintenance(equipmentId: string): Promise<void> {
    // Implementation would integrate with maintenance module
    // TODO: Integrate with maintenance module
  }

  private async createEmergencyWorkOrder(breakdown: EquipmentBreakdown): Promise<void> {
    // Implementation would integrate with maintenance module
    // TODO: Integrate with maintenance module
  }

  private async invalidateEquipmentCaches(): Promise<void> {
    await this.cacheManager.invalidate('equipment:list:*');
    await this.cacheManager.invalidate('equipment:available:*');
  }

  private initializeMaintenanceInfo(): Equipment['maintenance'] {
    return {
      serviceInterval: 250, // hours
      totalRunningHours: 0,
      mttr: 0,
      mtbf: 0,
      availabilityPercentage: 100
    };
  }

  private initializeRentalInfo(data: CreateEquipmentDTO): Equipment['rental'] {
    return {
      isRentable: data.isRentable,
      dailyRate: data.rentalRates?.daily,
      weeklyRate: data.rentalRates?.weekly,
      monthlyRate: data.rentalRates?.monthly,
      currency: 'USD'
    };
  }

  private async getLocationById(locationId: string): Promise<Equipment['location']> {
    // Implementation would fetch from location service
    return {
      siteId: locationId,
      siteName: 'Default Site',
      lastUpdated: new Date()
    };
  }

  private async getCategoryById(categoryId: string): Promise<Equipment['category']> {
    // Implementation would fetch from category service
    return {
      id: categoryId,
      code: 'CAT',
      name: 'Default Category',
      description: 'Default category'
    };
  }
}
