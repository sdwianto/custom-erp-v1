/**
 * Device Management Hook
 * React hook for managing devices in the UI
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceManagementService } from '@/core/offline/DeviceManagementService';
import type { DeviceRegistration, DeviceSyncStatus } from '@/core/offline/types';

export interface UseDeviceManagementReturn {
  devices: DeviceRegistration[];
  currentDevice: DeviceRegistration | null;
  deviceStats: {
    total: number;
    active: number;
    offline: number;
    syncing: number;
    error: number;
  };
  isLoading: boolean;
  error: string | null;
  registerDevice: (tenantId: string, userId: string) => Promise<void>;
  unregisterDevice: (deviceId: string) => Promise<void>;
  updateSyncStatus: (deviceId: string, status: DeviceSyncStatus) => Promise<void>;
  syncAllDevices: () => Promise<void>;
  refreshDevices: () => void;
}

export function useDeviceManagement(): UseDeviceManagementReturn {
  const [devices, setDevices] = useState<DeviceRegistration[]>([]);
  const [currentDevice, setCurrentDevice] = useState<DeviceRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const deviceManagementRef = useRef<DeviceManagementService | null>(null);
  const deviceListenerRef = useRef<(() => void) | null>(null);
  const syncListenerRef = useRef<(() => void) | null>(null);

  const initializeDeviceManagement = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const deviceManagement = DeviceManagementService.getInstance();
      deviceManagementRef.current = deviceManagement;

      // Set up device listener
      deviceListenerRef.current = deviceManagement.addDeviceListener((updatedDevices) => {
        setDevices(updatedDevices as DeviceRegistration[]);
        setCurrentDevice(deviceManagement.getCurrentDevice() as DeviceRegistration | null);
      });

      // Set up sync event listener
      syncListenerRef.current = deviceManagement.addSyncEventListener((event: unknown) => {
        console.log('Device sync event:', event);
        // You can add additional sync event handling here
      });

      // Get initial devices
      const initialDevices = deviceManagement.getAllDevices();
      setDevices(initialDevices as DeviceRegistration[]);
      setCurrentDevice(deviceManagement.getCurrentDevice() as DeviceRegistration | null);

    } catch (err) {
      console.error('Error initializing device management:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize device management');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerDevice = useCallback(async (tenantId: string, userId: string) => {
    try {
      if (!deviceManagementRef.current) {
        throw new Error('Device management not initialized');
      }

      await deviceManagementRef.current.registerDevice(tenantId, userId);
    } catch (err) {
      console.error('Error registering device:', err);
      setError(err instanceof Error ? err.message : 'Failed to register device');
      throw err;
    }
  }, []);

  const unregisterDevice = useCallback(async (deviceId: string) => {
    try {
      if (!deviceManagementRef.current) {
        throw new Error('Device management not initialized');
      }

      await deviceManagementRef.current.unregisterDevice(deviceId);
    } catch (err) {
      console.error('Error unregistering device:', err);
      setError(err instanceof Error ? err.message : 'Failed to unregister device');
      throw err;
    }
  }, []);

  const updateSyncStatus = useCallback(async (deviceId: string, status: DeviceSyncStatus) => {
    try {
      if (!deviceManagementRef.current) {
        throw new Error('Device management not initialized');
      }

      await deviceManagementRef.current.updateDeviceSyncStatus(deviceId, status);
    } catch (err) {
      console.error('Error updating sync status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update sync status');
      throw err;
    }
  }, []);

  const syncAllDevices = useCallback(async () => {
    try {
      if (!deviceManagementRef.current) {
        throw new Error('Device management not initialized');
      }

      await deviceManagementRef.current.syncAllDevices();
    } catch (err) {
      console.error('Error syncing all devices:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync devices');
      throw err;
    }
  }, []);

  const refreshDevices = useCallback(() => {
    if (deviceManagementRef.current) {
      const updatedDevices = deviceManagementRef.current.getAllDevices();
      setDevices(updatedDevices as DeviceRegistration[]);
      setCurrentDevice(deviceManagementRef.current.getCurrentDevice() as DeviceRegistration | null);
    }
  }, []);

  const getDeviceStats = useCallback(() => {
    if (!deviceManagementRef.current) {
      return {
        total: 0,
        active: 0,
        offline: 0,
        syncing: 0,
        error: 0
      };
    }

    return deviceManagementRef.current.getDeviceStats();
  }, []);

  useEffect(() => {
    void initializeDeviceManagement();

    return () => {
      if (deviceListenerRef.current) {
        deviceListenerRef.current();
      }
      if (syncListenerRef.current) {
        syncListenerRef.current();
      }
    };
  }, [initializeDeviceManagement]);

  const deviceStats = getDeviceStats();

  return {
    devices,
    currentDevice,
    deviceStats,
    isLoading,
    error,
    registerDevice,
    unregisterDevice,
    updateSyncStatus,
    syncAllDevices,
    refreshDevices
  };
}
