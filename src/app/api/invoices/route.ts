import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const createInvoiceSchema = z.object({
  customerId: z.string().optional(),
  orderId: z.string().optional(),
  shopId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    quantity: z.number().min(0),
    price: z.number().min(0),
    total: z.number().min(0),
    unit: z.string().optional(),
    hsnCode: z.string().optional(),
    gstRate: z.number().min(0).max(100).optional()
  })),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0),
  totalAmount: z.number().min(0),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  dueDate: z.string().datetime(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
})

const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
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
    const validatedData = createInvoiceSchema.parse(body)

    // Verify the shopId matches the authenticated shop
    if (validatedData.shopId !== auth.shopId) {
      return NextResponse.json(
        { message: 'Unauthorized: Shop ID mismatch' },
        { status: 401 }
      )
    }

    // Get billing settings
    const billingSettings = await db.billingSettings.findFirst({
      where: { shopId: validatedData.shopId }
    })

    if (!billingSettings) {
      return NextResponse.json(
        { message: 'Billing settings not configured' },
        { status: 400 }
      )
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(billingSettings.invoicePrefix, validatedData.shopId)

    // Create invoice
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        customerId: validatedData.customerId || null,
        orderId: validatedData.orderId || null,
        shopId: validatedData.shopId,
        items: validatedData.items,
        subtotal: validatedData.subtotal,
        taxAmount: validatedData.taxAmount,
        totalAmount: validatedData.totalAmount,
        status: validatedData.status || 'DRAFT',
        dueDate: new Date(validatedData.dueDate),
        paidAmount: 0,
        balanceAmount: validatedData.totalAmount,
        reference: validatedData.reference || null,
        notes: validatedData.notes || null
      }
    })

    return NextResponse.json({
      message: 'Invoice created successfully',
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        orderId: invoice.orderId,
        items: invoice.items,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        dueDate: invoice.dueDate.toISOString(),
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        reference: invoice.reference,
        notes: invoice.notes,
        createdAt: invoice.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Invoice creation error:', error)
    
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
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const shopId = auth.shopId

    let whereClause: any = { shopId }
    if (customerId) whereClause.customerId = customerId
    if (status) whereClause.status = status
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }

    const invoices = await db.invoice.findMany({
      where: whereClause,
      include: {
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      invoices: invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        orderId: invoice.orderId,
        items: invoice.items,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        dueDate: invoice.dueDate.toISOString(),
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        reference: invoice.reference,
        notes: invoice.notes,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
        payments: invoice.payments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
          transactionId: payment.transactionId,
          reference: payment.reference,
          notes: payment.notes,
          createdAt: payment.createdAt.toISOString()
        }))
      }))
    })

  } catch (error) {
    console.error('Invoices fetch error:', error)
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
    const invoiceId = searchParams.get('id')
    
    if (!invoiceId) {
      return NextResponse.json(
        { message: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateInvoiceSchema.parse(body)

    // Get existing invoice
    const existingInvoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        shopId: auth.shopId
      }
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Update invoice
    const updateData: any = {}
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.dueDate !== undefined) updateData.dueDate = new Date(validatedData.dueDate)
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes

    const updatedInvoice = await db.invoice.update({
      where: { id: invoiceId },
      data: updateData
    })

    return NextResponse.json({
      message: 'Invoice updated successfully',
      invoice: {
        id: updatedInvoice.id,
        status: updatedInvoice.status,
        dueDate: updatedInvoice.dueDate?.toISOString(),
        notes: updatedInvoice.notes,
        updatedAt: updatedInvoice.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Invoice update error:', error)
    
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
    const invoiceId = searchParams.get('id')
    
    if (!invoiceId) {
      return NextResponse.json(
        { message: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    // Check if invoice exists and belongs to the shop
    const invoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        shopId: auth.shopId
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check if invoice has payments
    const payments = await db.payment.findMany({
      where: { invoiceId }
    })

    if (payments.length > 0) {
      return NextResponse.json(
        { message: 'Cannot delete invoice with existing payments' },
        { status: 400 }
      )
    }

    // Delete invoice
    await db.invoice.delete({
      where: { id: invoiceId }
    })

    return NextResponse.json({
      message: 'Invoice deleted successfully'
    })

  } catch (error) {
    console.error('Invoice deletion error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate invoice number
async function generateInvoiceNumber(prefix: string, shopId: string): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  
  // Count existing invoices for this month
  const count = await db.invoice.count({
    where: {
      shopId,
      createdAt: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1)
      }
    }
  })

  const sequence = String(count + 1).padStart(4, '0')
  return `${prefix}-${year}${month}-${sequence}`
}