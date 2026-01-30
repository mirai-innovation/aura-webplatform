import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Device from '@/models/Device'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const authUser = getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const query: Record<string, unknown> = {}
    if (userId) query.userId = userId
    if (status) query.status = status
    const devices = await Device.find(query).populate('userId', 'name username').sort({ createdAt: -1 })
    const list = devices.map((d) => {
      const populated = d.userId as unknown as { _id?: { toString(): string }; name?: string; username?: string } | null | undefined
      const userIdPayload =
        populated && typeof populated === 'object' && populated._id != null
          ? {
              id: typeof populated._id === 'object' && 'toString' in populated._id ? populated._id.toString() : String(populated._id),
              name: populated.name,
              username: populated.username,
            }
          : null
      return {
        id: d._id.toString(),
        serialNumber: d.serialNumber,
        userId: userIdPayload,
        model: d.model,
        firmwareVersion: d.firmwareVersion,
        status: d.status,
        lastSeen: d.lastSeen,
        createdAt: d.createdAt,
      }
    })
    return NextResponse.json({ devices: list })
  } catch (error: unknown) {
    console.error('Devices list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const authUser = getAuthUser(request)
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { serialNumber, userId, model, firmwareVersion, status } = body
    if (!serialNumber) {
      return NextResponse.json({ error: 'serialNumber is required' }, { status: 400 })
    }
    const existing = await Device.findOne({ serialNumber })
    if (existing) {
      return NextResponse.json({ error: 'Device with this serial number already exists' }, { status: 409 })
    }
    const device = await Device.create({
      serialNumber,
      userId: userId || undefined,
      model: model || 'Aura Pro v2.1',
      firmwareVersion: firmwareVersion || '2.1.0',
      status: status || 'active',
    })
    return NextResponse.json({
      device: {
        id: device._id.toString(),
        serialNumber: device.serialNumber,
        userId: device.userId?.toString(),
        model: device.model,
        firmwareVersion: device.firmwareVersion,
        status: device.status,
        createdAt: device.createdAt,
      },
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Device create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
