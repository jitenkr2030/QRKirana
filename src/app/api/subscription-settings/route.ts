import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const settingsSchema = z.object({
  autoGenerate: z.boolean().optional(),
  defaultFrequency: z.enum(['daily', 'weekly', 'custom']).optional(),
  minSubscriptionDays: z.number().min(1).optional(),
  allowPause: z.boolean().optional(),
  allowCancel: z.boolean().optional(),
  cancellationFee: z.number().min(0).optional(),
  pauseFee: z.number().min(0).optional(),
  deliveryRadius: z.number().min(0).optional(),
  deliveryCharge: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
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

    const shopId = auth.shopId

    let subscriptionSettings = await db.subscriptionSettings.findFirst({
      where: { shopId }
    })

    // If no settings exist, create default ones
    if (!subscriptionSettings) {
      subscriptionSettings = await db.subscriptionSettings.create({
        data: {
          shopId,
          autoGenerate: true,
          defaultFrequency: 'daily',
          minSubscriptionDays: 7,
          allowPause: true,
          allowCancel: true,
          cancellationFee: 0,
          pauseFee: 0,
          deliveryRadius: 5,
          deliveryCharge: 0,
          isActive: true
        }
      })
    }

    return NextResponse.json({
      settings: {
        id: subscriptionSettings.id,
        autoGenerate: subscriptionSettings.autoGenerate,
        defaultFrequency: subscriptionSettings.defaultFrequency,
        minSubscriptionDays: subscriptionSettings.minSubscriptionDays,
        allowPause: subscriptionSettings.allowPause,
        allowCancel: subscriptionSettings.allowCancel,
        cancellationFee: subscriptionSettings.cancellationFee,
        pauseFee: subscriptionSettings.pauseFee,
        deliveryRadius: subscriptionSettings.deliveryRadius,
        deliveryCharge: subscriptionSettings.deliveryCharge,
        isActive: subscriptionSettings.isActive,
        createdAt: subscriptionSettings.createdAt.toISOString(),
        updatedAt: subscriptionSettings.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Subscription settings fetch error:', error)
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

    const body = await request.json()
    const validatedData = settingsSchema.parse(body)
    const shopId = auth.shopId

    // Get existing settings
    let subscriptionSettings = await db.subscriptionSettings.findFirst({
      where: { shopId }
    })

    if (!subscriptionSettings) {
      // Create new settings if they don't exist
      subscriptionSettings = await db.subscriptionSettings.create({
        data: {
          shopId,
          autoGenerate: validatedData.autoGenerate ?? true,
          defaultFrequency: validatedData.defaultFrequency ?? 'daily',
          minSubscriptionDays: validatedData.minSubscriptionDays ?? 7,
          allowPause: validatedData.allowPause ?? true,
          allowCancel: validatedData.allowCancel ?? true,
          cancellationFee: validatedData.cancellationFee ?? 0,
          pauseFee: validatedData.pauseFee ?? 0,
          deliveryRadius: validatedData.deliveryRadius ?? 5,
          deliveryCharge: validatedData.deliveryCharge ?? 0,
          isActive: validatedData.isActive ?? true
        }
      })
    } else {
      // Update existing settings
      subscriptionSettings = await db.subscriptionSettings.update({
        where: { id: subscriptionSettings.id },
        data: {
          ...(validatedData.autoGenerate !== undefined && { autoGenerate: validatedData.autoGenerate }),
          ...(validatedData.defaultFrequency !== undefined && { defaultFrequency: validatedData.defaultFrequency }),
          ...(validatedData.minSubscriptionDays !== undefined && { minSubscriptionDays: validatedData.minSubscriptionDays }),
          ...(validatedData.allowPause !== undefined && { allowPause: validatedData.allowPause }),
          ...(validatedData.allowCancel !== undefined && { allowCancel: validatedData.allowCancel }),
          ...(validatedData.cancellationFee !== undefined && { cancellationFee: validatedData.cancellationFee }),
          ...(validatedData.pauseFee !== undefined && { pauseFee: validatedData.pauseFee }),
          ...(validatedData.deliveryRadius !== undefined && { deliveryRadius: validatedData.deliveryRadius }),
          ...(validatedData.deliveryCharge !== undefined && { deliveryCharge: validatedData.deliveryCharge }),
          ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive })
        }
      })
    }

    return NextResponse.json({
      message: 'Subscription settings updated successfully',
      settings: {
        id: subscriptionSettings.id,
        autoGenerate: subscriptionSettings.autoGenerate,
        defaultFrequency: subscriptionSettings.defaultFrequency,
        minSubscriptionDays: subscriptionSettings.minSubscriptionDays,
        allowPause: subscriptionSettings.allowPause,
        allowCancel: subscriptionSettings.allowCancel,
        cancellationFee: subscriptionSettings.cancellationFee,
        pauseFee: subscriptionSettings.pauseFee,
        deliveryRadius: subscriptionSettings.deliveryRadius,
        deliveryCharge: subscriptionSettings.deliveryCharge,
        isActive: subscriptionSettings.isActive,
        updatedAt: subscriptionSettings.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Subscription settings update error:', error)
    
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
    const { subscriptionId, action } = body

    if (!subscriptionId || !action) {
      return NextResponse.json(
        { message: 'Subscription ID and action are required' },
        { status: 400 }
      )
    }

    // Get subscription and verify it belongs to the shop
    const subscription = await db.subscription.findFirst({
      where: {
        id: subscriptionId,
        shopId: auth.shopId
      },
      include: {
        customer: true,
        shop: true
      }
    })

    if (!subscription) {
      return NextResponse.json(
        { message: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Get subscription settings
    const settings = await db.subscriptionSettings.findFirst({
      where: { shopId: auth.shopId }
    })

    if (!settings) {
      return NextResponse.json(
        { message: 'Subscription settings not found' },
        { status: 404 }
      )
    }

    let result: any = {}

    switch (action) {
      case 'pause':
        if (!settings.allowPause) {
          return NextResponse.json(
            { message: 'Pausing subscriptions is not allowed' },
            { status: 400 }
          )
        }

        const pauseFee = settings.pauseFee || 0
        if (pauseFee > 0) {
          // You could integrate with payment system here
          // For now, just pause the subscription
        }

        result = await db.subscription.update({
          where: { id: subscriptionId },
          data: {
            paused: true,
            pauseReason: body.reason || null,
            nextDelivery: null // Cancel upcoming deliveries while paused
          }
        })

        // Cancel upcoming deliveries
        await db.deliverySchedule.deleteMany({
          where: {
            subscriptionId,
            deliveryDate: {
              gte: new Date()
            }
          }
        })

        result.message = 'Subscription paused successfully'
        break

      case 'resume':
        result = await db.subscription.update({
          where: { id: subscriptionId },
          data: {
            paused: false,
            pauseReason: null,
            nextDelivery: calculateNextDelivery(
              subscription.frequency,
              subscription.deliveryTime,
              subscription.deliveryDays,
              new Date()
            )
          }
        })

        // Create next delivery
        await createDeliverySchedule(subscriptionId, subscription)

        result.message = 'Subscription resumed successfully'
        break

      case 'cancel':
        if (!settings.allowCancel) {
          return NextResponse.json(
            { message: 'Cancelling subscriptions is not allowed' },
            { status: 400 }
          )
        }

        const cancellationFee = settings.cancellationFee || 0
        if (cancellationFee > 0) {
          // You could integrate with payment system here
          // For now, just cancel the subscription
        }

        // Delete all future deliveries
        await db.deliverySchedule.deleteMany({
          where: { subscriptionId }
        })

        // Cancel the subscription
        await db.subscription.update({
          where: { id: subscriptionId },
          data: {
            isActive: false,
            endDate: new Date(),
            nextDelivery: null
          }
        })

        result.message = 'Subscription cancelled successfully'
        break

      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Subscription action error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to create delivery schedule (reused from deliveries)
async function createDeliverySchedule(subscriptionId: string, subscription: any) {
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
    return await db.deliverySchedule.create({
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

// Helper function to calculate next delivery (reused)
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