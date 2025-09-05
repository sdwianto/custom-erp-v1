/**
 * Device Management API Routes
 * GET /api/devices - Get all devices for tenant
 * POST /api/devices - Register new device
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DeviceManagementService } from '@/core/offline/DeviceManagementService';
// Interface for device registration
interface DeviceRegistration {
  deviceId: string;
  deviceInfo: {
    type: string;
    name: string;
    lastSeen: Date | string;
    platform: string;
    version: string;
    syncStatus: string;
  };
  isActive: boolean;
  tenantId: string;
  userId: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const userId = searchParams.get('userId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const deviceManagement = DeviceManagementService.getInstance();
    let devices: DeviceRegistration[];

    if (userId) {
      devices = deviceManagement.getDevicesByUser(userId) as DeviceRegistration[];
    } else {
      devices = deviceManagement.getDevicesByTenant(tenantId) as DeviceRegistration[];
    }

    return NextResponse.json({
      success: true,
      data: devices,
      count: devices.length
    });

  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, userId, deviceInfo } = body;

    if (!tenantId || !userId || !deviceInfo) {
      return NextResponse.json(
        { error: 'Tenant ID, User ID, and Device Info are required' },
        { status: 400 }
      );
    }

    const deviceManagement = DeviceManagementService.getInstance();
    const registration = await deviceManagement.registerDevice(tenantId as string, userId as string) as DeviceRegistration;

    return NextResponse.json({
      success: true,
      data: registration
    });

  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    );
  }
}
