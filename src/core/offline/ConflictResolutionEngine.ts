/**
 * Conflict Resolution Engine
 * Implementation Guide: Hybrid Online/Offline Engine - Conflict Resolution Engine
 * 
 * Conflict detection and resolution strategies:
 * - Server-wins (default)
 * - Client-override (with approval)
 * - Field-level merging
 * - Manual resolution workflow
 */

import type { 
  ConflictResolution, 
  LocalMutation,
  OfflineConfig 
} from './types';
import { ulid } from 'ulid';

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictType: 'version_mismatch' | 'data_conflict' | 'server_override';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  serverData: unknown;
  clientData: unknown;
  conflictingFields: string[];
}

export interface ResolutionStrategy {
  type: 'server_wins' | 'client_override' | 'field_merge' | 'manual' | 'adjustment';
  priority: number;
  conditions: string[];
  description: string;
}

export interface FieldMergeRule {
  field: string;
  strategy: 'server_wins' | 'client_wins' | 'merge' | 'custom';
  customResolver?: (serverValue: unknown, clientValue: unknown) => unknown;
}

export class ConflictResolutionEngine {
  private readonly config: OfflineConfig;
  private readonly strategies: Map<string, ResolutionStrategy>;
  private readonly fieldMergeRules: Map<string, FieldMergeRule>;

  constructor(config: OfflineConfig) {
    this.config = config;
    this.strategies = new Map();
    this.fieldMergeRules = new Map();
    
    this.initializeDefaultStrategies();
    this.initializeFieldMergeRules();
  }

  /**
   * Initialize default resolution strategies
   */
  private initializeDefaultStrategies(): void {
    // Server-wins strategy (default)
    this.strategies.set('server_wins', {
      type: 'server_wins',
      priority: 1,
      conditions: ['version_mismatch', 'data_conflict'],
      description: 'Server data takes precedence over client data'
    });

    // Client-override strategy
    this.strategies.set('client_override', {
      type: 'client_override',
      priority: 2,
      conditions: ['user_approved', 'low_severity'],
      description: 'Client data overrides server data with user approval'
    });

    // Field-level merging strategy
    this.strategies.set('field_merge', {
      type: 'field_merge',
      priority: 3,
      conditions: ['mergeable_fields', 'no_critical_conflicts'],
      description: 'Merge fields individually based on rules'
    });

    // Manual resolution strategy
    this.strategies.set('manual', {
      type: 'manual',
      priority: 4,
      conditions: ['high_severity', 'complex_conflict'],
      description: 'Requires manual user intervention'
    });

    // Adjustment strategy
    this.strategies.set('adjustment', {
      type: 'adjustment',
      priority: 5,
      conditions: ['financial_data', 'inventory_data'],
      description: 'Create adjustment record instead of overwriting'
    });
  }

  /**
   * Initialize field merge rules
   */
  private initializeFieldMergeRules(): void {
    // Default field merge rules
    this.fieldMergeRules.set('notes', {
      field: 'notes',
      strategy: 'merge',
      customResolver: (serverValue: unknown, clientValue: unknown) => {
        const serverNotes = typeof serverValue === 'string' ? serverValue : '';
        const clientNotes = typeof clientValue === 'string' ? clientValue : '';
        return `${serverNotes}\n---\n${clientNotes}`.trim();
      }
    });

    this.fieldMergeRules.set('tags', {
      field: 'tags',
      strategy: 'merge',
      customResolver: (serverValue: unknown, clientValue: unknown) => {
        const serverTags = Array.isArray(serverValue) ? serverValue as unknown[] : [];
        const clientTags = Array.isArray(clientValue) ? clientValue as unknown[] : [];
        return [...new Set([...serverTags, ...clientTags])] as unknown[];
      }
    });

    this.fieldMergeRules.set('version', {
      field: 'version',
      strategy: 'server_wins'
    });

    this.fieldMergeRules.set('updatedAt', {
      field: 'updatedAt',
      strategy: 'server_wins'
    });

    this.fieldMergeRules.set('id', {
      field: 'id',
      strategy: 'server_wins'
    });
  }

