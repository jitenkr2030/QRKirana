import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const statusSchema = z.object({
  isActive: z.boolean()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { shopId: string } }
) {
  try {
    const body = await request.json()
    const validatedData = statusSchema.parse(body)
    const shopId = params.shopId

    // Update shop status
    const updatedShop = await db.shop.update({
      where: { id: shopId },
      data: { isActive: validatedData.isActive }
    })

    return NextResponse.json({
      message: `Shop ${validatedData.isActive ? 'activated' : 'deactivated'} successfully`,
      shop: {
        id: updatedShop.id,
        name: updatedShop.name,
        isActive: updatedShop.isActive
      }
    })

  } catch (error) {
    console.error('Admin shop status update error:', error)
    
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