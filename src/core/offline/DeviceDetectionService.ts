/**
 * Device Detection Service
 * Real-time device detection and management
 */

import type { DeviceInfo, DeviceCapabilities, DeviceMetadata } from './types';
import { DeviceType, DevicePlatform, DeviceSyncStatus } from './types';

export class DeviceDetectionService {
  private static instance: DeviceDetectionService;
  private deviceInfo: DeviceInfo | null = null;
  private listeners: Array<(deviceInfo: DeviceInfo) => void> = [];

  private constructor() {
    this.initializeDeviceDetection();
  }

  public static getInstance(): DeviceDetectionService {
    if (!DeviceDetectionService.instance) {
      DeviceDetectionService.instance = new DeviceDetectionService();
    }
    return DeviceDetectionService.instance;
  }

  private initializeDeviceDetection(): void {
    if (typeof window === 'undefined') return;

    // Detect device information
    this.deviceInfo = this.detectDeviceInfo();
    
    // Set up periodic updates
    setInterval(() => {
      this.updateDeviceInfo();
    }, 30000); // Update every 30 seconds

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateDeviceInfo();
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.updateDeviceInfo();
    });

    window.addEventListener('offline', () => {
      this.updateDeviceInfo();
    });
  }

  private detectDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const platform = this.detectPlatform(userAgent);
    const type = this.detectDeviceType(userAgent, platform);
    const capabilities = this.detectCapabilities();
    const metadata = this.detectMetadata();

    return {
      id: this.generateDeviceId(),
      name: this.generateDeviceName(type, platform),
      type,
      platform,
      version: this.detectVersion(userAgent),
      lastSeen: new Date(),
      isOnline: navigator.onLine,
      syncStatus: DeviceSyncStatus.ONLINE,
      capabilities,
      metadata
    };
  }

  private detectPlatform(userAgent: string): DevicePlatform {
    if (userAgent.includes('Windows')) return DevicePlatform.WINDOWS;
    if (userAgent.includes('Mac OS')) return DevicePlatform.MACOS;
    if (userAgent.includes('Linux')) return DevicePlatform.LINUX;
    if (userAgent.includes('Android')) return DevicePlatform.ANDROID;
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return DevicePlatform.IOS;
    return DevicePlatform.WEB;
  }

  private detectDeviceType(userAgent: string, platform: DevicePlatform): DeviceType {
    if (userAgent.includes('Mobile')) return DeviceType.MOBILE;
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) return DeviceType.TABLET;
    if (platform === DevicePlatform.WEB) return DeviceType.DESKTOP;
    return DeviceType.DESKTOP;
  }

  private detectVersion(userAgent: string): string {
    // Extract version from user agent
    const versionRegex = /(\d+\.\d+\.\d+)/;
    const versionMatch = versionRegex.exec(userAgent);
    return versionMatch?.[1] ?? '1.0.0';
  }

  private detectCapabilities(): DeviceCapabilities {
    return {
      offlineSupport: 'serviceWorker' in navigator,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      pushNotifications: 'Notification' in window && 'serviceWorker' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      gps: 'geolocation' in navigator,
      storage: this.getStorageInfo()
    };
  }

  private detectMetadata(): DeviceMetadata {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      networkType: this.getNetworkType(),
      batteryLevel: this.getBatteryLevel(),
      storageUsed: this.getStorageUsed(),
      storageTotal: this.getStorageTotal()
    };
  }

  private getStorageInfo(): number {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      void navigator.storage.estimate().then(estimate => 
        Math.round((estimate.quota ?? 0) / (1024 * 1024))
      ).catch(() => 0);
    }
    return 0;
  }

  private getNetworkType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
      return connection?.effectiveType ?? 'unknown';
    }
    return 'unknown';
  }

  private getBatteryLevel(): number | undefined {
    if ('getBattery' in navigator) {
      const getBattery = (navigator as unknown as { getBattery?: () => Promise<{ level: number }> }).getBattery;
      if (getBattery) {
        void getBattery().then((battery) => {
          return Math.round(battery.level * 100);
        }).catch(() => undefined);
      }
    }
    return undefined;
  }

  private getStorageUsed(): number {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      void navigator.storage.estimate().then(estimate => 
        Math.round((estimate.usage ?? 0) / (1024 * 1024))
      ).catch(() => 0);
    }
    return 0;
  }

  private getStorageTotal(): number {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      void navigator.storage.estimate().then(estimate => 
        Math.round((estimate.quota ?? 0) / (1024 * 1024))
      ).catch(() => 0);
    }
    return 0;
  }

  private generateDeviceId(): string {
    // Generate a unique device ID based on browser fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('Device ID', 10, 10);
    const fingerprint = canvas.toDataURL();
    
    // Combine with other unique identifiers
    const uniqueId = btoa(fingerprint + navigator.userAgent + screen.width + screen.height);
    return uniqueId.substring(0, 16);
  }

  private generateDeviceName(type: DeviceType, platform: DevicePlatform): string {
    const typeNames = {
      [DeviceType.DESKTOP]: 'Desktop',
      [DeviceType.TABLET]: 'Tablet',
      [DeviceType.MOBILE]: 'Mobile',
      [DeviceType.SERVER]: 'Server',
      [DeviceType.IOT]: 'IoT Device'
    };

    const platformNames = {
      [DevicePlatform.WINDOWS]: 'Windows',
      [DevicePlatform.MACOS]: 'macOS',
      [DevicePlatform.LINUX]: 'Linux',
      [DevicePlatform.ANDROID]: 'Android',
      [DevicePlatform.IOS]: 'iOS',
      [DevicePlatform.WEB]: 'Web'
    };

    return `${typeNames[type]} (${platformNames[platform]})`;
  }

  private updateDeviceInfo(): void {
    if (!this.deviceInfo) return;

    this.deviceInfo.lastSeen = new Date();
    this.deviceInfo.isOnline = navigator.onLine;
    this.deviceInfo.metadata = this.detectMetadata();
    this.deviceInfo.capabilities = this.detectCapabilities();

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.deviceInfo!);
      } catch (error) {
        console.error('Error in device info listener:', error);
      }
    });
  }

  public getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  public addListener(listener: (deviceInfo: DeviceInfo) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public updateSyncStatus(status: DeviceSyncStatus): void {
    if (this.deviceInfo) {
      this.deviceInfo.syncStatus = status;
      this.updateDeviceInfo();
    }
  }

  public isDeviceSupported(): boolean {
    return this.deviceInfo?.capabilities.offlineSupport ?? false;
  }

  public getDeviceFingerprint(): string {
    if (!this.deviceInfo) return '';
    
    const { type, platform, version, metadata } = this.deviceInfo;
    return btoa(`${type}-${platform}-${version}-${metadata.screenResolution}-${metadata.timezone}`);
  }
}
