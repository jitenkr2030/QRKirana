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

export async function GET(
  request: NextRequest,
  { params }: { params: { shopId: string } }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request)
    if (!auth || auth.shopId !== params.shopId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const shopId = params.shopId

    // Get shop details
    const shop = await db.shop.findFirst({
      where: { id: shopId }
    })

    if (!shop) {
      return NextResponse.json(
        { message: 'Shop not found' },
        { status: 404 }
      )
    }

    // Get products
    const products = await db.product.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' }
    })

    // Get orders with items
    const orders = await db.order.findMany({
      where: { shopId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Format orders for frontend
    const formattedOrders = orders.map(order => ({
      id: order.id,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      totalAmount: order.totalAmount,
      status: order.status,
      deliveryType: order.deliveryType,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map(item => ({
        id: item.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      }))
    }))

    return NextResponse.json({
      shop: {
        id: shop.id,
        name: shop.name,
        ownerName: shop.ownerName,
        mobile: shop.mobile,
        email: shop.email,
        address: shop.address,
        category: shop.category,
        uniqueUrl: shop.uniqueUrl,
        qrCodeUrl: shop.qrCodeUrl,
        subscriptionType: shop.subscriptionType
      },
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        category: product.category,
        description: product.description,
        inStock: product.inStock,
        image: product.image
      })),
      orders: formattedOrders
    })

  } catch (error) {
    console.error('Dashboard fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}