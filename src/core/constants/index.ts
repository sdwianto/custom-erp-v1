/**
 * Core constants for NextGen ERP
 * Centralized configuration and constants
 */

export const APP_CONFIG = {
  NAME: 'NextGen ERP',
  VERSION: '1.0.0',
  DESCRIPTION: 'Enterprise Resource Planning for CA Mine',
  AUTHOR: 'CA Mine Development Team',
} as const;

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL ?? '/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  CRM: '/crm',
  INVENTORY: '/inventory',
  FINANCE: '/finance',
  HRMS: '/hrms',
  RENTAL: '/rental',
  MAINTENANCE: '/maintenance',
  REPORTS: '/reports',
  ANALYTICS: '/analytics',
  BI: '/bi',
  DATA: '/data',
  SYNC: '/sync',
  SETTINGS: '/settings',
  USERS: '/users',
} as const;

export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
} as const;

export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  ARCHIVED: 'archived',
} as const;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
  ERP_CORPORATE: 'erp-corporate',
} as const;