  /**
   * Detect conflicts between server and client data
   * Implementation Guide: Conflict detection
   */
  async detectConflicts(
    mutation: LocalMutation,
    serverData: unknown,
    clientData: unknown
  ): Promise<ConflictDetectionResult> {
    const result: ConflictDetectionResult = {
      hasConflict: false,
      conflictType: 'version_mismatch',
      severity: 'low',
      description: '',
      serverData,
      clientData,
      conflictingFields: []
    };

    try {
      // Check version mismatch
      const versionConflict = this.detectVersionConflict(mutation, serverData, clientData);
      if (versionConflict.hasConflict) {
        result.hasConflict = true;
        result.conflictType = 'version_mismatch';
        result.severity = this.calculateVersionConflictSeverity(versionConflict);
        result.description = `Version mismatch: server=${versionConflict.serverVersion}, client=${versionConflict.clientVersion}`;
        result.conflictingFields.push('version');
      }

      // Check data conflicts
      const dataConflict = this.detectDataConflicts(serverData, clientData);
      if (dataConflict.hasConflict) {
        result.hasConflict = true;
        result.conflictType = 'data_conflict';
        result.severity = this.calculateDataConflictSeverity(dataConflict);
        result.description = `Data conflicts in fields: ${dataConflict.conflictingFields.join(', ')}`;
        result.conflictingFields = dataConflict.conflictingFields;
      }

      // Check server override
      const serverOverride = this.detectServerOverride(mutation, serverData);
      if (serverOverride.hasConflict) {
        result.hasConflict = true;
        result.conflictType = 'server_override';
        result.severity = serverOverride.severity;
        result.description = serverOverride.description;
      }

      return result;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return {
        ...result,
        hasConflict: true,
        conflictType: 'data_conflict',
        severity: 'critical',
        description: 'Error occurred during conflict detection'
      };
    }
  }

  /**
   * Detect version conflicts
   */
  private detectVersionConflict(
    mutation: LocalMutation,
    serverData: unknown,
    clientData: unknown
  ): { hasConflict: boolean; serverVersion: number; clientVersion: number } {
    const serverVersion = this.extractVersion(serverData);
    const clientVersion = mutation.baseVersion ?? this.extractVersion(clientData);

    return {
      hasConflict: serverVersion > clientVersion,
      serverVersion,
      clientVersion
    };
  }

  /**
   * Detect data conflicts
   */
  private detectDataConflicts(
    serverData: unknown,
    clientData: unknown
  ): { hasConflict: boolean; conflictingFields: string[] } {
    const conflictingFields: string[] = [];

    if (typeof serverData === 'object' && typeof clientData === 'object' && 
        serverData !== null && clientData !== null) {
      
      const serverObj = serverData as Record<string, unknown>;
      const clientObj = clientData as Record<string, unknown>;

      // Compare all fields
      const allKeys = new Set([...Object.keys(serverObj), ...Object.keys(clientObj)]);
      
      for (const key of allKeys) {
        if (this.isFieldConflicting(serverObj[key], clientObj[key], key)) {
          conflictingFields.push(key);
        }
      }
    }

    return {
      hasConflict: conflictingFields.length > 0,
      conflictingFields
    };
  }

