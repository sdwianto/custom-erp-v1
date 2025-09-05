/**
 * Device Management Service
 * Manages device registration, tracking, and synchronization
 */

// Interface definitions
interface DeviceInfo {
  id: string;
  type: string;
  name: string;
  platform: string;
  version: string;
  syncStatus: string;
  lastSeen: Date | string;
  isOnline: boolean;
}

interface DeviceRegistration {
  deviceId: string;
  userId: string;
  tenantId: string;
  deviceInfo: DeviceInfo;
  registeredAt: Date;
  lastActive: Date;
  isActive: boolean;
}

interface DeviceSyncEvent {
  deviceId: string;
  eventType: string;
  timestamp: Date;
  data?: any;
}

import { DeviceDetectionService } from './DeviceDetectionService';
import { DeviceSyncStatus } from './types';

export class DeviceManagementService {
  private static instance: DeviceManagementService;
  private devices = new Map<string, DeviceRegistration>();
  private deviceDetection: DeviceDetectionService;
  private listeners: Array<(devices: DeviceRegistration[]) => void> = [];
  private syncListeners: Array<(event: DeviceSyncEvent) => void> = [];

  private constructor() {
    this.deviceDetection = DeviceDetectionService.getInstance();
    this.initializeDeviceManagement();
  }

  public static getInstance(): DeviceManagementService {
    if (!DeviceManagementService.instance) {
      DeviceManagementService.instance = new DeviceManagementService();
    }
    return DeviceManagementService.instance;
  }

