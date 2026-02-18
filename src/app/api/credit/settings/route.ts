import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const settingsSchema = z.object({
  defaultCreditLimit: z.number().min(0).optional(),
  minCreditScore: z.number().min(0).max(100).optional(),
  interestRate: z.number().min(0).max(100).optional(),
  lateFeeRate: z.number().min(0).max(1).optional(),
  gracePeriod: z.number().min(0).max(30).optional(),
  autoApprove: z.boolean().optional(),
  requireVerification: z.boolean().optional(),
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

    let creditSettings = await db.creditSettings.findFirst({
      where: { shopId }
    })

    // If no settings exist, create default ones
    if (!creditSettings) {
      creditSettings = await db.creditSettings.create({
        data: {
          shopId,
          defaultCreditLimit: 5000,
          minCreditScore: 60,
          interestRate: 0,
          lateFeeRate: 0.02,
          gracePeriod: 7,
          autoApprove: true,
          requireVerification: false,
          isActive: true
        }
      })
    }

    return NextResponse.json({
      settings: {
        id: creditSettings.id,
        defaultCreditLimit: creditSettings.defaultCreditLimit,
        minCreditScore: creditSettings.minCreditScore,
        interestRate: creditSettings.interestRate,
        lateFeeRate: creditSettings.lateFeeRate,
        gracePeriod: creditSettings.gracePeriod,
        autoApprove: creditSettings.autoApprove,
        requireVerification: creditSettings.requireVerification,
        isActive: creditSettings.isActive,
        createdAt: creditSettings.createdAt.toISOString(),
        updatedAt: creditSettings.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Credit settings fetch error:', error)
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
    let creditSettings = await db.creditSettings.findFirst({
      where: { shopId }
    })

    if (!creditSettings) {
      // Create new settings if they don't exist
      creditSettings = await db.creditSettings.create({
        data: {
          shopId,
          defaultCreditLimit: validatedData.defaultCreditLimit || 5000,
          minCreditScore: validatedData.minCreditScore || 60,
          interestRate: validatedData.interestRate || 0,
          lateFeeRate: validatedData.lateFeeRate || 0.02,
          gracePeriod: validatedData.gracePeriod || 7,
          autoApprove: validatedData.autoApprove ?? true,
          requireVerification: validatedData.requireVerification ?? false,
          isActive: validatedData.isActive ?? true
        }
      })
    } else {
      // Update existing settings
      creditSettings = await db.creditSettings.update({
        where: { id: creditSettings.id },
        data: {
          ...(validatedData.defaultCreditLimit !== undefined && { defaultCreditLimit: validatedData.defaultCreditLimit }),
          ...(validatedData.minCreditScore !== undefined && { minCreditScore: validatedData.minCreditScore }),
          ...(validatedData.interestRate !== undefined && { interestRate: validatedData.interestRate }),
          ...(validatedData.lateFeeRate !== undefined && { lateFeeRate: validatedData.lateFeeRate }),
          ...(validatedData.gracePeriod !== undefined && { gracePeriod: validatedData.gracePeriod }),
          ...(validatedData.autoApprove !== undefined && { autoApprove: validatedData.autoApprove }),
          ...(validatedData.requireVerification !== undefined && { requireVerification: validatedData.requireVerification }),
          ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive })
        }
      })
    }

    return NextResponse.json({
      message: 'Credit settings updated successfully',
      settings: {
        id: creditSettings.id,
        defaultCreditLimit: creditSettings.defaultCreditLimit,
        minCreditScore: creditSettings.minCreditScore,
        interestRate: creditSettings.interestRate,
        lateFeeRate: creditSettings.lateFeeRate,
        gracePeriod: creditSettings.gracePeriod,
        autoApprove: creditSettings.autoApprove,
        requireVerification: creditSettings.requireVerification,
        isActive: creditSettings.isActive,
        updatedAt: creditSettings.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Credit settings update error:', error)
    
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