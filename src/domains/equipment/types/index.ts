/**
 * Equipment Domain Types
 * Enterprise-grade types for equipment management
 */

import type { BaseEntity } from '@/core/types';

export interface Equipment extends BaseEntity {
  equipmentCode: string;
  name: string;
  category: EquipmentCategory;
  subcategory?: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  yearOfManufacture: number;
  acquisitionDate: Date;
  acquisitionCost: number;
  currentValue: number;
  status: EquipmentStatus;
  location: EquipmentLocation;
  operator?: EquipmentOperator;
  specifications: EquipmentSpecifications;
  maintenance: MaintenanceInfo;
  rental: RentalInfo;
  telematicsId?: string;
  imageUrls: string[];
  documents: EquipmentDocument[];
  customFields: Record<string, unknown>;
}

export interface EquipmentCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  parentId?: string;
}

export type EquipmentStatus = 
  | 'operational'      // Ready for use
  | 'in-use'          // Currently being used
  | 'maintenance'     // Under maintenance
  | 'breakdown'       // Broken down
  | 'out-of-service'  // Temporarily unavailable
  | 'retired'         // End of life
  | 'pending-disposal'; // Awaiting disposal

export interface EquipmentLocation {
  siteId: string;
  siteName: string;
  area?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  lastUpdated: Date;
}

export interface EquipmentOperator {
  employeeId: string;
  employeeName: string;
  licenseNumber?: string;
  certifications: string[];
  assignedAt: Date;
}

export interface EquipmentSpecifications {
  weight: number;
  weightUnit: 'kg' | 'ton';
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: 'mm' | 'cm' | 'm';
  };
  enginePower?: number;
  enginePowerUnit?: 'hp' | 'kw';
  fuelType?: 'diesel' | 'petrol' | 'electric' | 'hybrid';
  fuelCapacity?: number;
  maxSpeed?: number;
  workingCapacity?: number;
  customSpecs: Record<string, unknown>;
}

export interface MaintenanceInfo {
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  serviceInterval: number; // hours
  totalRunningHours: number;
  lastBreakdownDate?: Date;
  mttr: number; // Mean Time To Repair (hours)
  mtbf: number; // Mean Time Between Failures (hours)
  availabilityPercentage: number;
}

export interface RentalInfo {
  isRentable: boolean;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  currency: string;
  minimumRentalPeriod?: number; // days
  maximumRentalPeriod?: number; // days
  currentRental?: {
    contractId: string;
    customerId: string;
    startDate: Date;
    endDate: Date;
    dailyRate: number;
  };
}

export interface EquipmentDocument {
  id: string;
  type: 'manual' | 'certificate' | 'warranty' | 'insurance' | 'photo' | 'other';
  name: string;
  description?: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
}

/**
 * Equipment usage and metrics
 */
export interface EquipmentUsage extends BaseEntity {
  equipmentId: string;
  date: Date;
  shift: 'day' | 'night' | 'full';
  operatorId?: string;
  startTime: Date;
  endTime?: Date;
  runningHours: number;
  fuelConsumed?: number;
  workCompleted?: string;
  location: EquipmentLocation;
  meterReading?: number;
  notes?: string;
}

export interface EquipmentBreakdown extends BaseEntity {
  equipmentId: string;
  reportedAt: Date;
  reportedBy: string;
  severity: 'minor' | 'major' | 'critical';
  category: string;
  description: string;
  symptoms: string[];
  location: EquipmentLocation;
  actionTaken?: string;
  partsUsed?: BreakdownPart[];
  laborHours?: number;
  repairCost?: number;
  downtime: number; // hours
  resolvedAt?: Date;
  resolvedBy?: string;
  workOrderId?: string;
  causeAnalysis?: string;
  preventiveActions?: string[];
}

export interface BreakdownPart {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

/**
 * Equipment KPIs and Analytics
 */
export interface EquipmentKPIs {
  equipmentId: string;
  period: {
    from: Date;
    to: Date;
  };
  availability: number; // percentage
  utilization: number; // percentage
  mttr: number; // hours
  mtbf: number; // hours
  totalDowntime: number; // hours
  plannedDowntime: number; // hours
  unplannedDowntime: number; // hours
  runningHours: number;
  fuelEfficiency?: number; // per hour
  maintenanceCost: number;
  repairCost: number;
  rentalRevenue?: number;
  roi: number; // percentage
}

/**
 * Query filters and search
 */
export interface EquipmentFilter {
  status?: EquipmentStatus[];
  category?: string[];
  location?: string[];
  operator?: string[];
  manufacturer?: string[];
  yearFrom?: number;
  yearTo?: number;
  search?: string;
  availableForRental?: boolean;
  maintenanceDue?: boolean;
}

export interface EquipmentSort {
  field: 'equipmentCode' | 'name' | 'category' | 'status' | 'location' | 'lastUsed' | 'nextMaintenance';
  direction: 'asc' | 'desc';
}

/**
 * API DTOs
 */
export interface CreateEquipmentDTO {
  equipmentCode: string;
  name: string;
  categoryId: string;
  subcategory?: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  yearOfManufacture: number;
  acquisitionDate: Date;
  acquisitionCost: number;
  locationId: string;
  specifications: EquipmentSpecifications;
  isRentable: boolean;
  rentalRates?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
}

export interface UpdateEquipmentDTO {
  name?: string;
  status?: EquipmentStatus;
  locationId?: string;
  operatorId?: string;
  specifications?: Partial<EquipmentSpecifications>;
  rentalRates?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  customFields?: Record<string, unknown>;
}
