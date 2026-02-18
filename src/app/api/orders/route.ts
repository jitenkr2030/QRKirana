import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { whatsappService } from '@/lib/whatsapp/service'

const orderSchema = z.object({
  shopId: z.string(),
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  customerMobile: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerAddress: z.string().optional(),
  deliveryType: z.enum(['delivery', 'pickup']),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    price: z.number().min(0, 'Price must be positive'),
    total: z.number().min(0, 'Total must be positive')
  })).min(1, 'At least one item is required'),
  totalAmount: z.number().min(0, 'Total amount must be positive'),
  paymentMethod: z.enum(['cod', 'credit', 'upi']).optional(),
  creditAccountId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = orderSchema.parse(body)

    // Verify shop exists
    const shop = await db.shop.findFirst({
      where: {
        id: validatedData.shopId,
        isActive: true
      }
    })

    if (!shop) {
      return NextResponse.json(
        { message: 'Shop not found' },
        { status: 404 }
      )
    }

    // Verify all products exist and are in stock
    const productIds = validatedData.items.map(item => item.productId)
    const products = await db.product.findMany({
      where: {
        id: { in: productIds },
        shopId: validatedData.shopId
      }
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { message: 'Some products not found' },
        { status: 400 }
      )
    }

    // Check if all products are in stock
    const outOfStockProducts = products.filter(product => !product.inStock)
    if (outOfStockProducts.length > 0) {
      return NextResponse.json(
        { 
          message: 'Some products are out of stock',
          products: outOfStockProducts.map(p => p.name)
        },
        { status: 400 }
      )
    }

    // Create or find customer
    let customer = await db.customer.findFirst({
      where: {
        shopId: validatedData.shopId,
        mobile: validatedData.customerMobile
      }
    })

    if (!customer) {
      customer = await db.customer.create({
        data: {
          shopId: validatedData.shopId,
          name: validatedData.customerName,
          mobile: validatedData.customerMobile,
          email: validatedData.customerEmail || null,
          address: validatedData.customerAddress || null,
          totalOrders: 0,
          totalSpent: 0
        }
      })
    } else {
      // Update customer info if needed
      customer = await db.customer.update({
        where: { id: customer.id },
        data: {
          name: validatedData.customerName,
          email: validatedData.customerEmail || customer.email,
          address: validatedData.customerAddress || customer.address
        }
      })
    }

    // Create order
    const order = await db.order.create({
      data: {
        shopId: validatedData.shopId,
        customerId: customer.id,
        customerName: validatedData.customerName,
        customerMobile: validatedData.customerMobile,
        customerEmail: validatedData.customerEmail || null,
        customerAddress: validatedData.customerAddress || null,
        totalAmount: validatedData.totalAmount,
        status: 'PENDING',
        deliveryType: validatedData.deliveryType,
        paymentMethod: validatedData.paymentMethod || 'cod',
        paymentStatus: validatedData.paymentMethod === 'credit' ? 'pending' : 'pending',
        notes: validatedData.notes || null
      }
    })

    // Handle credit payment
    if (validatedData.paymentMethod === 'credit' && validatedData.creditAccountId) {
      try {
        // Get credit account
        const creditAccount = await db.creditAccount.findFirst({
          where: {
            id: validatedData.creditAccountId,
            shopId: validatedData.shopId
          }
        })

        if (!creditAccount) {
          return NextResponse.json(
            { message: 'Credit account not found' },
            { status: 400 }
          )
        }

        if (!creditAccount.isActive) {
          return NextResponse.json(
            { message: 'Credit account is not active' },
            { status: 400 }
          )
        }

        // Check if order amount exceeds available credit
        if (validatedData.totalAmount > creditAccount.availableCredit) {
          return NextResponse.json(
            { 
              message: 'Order amount exceeds available credit',
              availableCredit: creditAccount.availableCredit,
              orderAmount: validatedData.totalAmount
            },
            { status: 400 }
          )
        }

        // Create credit transaction
        await db.creditTransaction.create({
          data: {
            accountId: creditAccount.id,
            type: 'DEBIT',
            amount: validatedData.totalAmount,
            balance: creditAccount.currentBalance + validatedData.totalAmount,
            description: `Order payment - Order #${order.id.slice(-8).toUpperCase()}`,
            reference: order.id,
            metadata: {
              orderId: order.id,
              customerName: validatedData.customerName,
              customerMobile: validatedData.customerMobile
            }
          }
        })

        // Update credit account
        await db.creditAccount.update({
          where: { id: creditAccount.id },
          data: {
            currentBalance: creditAccount.currentBalance + validatedData.totalAmount,
            availableCredit: creditAccount.availableCredit - validatedData.totalAmount,
            updatedAt: new Date()
          }
        })

        // Update order payment status
        await db.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'completed',
            creditAccountId: validatedData.creditAccountId
          }
        })

      } catch (error) {
        console.error('Credit payment processing error:', error)
        // Don't fail the order if credit processing fails
        // The order can be processed as COD instead
      }
    }

    // Create order items
    const orderItems = await Promise.all(
      validatedData.items.map(item =>
        db.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.total
          }
        })
      )
    )

    // Update customer stats
    await db.customer.update({
      where: { id: customer.id },
      data: {
        totalOrders: customer.totalOrders + 1,
        totalSpent: customer.totalSpent + validatedData.totalAmount
      }
    })

    // Add loyalty points (1 point per ₹10 spent)
    const loyaltyPoints = Math.floor(validatedData.totalAmount / 10)
    if (loyaltyPoints > 0) {
      await db.loyaltyPoint.create({
        data: {
          shopId: validatedData.shopId,
          customerId: customer.id,
          points: loyaltyPoints,
          orderId: order.id,
          description: `Earned ${loyaltyPoints} points on order ${order.id}`
        }
      })
    }

    // Send WhatsApp notification to shop owner
    try {
      const orderItems = await db.orderItem.findMany({
        where: { orderId: order.id },
        include: { product: true }
      })

      await whatsappService.sendNotification({
        customerName: validatedData.customerName,
        customerMobile: validatedData.customerMobile,
        orderNumber: `ORD${order.id.slice(-8).toUpperCase()}`,
        totalAmount: validatedData.totalAmount,
        items: orderItems.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price
        })),
        deliveryType: validatedData.deliveryType,
        shopName: shop.name,
        shopMobile: shop.mobile
      }, 'order')
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error)
      // Don't fail the order if WhatsApp fails
    }

    return NextResponse.json({
      message: 'Order placed successfully',
      order: {
        id: order.id,
        orderNumber: `ORD${order.id.slice(-8).toUpperCase()}`,
        status: order.status,
        totalAmount: order.totalAmount,
        items: orderItems.length
      }
    })

  } catch (error) {
    console.error('Order creation error:', error)
    
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