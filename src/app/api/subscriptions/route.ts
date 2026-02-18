import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const createSubscriptionSchema = z.object({
  customerId: z.string(),
  shopId: z.string(),
  productId: z.string(),
  quantity: z.number().min(0.1, 'Quantity must be at least 0.1'),
  unit: z.string(),
  pricePerUnit: z.number().min(0, 'Price must be positive'),
  frequency: z.enum(['daily', 'weekly', 'custom']),
  deliveryTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  deliveryDays: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  autoCharge: z.boolean().default(false),
  notes: z.string().optional(),
})

const updateSubscriptionSchema = z.object({
  quantity: z.number().min(0.1).optional(),
  pricePerUnit: z.number().min(0).optional(),
  frequency: z.enum(['daily', 'weekly', 'custom']).optional(),
  deliveryTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
  deliveryDays: z.string().optional(),
  endDate: z.string().datetime().optional(),
  autoCharge: z.boolean().optional(),
  paused: z.boolean().optional(),
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
    const validatedData = createSubscriptionSchema.parse(body)

    // Verify the shopId matches the authenticated shop
    if (validatedData.shopId !== auth.shopId) {
      return NextResponse.json(
        { message: 'Unauthorized: Shop ID mismatch' },
        { status: 401 }
      )
    }

    // Check if customer exists and belongs to the shop
    const customer = await db.customer.findFirst({
      where: {
        id: validatedData.customerId,
        shopId: validatedData.shopId
      }
    })

    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check if product exists and belongs to the shop
    const product = await db.product.findFirst({
      where: {
        id: validatedData.productId,
        shopId: validatedData.shopId
      }
    })

    if (!product) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if subscription already exists for this customer and product
    const existingSubscription = await db.subscription.findFirst({
      where: {
        customerId: validatedData.customerId,
        productId: validatedData.productId,
        shopId: validatedData.shopId
      }
    })

    if (existingSubscription) {
      return NextResponse.json(
        { message: 'Subscription already exists for this customer and product' },
        { status: 400 }
      )
    }

    // Get subscription settings
    const subscriptionSettings = await db.subscriptionSettings.findFirst({
      where: { shopId: validatedData.shopId }
    })

    // Create subscription
    const subscription = await db.subscription.create({
      data: {
        customerId: validatedData.customerId,
        shopId: validatedData.shopId,
        productId: validatedData.productId,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        pricePerUnit: validatedData.pricePerUnit,
        frequency: validatedData.frequency,
        deliveryTime: validatedData.deliveryTime,
        deliveryDays: validatedData.deliveryDays || null,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        nextDelivery: calculateNextDelivery(
          validatedData.frequency,
          validatedData.deliveryTime,
          validatedData.deliveryDays,
          new Date(validatedData.startDate)
        ),
        autoCharge: validatedData.autoCharge,
        notes: validatedData.notes || null,
      }
    })

    // Create first delivery schedule
    const firstDelivery = await createDeliverySchedule(subscription.id, subscription)

    return NextResponse.json({
      message: 'Subscription created successfully',
      subscription: {
        id: subscription.id,
        customerId: subscription.customerId,
        productId: subscription.productId,
        quantity: subscription.quantity,
        unit: subscription.unit,
        pricePerUnit: subscription.pricePerUnit,
        frequency: subscription.frequency,
        deliveryTime: subscription.deliveryTime,
        deliveryDays: subscription.deliveryDays,
        isActive: subscription.isActive,
        startDate: subscription.startDate.toISOString(),
        nextDelivery: subscription.nextDelivery?.toISOString(),
        autoCharge: subscription.autoCharge,
        createdAt: subscription.createdAt.toISOString(),
        firstDelivery: firstDelivery
      }
    })

  } catch (error) {
    console.error('Subscription creation error:', error)
    
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
    const customerId = searchParams.get('customerId')
    const productId = searchParams.get('productId')
    const status = searchParams.get('status')
    const shopId = auth.shopId

    let whereClause: any = { shopId }
    if (customerId) whereClause.customerId = customerId
    if (productId) whereClause.productId = productId
    if (status) whereClause.isActive = status === 'true'

    const subscriptions = await db.subscription.findMany({
      where: whereClause,
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
        },
        deliveries: {
          orderBy: { deliveryDate: 'desc' },
          take: 10
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        customer: sub.customer,
        product: sub.product,
        quantity: sub.quantity,
        unit: sub.unit,
        pricePerUnit: sub.pricePerUnit,
        frequency: sub.frequency,
        deliveryTime: sub.deliveryTime,
        deliveryDays: sub.deliveryDays,
        isActive: sub.isActive,
        paused: sub.paused,
        startDate: sub.startDate.toISOString(),
        endDate: sub.endDate?.toISOString(),
        nextDelivery: sub.nextDelivery?.toISOString(),
        autoCharge: sub.autoCharge,
        lastCharged: sub.lastCharged?.toISOString(),
        notes: sub.notes,
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
        deliveries: sub.deliveries.map(delivery => ({
          id: delivery.id,
          deliveryDate: delivery.deliveryDate.toISOString(),
          scheduledTime: delivery.scheduledTime,
          status: delivery.status,
          quantity: delivery.quantity,
          actualQuantity: delivery.actualQuantity,
          actualPrice: delivery.actualPrice,
          deliveredAt: delivery.deliveredAt?.toISOString(),
          notes: delivery.notes
        }))
      }))
    })

  } catch (error) {
    console.error('Subscriptions fetch error:', error)
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
    const subscriptionId = searchParams.get('id')
    
    if (!subscriptionId) {
      return NextResponse.json(
        { message: 'Subscription ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateSubscriptionSchema.parse(body)

    // Get existing subscription
    const existingSubscription = await db.subscription.findFirst({
      where: {
        id: subscriptionId,
        shopId: auth.shopId
      }
    })

    if (!existingSubscription) {
      return NextResponse.json(
        { message: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Update subscription
    const updateData: any = {}
    if (validatedData.quantity !== undefined) updateData.quantity = validatedData.quantity
    if (validatedData.pricePerUnit !== undefined) updateData.pricePerUnit = validatedData.pricePerUnit
    if (validatedData.frequency !== undefined) updateData.frequency = validatedData.frequency
    if (validatedData.deliveryTime !== undefined) updateData.deliveryTime = validatedData.deliveryTime
    if (validatedData.deliveryDays !== undefined) updateData.deliveryDays = validatedData.deliveryDays
    if (validatedData.endDate !== undefined) updateData.endDate = new Date(validatedData.endDate)
    if (validatedData.autoCharge !== undefined) updateData.autoCharge = validatedData.autoCharge
    if (validatedData.paused !== undefined) updateData.paused = validatedData.paused
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes

    // Recalculate next delivery if frequency or delivery time changed
    if (validatedData.frequency || validatedData.deliveryTime || validatedData.deliveryDays) {
      updateData.nextDelivery = calculateNextDelivery(
        validatedData.frequency || existingSubscription.frequency,
        validatedData.deliveryTime || existingSubscription.deliveryTime,
        validatedData.deliveryDays || existingSubscription.deliveryDays,
        existingSubscription.startDate
      )
    }

    const updatedSubscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: updateData
    })

    return NextResponse.json({
      message: 'Subscription updated successfully',
      subscription: {
        id: updatedSubscription.id,
        quantity: updatedSubscription.quantity,
        pricePerUnit: updatedSubscription.pricePerUnit,
        frequency: updatedSubscription.frequency,
        deliveryTime: updatedSubscription.deliveryTime,
        deliveryDays: updatedSubscription.deliveryDays,
        isActive: updatedSubscription.isActive,
        paused: updatedSubscription.paused,
        nextDelivery: updatedSubscription.nextDelivery?.toISOString(),
        autoCharge: updatedSubscription.autoCharge,
        updatedAt: updatedSubscription.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Subscription update error:', error)
    
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

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('id')
    
    if (!subscriptionId) {
      return NextResponse.json(
        { message: 'Subscription ID is required' },
        { status: 400 }
      )
    }

    // Check if subscription exists and belongs to the shop
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

    // Delete related delivery schedules
    await db.deliverySchedule.deleteMany({
      where: { subscriptionId }
    })

    // Delete subscription
    await db.subscription.delete({
      where: { id: subscriptionId }
    })

    return NextResponse.json({
      message: 'Subscription deleted successfully'
    })

  } catch (error) {
    console.error('Subscription deletion error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate next delivery date
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

// Helper function to create delivery schedule
async function createDeliverySchedule(subscriptionId: string, subscription: any) {
  const deliveryDate = calculateNextDelivery(
    subscription.frequency,
    subscription.deliveryTime,
    subscription.deliveryDays,
    subscription.startDate
  )

  return await db.deliverySchedule.create({
    data: {
      subscriptionId,
      deliveryDate,
      scheduledTime: subscription.deliveryTime,
      status: 'SCHEDULED',
      quantity: subscription.quantity,
    }
  })
}