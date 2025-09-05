/**
 * Device Management API Routes
 * GET /api/devices/[deviceId] - Get specific device
 * PUT /api/devices/[deviceId] - Update device
 * DELETE /api/devices/[deviceId] - Unregister device
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DeviceManagementService } from '@/core/offline/DeviceManagementService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;

    const deviceManagement = DeviceManagementService.getInstance();
    const device = deviceManagement.getDeviceById(deviceId);

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: device
    });

  } catch (error) {
    console.error('Error fetching device:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const body = await request.json() as { updates?: Record<string, unknown> };
    const { updates } = body;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates are required and must be an object' },
        { status: 400 }
      );
    }

    // Validate and sanitize updates to match DeviceInfo structure
    const validUpdates: Record<string, unknown> = {};
    const allowedFields = ['type', 'name', 'platform', 'version', 'syncStatus', 'lastSeen', 'isOnline'];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        validUpdates[key] = value;
      }
    }

    const deviceManagement = DeviceManagementService.getInstance();
    await deviceManagement.updateDeviceInfo(deviceId, validUpdates);

    const updatedDevice = deviceManagement.getDeviceById(deviceId);

    return NextResponse.json({
      success: true,
      data: updatedDevice
    });

  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;

    const deviceManagement = DeviceManagementService.getInstance();
    await deviceManagement.unregisterDevice(deviceId);

    return NextResponse.json({
      success: true,
      message: 'Device unregistered successfully'
    });

  } catch (error) {
    console.error('Error unregistering device:', error);
    return NextResponse.json(
      { error: 'Failed to unregister device' },
      { status: 500 }
    );
  }
}
