import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const productSchema = z.object({
  shopId: z.string(),
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  price: z.number().min(0, 'Price must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().optional(),
  description: z.string().optional(),
  inStock: z.boolean().default(true),
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
    // Verify authentication
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = productSchema.parse(body)

    // Verify the shopId matches the authenticated shop
    if (validatedData.shopId !== auth.shopId) {
      return NextResponse.json(
        { message: 'Unauthorized: Shop ID mismatch' },
        { status: 401 }
      )
    }

    // Check if shop exists and is active
    const shop = await db.shop.findFirst({
      where: {
        id: validatedData.shopId,
        isActive: true
      }
    })

    if (!shop) {
      return NextResponse.json(
        { message: 'Shop not found or inactive' },
        { status: 404 }
      )
    }

    // Check product limit for free plan
    if (shop.subscriptionType === 'free') {
      const existingProducts = await db.product.count({
        where: { shopId: validatedData.shopId }
      })

      if (existingProducts >= 20) {
        return NextResponse.json(
          { 
            message: 'Product limit reached for free plan. Upgrade to premium for unlimited products.',
            limit: 20,
            current: existingProducts
          },
          { status: 403 }
        )
      }
    }

    // Check if product with same name already exists for this shop
    const existingProduct = await db.product.findFirst({
      where: {
        shopId: validatedData.shopId,
        name: validatedData.name
      }
    })

    if (existingProduct) {
      return NextResponse.json(
        { message: 'A product with this name already exists in your shop' },
        { status: 400 }
      )
    }

    // Create the product
    const product = await db.product.create({
      data: {
        shopId: validatedData.shopId,
        name: validatedData.name,
        price: validatedData.price,
        unit: validatedData.unit,
        category: validatedData.category || null,
        description: validatedData.description || null,
        inStock: validatedData.inStock,
      }
    })

    return NextResponse.json({
      message: 'Product created successfully',
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        category: product.category,
        description: product.description,
        inStock: product.inStock,
        createdAt: product.createdAt
      }
    })

  } catch (error) {
    console.error('Product creation error:', error)
    
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