import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
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

    const productId = params.productId

    // Get the product and verify it belongs to the shop
    const product = await db.product.findFirst({
      where: {
        id: productId,
        shopId: auth.shopId
      }
    })

    if (!product) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if product is in any active orders
    const activeOrderItems = await db.orderItem.findFirst({
      where: {
        productId: productId,
        order: {
          status: {
            in: ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY']
          }
        }
      }
    })

    if (activeOrderItems) {
      return NextResponse.json(
        { message: 'Cannot delete product that is in active orders' },
        { status: 400 }
      )
    }

    // Delete the product
    await db.product.delete({
      where: { id: productId }
    })

    return NextResponse.json({
      message: 'Product deleted successfully'
    })

  } catch (error) {
    console.error('Product deletion error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}