  /**
   * Check if field is conflicting
   */
  private isFieldConflicting(
    serverValue: unknown,
    clientValue: unknown,
    fieldName: string
  ): boolean {
    // Skip version and timestamp fields
    if (['version', 'updatedAt', 'createdAt', 'id'].includes(fieldName)) {
      return false;
    }

    // Deep comparison
    return !this.deepEqual(serverValue, clientValue);
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    
    if (a === null || b === null) return a === b;
    
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      
      const aKeys = Object.keys(aObj);
      const bKeys = Object.keys(bObj);
      
      if (aKeys.length !== bKeys.length) return false;
      
      for (const key of aKeys) {
        if (!bKeys.includes(key)) return false;
        if (!this.deepEqual(aObj[key], bObj[key])) return false;
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Detect server override
   */
  private detectServerOverride(
    mutation: LocalMutation,
    serverData: unknown
  ): { hasConflict: boolean; severity: 'low' | 'medium' | 'high' | 'critical'; description: string } {
    // Check if server has more recent data
    const serverUpdatedAt = this.extractTimestamp(serverData);
    const clientCreatedAt = new Date(mutation.createdAt).getTime();

    if (serverUpdatedAt > clientCreatedAt) {
      return {
        hasConflict: true,
        severity: 'medium',
        description: 'Server has more recent data than client mutation'
      };
    }

    return {
      hasConflict: false,
      severity: 'low',
      description: ''
    };
  }

  /**
   * Calculate version conflict severity
   */
  private calculateVersionConflictSeverity(versionConflict: { serverVersion: number; clientVersion: number }): 'low' | 'medium' | 'high' | 'critical' {
    const versionDiff = versionConflict.serverVersion - versionConflict.clientVersion;
    
    if (versionDiff > 10) return 'critical';
    if (versionDiff > 5) return 'high';
    if (versionDiff > 2) return 'medium';
    return 'low';
  }

  /**
   * Calculate data conflict severity
   */
  private calculateDataConflictSeverity(dataConflict: { conflictingFields: string[] }): 'low' | 'medium' | 'high' | 'critical' {
    const criticalFields = ['amount', 'quantity', 'status', 'type'];
    const highPriorityFields = ['name', 'description', 'category'];
    
    const hasCriticalFields = dataConflict.conflictingFields.some(field => 
      criticalFields.includes(field)
    );
    
    const hasHighPriorityFields = dataConflict.conflictingFields.some(field => 
      highPriorityFields.includes(field)
    );
    
    if (hasCriticalFields) return 'critical';
    if (hasHighPriorityFields) return 'high';
    if (dataConflict.conflictingFields.length > 5) return 'medium';
    return 'low';
  }

  /**
   * Resolve conflicts using appropriate strategy
   * Implementation Guide: Resolution strategies
   */
  async resolveConflicts(
    detectionResult: ConflictDetectionResult,
    mutation: LocalMutation
  ): Promise<ConflictResolution> {
    const strategy = this.selectResolutionStrategy(detectionResult, mutation);
    
    const resolution: ConflictResolution = {
      id: ulid(),
      mutationId: mutation.id,
      conflictType: detectionResult.conflictType,
      severity: detectionResult.severity,
      description: detectionResult.description,
      serverData: detectionResult.serverData,
      clientData: detectionResult.clientData,
      resolution: strategy.type,
      createdAt: new Date().toISOString()
    };

    // Apply resolution strategy
    switch (strategy.type) {
      case 'server_wins':
        await this.applyServerWinsResolution(resolution);
        break;
      case 'client_override':
        await this.applyClientOverrideResolution(resolution);
        break;
      case 'field_merge':
        await this.applyFieldMergeResolution(resolution);
        break;
      case 'manual':
        await this.applyManualResolution(resolution);
        break;
      case 'adjustment':
        await this.applyAdjustmentResolution(resolution);
        break;
    }

    return resolution;
  }

  /**
   * Select appropriate resolution strategy
   */
  private selectResolutionStrategy(
    detectionResult: ConflictDetectionResult,
    mutation: LocalMutation
  ): ResolutionStrategy {
    // Check for critical conflicts first
    if (detectionResult.severity === 'critical') {
      return this.strategies.get('adjustment')!;
    }

    // Check for financial/inventory data
    if (this.isFinancialOrInventoryData(mutation)) {
      return this.strategies.get('adjustment')!;
    }

    // Check for high severity conflicts
    if (detectionResult.severity === 'high') {
      return this.strategies.get('manual')!;
    }

    // Check for mergeable fields
    if (this.hasMergeableFields(detectionResult.conflictingFields)) {
      return this.strategies.get('field_merge')!;
    }

    // Default to server wins
    return this.strategies.get('server_wins')!;
  }

  /**
   * Check if data is financial or inventory related
   */
  private isFinancialOrInventoryData(mutation: LocalMutation): boolean {
    const financialTypes = ['finance', 'payment', 'invoice', 'transaction'];
    const inventoryTypes = ['inventory', 'stock', 'item', 'warehouse'];
    
    const kind = mutation.kind.toLowerCase();
    
    return financialTypes.some(type => kind.includes(type)) ||
           inventoryTypes.some(type => kind.includes(type));
  }

  /**
   * Check if fields are mergeable
   */
  private hasMergeableFields(conflictingFields: string[]): boolean {
    return conflictingFields.some(field => 
      this.fieldMergeRules.has(field)
    );
  }

  /**
   * Apply server wins resolution
   */
  private async applyServerWinsResolution(resolution: ConflictResolution): Promise<void> {
    resolution.resolvedAt = new Date().toISOString();
    resolution.resolvedBy = 'system';
    
    console.log(`Applied server-wins resolution for conflict ${resolution.id}`);
  }

  /**
   * Apply client override resolution
   */
  private async applyClientOverrideResolution(resolution: ConflictResolution): Promise<void> {
    // This would require user approval in real implementation
    resolution.resolution = 'manual'; // Change to manual for user approval
    resolution.resolvedBy = 'pending_user_approval';
    
    console.log(`Applied client-override resolution for conflict ${resolution.id} (pending approval)`);
  }

  /**
   * Apply field merge resolution
   */
  private async applyFieldMergeResolution(resolution: ConflictResolution): Promise<void> {
    const mergedData = this.mergeFields(
      resolution.serverData,
      resolution.clientData,
      resolution.conflictingFields ?? []
    );
    
    resolution.clientData = mergedData;
    resolution.resolvedAt = new Date().toISOString();
    resolution.resolvedBy = 'system';
    
    console.log(`Applied field-merge resolution for conflict ${resolution.id}`);
  }

  /**
   * Apply manual resolution
   */
  private async applyManualResolution(resolution: ConflictResolution): Promise<void> {
    resolution.resolvedBy = 'pending_manual_resolution';
    
    console.log(`Applied manual resolution for conflict ${resolution.id} (pending manual intervention)`);
  }

  /**
   * Apply adjustment resolution
   */
  private async applyAdjustmentResolution(resolution: ConflictResolution): Promise<void> {
    // Create adjustment record instead of overwriting
    const adjustment = this.createAdjustmentRecord(resolution);
    
    resolution.clientData = adjustment;
    resolution.resolvedAt = new Date().toISOString();
    resolution.resolvedBy = 'system';
    
    console.log(`Applied adjustment resolution for conflict ${resolution.id}`);
  }

  /**
   * Merge fields based on rules
   */
  private mergeFields(
    serverData: unknown,
    clientData: unknown,
    conflictingFields: string[]
  ): unknown {
    if (typeof serverData !== 'object' || typeof clientData !== 'object' ||
        serverData === null || clientData === null) {
      return clientData;
    }

    const serverObj = serverData as Record<string, unknown>;
    const clientObj = clientData as Record<string, unknown>;
    const mergedObj = { ...serverObj };

    for (const field of conflictingFields) {
      const rule = this.fieldMergeRules.get(field);
      if (rule) {
        mergedObj[field] = this.applyFieldMergeRule(
          serverObj[field],
          clientObj[field],
          rule
        );
      } else {
        // Default to server wins for unmapped fields
        mergedObj[field] = serverObj[field];
      }
    }

    return mergedObj;
  }

  /**
   * Apply field merge rule
   */
  private applyFieldMergeRule(
    serverValue: unknown,
    clientValue: unknown,
    rule: FieldMergeRule
  ): unknown {
    switch (rule.strategy) {
      case 'server_wins':
        return serverValue;
      case 'client_wins':
        return clientValue;
      case 'merge':
        if (rule.customResolver) {
          return rule.customResolver(serverValue, clientValue);
        }
        return clientValue; // Default to client if no custom resolver
      case 'custom':
        if (rule.customResolver) {
          return rule.customResolver(serverValue, clientValue);
        }
        return serverValue; // Default to server if no custom resolver
      default:
        return serverValue;
    }
  }

  /**
   * Create adjustment record
   */
  private createAdjustmentRecord(resolution: ConflictResolution): unknown {
    return {
      type: 'adjustment',
      originalData: resolution.clientData,
      serverData: resolution.serverData,
      reason: `Conflict resolution: ${resolution.description}`,
      timestamp: new Date().toISOString(),
      conflictId: resolution.id
    };
  }

  /**
   * Extract version from data
   */
  private extractVersion(data: unknown): number {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      return typeof obj.version === 'number' ? obj.version : 0;
    }
    return 0;
  }

  /**
   * Extract timestamp from data
   */
  private extractTimestamp(data: unknown): number {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      const updatedAt = obj.updatedAt ?? obj.createdAt;
      if (typeof updatedAt === 'string') {
        return new Date(updatedAt).getTime();
      }
    }
    return 0;
  }

  /**
   * Add custom resolution strategy
   */
  addResolutionStrategy(strategy: ResolutionStrategy): void {
    this.strategies.set(strategy.type, strategy);
  }

  /**
   * Add custom field merge rule
   */
  addFieldMergeRule(rule: FieldMergeRule): void {
    this.fieldMergeRules.set(rule.field, rule);
  }

  /**
   * Get all resolution strategies
   */
  getResolutionStrategies(): ResolutionStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get all field merge rules
   */
  getFieldMergeRules(): FieldMergeRule[] {
    return Array.from(this.fieldMergeRules.values());
  }
}
