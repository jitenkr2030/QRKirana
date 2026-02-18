import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import QRCode from 'qrcode'

const registerSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  mobile: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  category: z.enum(['kirana', 'dairy', 'medical', 'vegetables', 'bakery', 'stationery', 'electronics', 'other']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

function generateUniqueUrl(shopName: string): string {
  const baseName = shopName.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 20)
  
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${baseName}-${randomSuffix}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Check if shop with this mobile already exists
    const existingShop = await db.shop.findFirst({
      where: {
        mobile: validatedData.mobile
      }
    })

    if (existingShop) {
      return NextResponse.json(
        { message: 'A shop with this mobile number already exists' },
        { status: 400 }
      )
    }

    // Check if email already exists (if provided)
    if (validatedData.email) {
      const existingEmail = await db.shop.findFirst({
        where: {
          email: validatedData.email
        }
      })

      if (existingEmail) {
        return NextResponse.json(
          { message: 'A shop with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Generate unique URL
    let uniqueUrl = generateUniqueUrl(validatedData.shopName)
    
    // Ensure URL is unique
    let urlExists = true
    let attempts = 0
    while (urlExists && attempts < 10) {
      const existingUrl = await db.shop.findFirst({
        where: { uniqueUrl }
      })
      
      if (!existingUrl) {
        urlExists = false
      } else {
        uniqueUrl = generateUniqueUrl(validatedData.shopName + Math.random().toString(36).substring(2, 4))
        attempts++
      }
    }

    if (urlExists) {
      return NextResponse.json(
        { message: 'Unable to generate unique URL. Please try again.' },
        { status: 500 }
      )
    }

    // Generate QR code
    const shopUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://qrkirana.com'}/shop/${uniqueUrl}`
    const qrCodeDataUrl = await QRCode.toDataURL(shopUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Create shop
    const shop = await db.shop.create({
      data: {
        name: validatedData.shopName,
        ownerName: validatedData.ownerName,
        mobile: validatedData.mobile,
        email: validatedData.email || null,
        address: validatedData.address,
        category: validatedData.category,
        uniqueUrl: uniqueUrl,
        password: validatedData.password,
        qrCodeUrl: qrCodeDataUrl,
        subscriptionType: 'free',
        subscriptionEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      }
    })

    return NextResponse.json({
      message: 'Shop registered successfully',
      shop: {
        id: shop.id,
        name: shop.name,
        uniqueUrl: shop.uniqueUrl,
        shopUrl: shopUrl
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    
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