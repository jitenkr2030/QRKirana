import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { whatsappService } from '@/lib/whatsapp/service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const statusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'])
})

async function verifyAuth(request: NextRequest): Promise<{ shopId: string } | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return { shopId: decoded.shopId }
  } catch (error) {
    return null
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = statusSchema.parse(body)
    const orderId = params.orderId

    // Get the order and verify it belongs to the shop
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        shopId: auth.shopId
      }
    })

    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      )
    }

    // Update order status
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { status: validatedData.status }
    })

    // Send WhatsApp notification to customer
    try {
      await whatsappService.sendNotification({
        customerMobile: updatedOrder.customerMobile,
        orderNumber: `ORD${updatedOrder.id.slice(-8).toUpperCase()}`,
        status: validatedData.status,
        shopName: shop.name
      }, 'update')
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error)
      // Don't fail the status update if WhatsApp fails
    }

    return NextResponse.json({
      message: 'Order status updated successfully',
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status
      }
    })

  } catch (error) {
    console.error('Order status update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}