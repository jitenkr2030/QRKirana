import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { uniqueUrl: string } }
) {
  try {
    const uniqueUrl = params.uniqueUrl

    // Find shop by unique URL
    const shop = await db.shop.findFirst({
      where: {
        uniqueUrl: uniqueUrl,
        isActive: true
      }
    })

    if (!shop) {
      return NextResponse.json(
        { message: 'Shop not found' },
        { status: 404 }
      )
    }

    // Get shop's products
    const products = await db.product.findMany({
      where: {
        shopId: shop.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      shop: {
        id: shop.id,
        name: shop.name,
        ownerName: shop.ownerName,
        mobile: shop.mobile,
        address: shop.address,
        category: shop.category
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
      }))
    })

  } catch (error) {
    console.error('Shop fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}