  private initializeDeviceManagement(): void {
    // Listen for device info changes
    this.deviceDetection.addListener((deviceInfo) => {
      this.updateCurrentDevice(deviceInfo);
    });

    // Load existing devices from storage
    void this.loadDevicesFromStorage();

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupInactiveDevices();
    }, 300000); // Cleanup every 5 minutes
  }

  private async loadDevicesFromStorage(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      const stored = localStorage.getItem('erp_devices');
      if (stored) {
        const devices = JSON.parse(stored) as DeviceRegistration[];
        devices.forEach(device => {
          this.devices.set(device.deviceId, {
            ...device,
            deviceInfo: {
              ...device.deviceInfo,
              lastSeen: new Date(device.deviceInfo.lastSeen)
            }
          });
        });
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading devices from storage:', error);
    }
  }

  private async saveDevicesToStorage(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      const devices = Array.from(this.devices.values());
      localStorage.setItem('erp_devices', JSON.stringify(devices));
    } catch (error) {
      console.error('Error saving devices to storage:', error);
    }
  }

  public async registerDevice(tenantId: string, userId: string): Promise<DeviceRegistration> {
    const deviceInfo = this.deviceDetection.getDeviceInfo();
    if (!deviceInfo) {
      throw new Error('Device information not available');
    }

    const typedDeviceInfo = deviceInfo as DeviceInfo;
    const existingDevice = this.devices.get(typedDeviceInfo.id);
    if (existingDevice) {
      // Update existing device
      existingDevice.lastActive = new Date();
      existingDevice.isActive = true;
      existingDevice.deviceInfo = deviceInfo;
    } else {
      // Create new device registration
      const registration: DeviceRegistration = {
        deviceId: typedDeviceInfo.id,
        userId,
        tenantId,
        deviceInfo,
        registeredAt: new Date(),
        lastActive: new Date(),
        isActive: true
      };
      this.devices.set(typedDeviceInfo.id, registration);
    }

    await this.saveDevicesToStorage();
    this.notifyListeners();
    this.emitSyncEvent(typedDeviceInfo.id, 'connect');

    return this.devices.get(typedDeviceInfo.id)!;
  }

  public async unregisterDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isActive = false;
      device.lastActive = new Date();
      await this.saveDevicesToStorage();
      this.notifyListeners();
      this.emitSyncEvent(deviceId, 'disconnect');
    }
  }

  public async updateDeviceSyncStatus(deviceId: string, status: DeviceSyncStatus): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.deviceInfo.syncStatus = status;
      device.lastActive = new Date();
      await this.saveDevicesToStorage();
      this.notifyListeners();
      
      // Emit sync event
      const eventType = status === DeviceSyncStatus.SYNCING ? 'sync_start' : 
                       status === DeviceSyncStatus.ONLINE ? 'sync_complete' : 
                       status === DeviceSyncStatus.ERROR ? 'sync_error' : 'connect';
      this.emitSyncEvent(deviceId, eventType);
    }
  }

  public getCurrentDevice(): DeviceRegistration | null {
    const deviceInfo = this.deviceDetection.getDeviceInfo();
    if (!deviceInfo) return null;
    
    return this.devices.get((deviceInfo as DeviceInfo).id) ?? null;
  }

  public getAllDevices(): DeviceRegistration[] {
    return Array.from(this.devices.values());
  }

  public getActiveDevices(): DeviceRegistration[] {
    return Array.from(this.devices.values()).filter(device => device.isActive);
  }

  public getDevicesByTenant(tenantId: string): DeviceRegistration[] {
    return Array.from(this.devices.values()).filter(device => device.tenantId === tenantId);
  }

  public getDevicesByUser(userId: string): DeviceRegistration[] {
    return Array.from(this.devices.values()).filter(device => device.userId === userId);
  }

  public getDeviceById(deviceId: string): DeviceRegistration | null {
    return this.devices.get(deviceId) ?? null;
  }

  public async updateDeviceInfo(deviceId: string, updates: Partial<DeviceInfo>): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.deviceInfo = { ...device.deviceInfo, ...updates };
      device.lastActive = new Date();
      await this.saveDevicesToStorage();
      this.notifyListeners();
    }
  }

  public async markDeviceAsActive(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isActive = true;
      device.lastActive = new Date();
      await this.saveDevicesToStorage();
      this.notifyListeners();
    }
  }

  public async markDeviceAsInactive(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isActive = false;
      device.lastActive = new Date();
      await this.saveDevicesToStorage();
      this.notifyListeners();
    }
  }

  private updateCurrentDevice(deviceInfo: DeviceInfo): void {
    const currentDevice = this.getCurrentDevice();
    if (currentDevice) {
      currentDevice.deviceInfo = deviceInfo;
      currentDevice.lastActive = new Date();
      void this.saveDevicesToStorage();
      this.notifyListeners();
    }
  }

  private cleanupInactiveDevices(): void {
    const now = new Date();
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours

    let hasChanges = false;
    this.devices.forEach((device, deviceId) => {
      const timeSinceLastActive = now.getTime() - device.lastActive.getTime();
      if (timeSinceLastActive > inactiveThreshold && !device.isActive) {
        this.devices.delete(deviceId);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      void this.saveDevicesToStorage();
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    const devices = Array.from(this.devices.values());
    this.listeners.forEach(listener => {
      try {
        listener(devices);
      } catch (error) {
        console.error('Error in device listener:', error);
      }
    });
  }

  private emitSyncEvent(deviceId: string, eventType: DeviceSyncEvent['eventType'], data?: any): void {
    const event: DeviceSyncEvent = {
      deviceId,
      eventType,
      timestamp: new Date(),
      data
    };

    this.syncListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in sync event listener:', error);
      }
    });
  }

  public addDeviceListener(listener: (devices: DeviceRegistration[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public addSyncEventListener(listener: (event: DeviceSyncEvent) => void): () => void {
    this.syncListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  public getDeviceStats(): {
    total: number;
    active: number;
    offline: number;
    syncing: number;
    error: number;
  } {
    const devices = Array.from(this.devices.values());
    return {
      total: devices.length,
      active: devices.filter(d => d.isActive).length,
      offline: devices.filter(d => !d.deviceInfo.isOnline).length,
      syncing: devices.filter(d => d.deviceInfo.syncStatus === 'syncing').length,
      error: devices.filter(d => d.deviceInfo.syncStatus === 'error').length
    };
  }

  public async syncAllDevices(): Promise<void> {
    const activeDevices = this.getActiveDevices();
    for (const device of activeDevices) {
      await this.updateDeviceSyncStatus(device.deviceId, DeviceSyncStatus.SYNCING);
      // Simulate sync process
      setTimeout(() => {
        void this.updateDeviceSyncStatus(device.deviceId, DeviceSyncStatus.ONLINE);
      }, 1000);
    }
  }
}
