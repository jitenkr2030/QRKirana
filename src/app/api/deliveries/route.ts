import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const updateDeliverySchema = z.object({
  status: z.enum(['SCHEDULED', 'DELIVERED', 'SKIPPED', 'CANCELLED', 'FAILED']).optional(),
  quantity: z.number().min(0).optional(),
  actualQuantity: z.number().min(0).optional(),
  actualPrice: z.number().min(0).optional(),
  deliveredBy: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
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

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscriptionId')
    const status = searchParams.get('status')
    const date = searchParams.get('date')
    const shopId = auth.shopId

    let whereClause: any = { shopId }
    if (subscriptionId) whereClause.subscriptionId = subscriptionId
    if (status) whereClause.status = status
    if (date) {
      const targetDate = new Date(date)
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)
      whereClause.deliveryDate = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    const deliveries = await db.deliverySchedule.findMany({
      where: whereClause,
      include: {
        subscription: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                mobile: true,
                address: true
              }
            },
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: { deliveryDate: 'asc' }
    })

    return NextResponse.json({
      deliveries: deliveries.map(delivery => ({
        id: delivery.id,
        subscriptionId: delivery.subscriptionId,
        deliveryDate: delivery.deliveryDate.toISOString(),
        scheduledTime: delivery.scheduledTime,
        status: delivery.status,
        quantity: delivery.quantity,
        actualQuantity: delivery.actualQuantity,
        actualPrice: delivery.actualPrice,
        deliveredBy: delivery.deliveredBy,
        deliveryAddress: delivery.deliveryAddress,
        notes: delivery.notes,
        deliveredAt: delivery.deliveredAt?.toISOString(),
        createdAt: delivery.createdAt.toISOString(),
        updatedAt: delivery.updatedAt.toISOString(),
        subscription: {
          id: delivery.subscription.id,
          customer: delivery.subscription.customer,
          product: delivery.subscription.product,
          frequency: delivery.subscription.frequency,
          deliveryTime: delivery.subscription.deliveryTime,
          deliveryDays: delivery.subscription.deliveryDays
        }
      }))
    })

  } catch (error) {
    console.error('Deliveries fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const deliveryId = searchParams.get('id')
    
    if (!deliveryId) {
      return NextResponse.json(
        { message: 'Delivery ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateDeliverySchema.parse(body)

    // Get existing delivery
    const existingDelivery = await db.deliverySchedule.findFirst({
      where: {
        id: deliveryId,
        subscription: {
          shopId: auth.shopId
        }
      },
      include: {
        subscription: true
      }
    })

    if (!existingDelivery) {
      return NextResponse.json(
        { message: 'Delivery not found' },
        { status: 404 }
      )
    }

    // Update delivery
    const updateData: any = {}
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.quantity !== undefined) updateData.quantity = validatedData.quantity
    if (validatedData.actualQuantity !== undefined) updateData.actualQuantity = validatedData.actualQuantity
    if (validatedData.actualPrice !== undefined) updateData.actualPrice = validatedData.actualPrice
    if (validatedData.deliveredBy !== undefined) updateData.deliveredBy = validatedData.deliveredBy
    if (validatedData.deliveryAddress !== undefined) updateData.deliveryAddress = validatedData.deliveryAddress
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes

    // If status is DELIVERED, set deliveredAt
    if (validatedData.status === 'DELIVERED') {
      updateData.deliveredAt = new Date()
    }

    const updatedDelivery = await db.deliverySchedule.update({
      where: { id: deliveryId },
      data: updateData
    })

    // If delivery was completed, create next delivery for the subscription
    if (validatedData.status === 'DELIVERED' && existingDelivery.subscription.isActive) {
      await createNextDelivery(existingDelivery.subscriptionId)
    }

    // If delivery was completed and auto-charge is enabled, create invoice
    if (validatedData.status === 'DELIVERED' && existingDelivery.subscription.autoCharge) {
      await createSubscriptionInvoice(existingDelivery.subscriptionId, existingDelivery)
    }

    return NextResponse.json({
      message: 'Delivery updated successfully',
      delivery: {
        id: updatedDelivery.id,
        status: updatedDelivery.status,
        quantity: updatedDelivery.quantity,
        actualQuantity: updatedDelivery.actualQuantity,
        actualPrice: updatedDelivery.actualPrice,
        deliveredAt: updatedDelivery.deliveredAt?.toISOString(),
        updatedAt: updatedDelivery.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Delivery update error:', error)
    
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

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subscriptionId, deliveryDate, quantity, notes } = body

    if (!subscriptionId || !deliveryDate || !quantity) {
      return NextResponse.json(
        { message: 'Subscription ID, delivery date, and quantity are required' },
        { status: 400 }
      )
    }

    // Verify subscription exists and belongs to the shop
    const subscription = await db.subscription.findFirst({
      where: {
        id: subscriptionId,
        shopId: auth.shopId
      }
    })

    if (!subscription) {
      return NextResponse.json(
        { message: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Create manual delivery
    const delivery = await db.deliverySchedule.create({
      data: {
        subscriptionId,
        deliveryDate: new Date(deliveryDate),
        scheduledTime: subscription.deliveryTime,
        status: 'SCHEDULED',
        quantity,
        notes: notes || null
      }
    })

    return NextResponse.json({
      message: 'Delivery created successfully',
      delivery: {
        id: delivery.id,
        deliveryDate: delivery.deliveryDate.toISOString(),
        scheduledTime: delivery.scheduledTime,
        status: delivery.status,
        quantity: delivery.quantity,
        createdAt: delivery.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Manual delivery creation error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to create next delivery
async function createNextDelivery(subscriptionId: string) {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId }
  })

  if (!subscription || !subscription.isActive) {
    return
  }

  const nextDeliveryDate = calculateNextDelivery(
    subscription.frequency,
    subscription.deliveryTime,
    subscription.deliveryDays,
    new Date()
  )

  // Only create if next delivery is within a reasonable timeframe (30 days)
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  if (nextDeliveryDate <= thirtyDaysFromNow) {
    await db.deliverySchedule.create({
      data: {
        subscriptionId,
        deliveryDate: nextDeliveryDate,
        scheduledTime: subscription.deliveryTime,
        status: 'SCHEDULED',
        quantity: subscription.quantity,
      }
    })
  }
}

// Helper function to create subscription invoice
async function createSubscriptionInvoice(subscriptionId: string, delivery: any) {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      customer: true,
      shop: true
    }
  })

  if (!subscription || !subscription.autoCharge) {
    return
  }

  const invoiceNumber = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).toUpperCase().substr(2, 9)}`
  
  const invoice = await db.invoice.create({
    data: {
      invoiceNumber,
      customerId: subscription.customerId,
      shopId: subscription.shopId,
      items: JSON.stringify([{
        productId: subscription.productId,
        name: `Subscription - ${subscription.frequency}`,
        quantity: delivery.actualQuantity || delivery.quantity,
        price: delivery.actualPrice || (subscription.pricePerUnit * (delivery.actualQuantity || delivery.quantity)),
        unit: subscription.unit
      }]),
      subtotal: delivery.actualPrice || (subscription.pricePerUnit * (delivery.actualQuantity || delivery.quantity)),
      totalAmount: delivery.actualPrice || (subscription.pricePerUnit * (delivery.actualQuantity || delivery.quantity)),
      status: 'SENT',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      reference: subscriptionId,
      notes: `Auto-generated invoice for subscription delivery`
    }
  })

  // Update subscription last charged date
  await db.subscription.update({
    where: { id: subscriptionId },
    data: { lastCharged: new Date() }
  })

  return invoice
}

// Helper function to calculate next delivery (reused from subscriptions)
function calculateNextDelivery(
  frequency: string,
  deliveryTime: string,
  deliveryDays: string | null,
  startDate: Date
): Date {
  const now = new Date()
  let nextDate = new Date(startDate)

  // If start date is in the past, use current date
  if (startDate < now) {
    nextDate = new Date(now)
  }

  // Set the delivery time
  const [hours, minutes] = deliveryTime.split(':').map(Number)
  nextDate.setHours(hours, minutes, 0, 0)

  // If delivery time has passed for today, move to next day
  if (nextDate <= now) {
    nextDate.setDate(nextDate.getDate() + 1)
  }

  // Calculate based on frequency
  switch (frequency) {
    case 'daily':
      // For daily, just ensure it's in the future
      while (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + 1)
      }
      break
    
    case 'weekly':
      // For weekly, move to next week
      while (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + 7)
      }
      break
    
    case 'custom':
      // For custom, use deliveryDays if provided
      if (deliveryDays) {
        const days = deliveryDays.split(',').map(d => d.trim().toLowerCase())
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        
        while (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 1)
          
          // Check if this day is in the delivery schedule
          const dayOfWeek = dayNames[nextDate.getDay()]
          if (!days.includes(dayOfWeek)) {
            continue
          }
          
          // If this day is in the schedule and time is in the future, break
          if (nextDate > now) {
            break
          }
        }
      }
      break
  }

  return nextDate
}