/**
 * Core types for NextGen ERP
 * Enterprise-grade type definitions
 */

// Base entity with audit trail
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Sorting
export type SortOrder = 'asc' | 'desc';

export interface SortParams {
  field: string;
  order: SortOrder;
}

// Filtering
export interface FilterParams {
  search?: string;
  status?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  customFields?: Record<string, unknown>;
}

// Common status types
export type Status = 'active' | 'inactive' | 'pending' | 'archived';

// User and permission types
export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  status: Status;
}

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';

export interface Permission {
  module: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

// ERP Module types
export interface ERPModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  permissions: Permission[];
  isActive: boolean;
}

// Event types
export interface ERPEvent {
  id: string;
  type: string;
  timestamp: Date;
  userId?: string;
  data?: Record<string, unknown>;
}

export type EventType = 
  | 'equipment.created' 
  | 'equipment.updated' 
  | 'equipment.breakdown'
  | 'inventory.updated'
  | 'finance.transaction'
  | 'maintenance.scheduled';

export interface EventPayload {
  customFields?: Record<string, unknown>;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
