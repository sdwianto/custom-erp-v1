/**
 * Device Statistics API
 * GET /api/devices/stats - Get device statistics
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DeviceManagementService } from '@/core/offline/DeviceManagementService';
// Interface for device data
interface Device {
  deviceId: string;
  deviceInfo: {
    platform: string;
    type: string;
    syncStatus: string;
    name: string;
    lastSeen: Date | string;
  };
  isActive: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const deviceManagement = DeviceManagementService.getInstance();
    const stats = deviceManagement.getDeviceStats();
    const devices = deviceManagement.getDevicesByTenant(tenantId) as Device[];

    // Additional statistics
    const platformStats = devices.reduce((acc, device) => {
      const platform = device.deviceInfo.platform;
      acc[platform] = (acc[platform] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeStats = devices.reduce((acc, device) => {
      const type = device.deviceInfo.type;
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const syncStatusStats = devices.reduce((acc, device) => {
      const status = device.deviceInfo.syncStatus;
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        platformStats,
        typeStats,
        syncStatusStats,
        devices: devices.map(device => ({
          id: device.deviceId,
          name: device.deviceInfo.name,
          type: device.deviceInfo.type,
          platform: device.deviceInfo.platform,
          status: device.deviceInfo.syncStatus,
          isActive: device.isActive,
          lastSeen: device.deviceInfo.lastSeen
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching device stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device statistics' },
      { status: 500 }
    );
  }
}
