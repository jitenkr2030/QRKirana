import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const settingsSchema = z.object({
  invoicePrefix: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  autoGenerate: z.boolean().optional(),
  paymentReminder: z.boolean().optional(),
  lateFeeRate: z.number().min(0).max(1).optional(),
  lateFeeDays: z.number().min(1).max(90).optional(),
  dueDays: z.number().min(0).max(90).optional(),
  autoSendInvoice: z.boolean().optional(),
  acceptOnlinePayment: z.boolean().optional(),
  acceptCreditPayment: z.boolean().optional(),
  acceptCashPayment: z.boolean().optional(),
  upiId: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().optional(),
  termsAndConditions: z.string().optional(),
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

    let billingSettings = await db.billingSettings.findFirst({
      where: { shopId }
    })

    // If no settings exist, create default ones
    if (!billingSettings) {
      const shop = await db.shop.findUnique({
        where: { id: shopId }
      })

      billingSettings = await db.billingSettings.create({
        data: {
          shopId,
          invoicePrefix: 'INV',
          taxRate: 0,
          autoGenerate: true,
          paymentReminder: true,
          lateFeeRate: 0.02,
          lateFeeDays: 7,
          dueDays: 15,
          autoSendInvoice: false,
          acceptOnlinePayment: false,
          acceptCreditPayment: true,
          acceptCashPayment: true,
          upiId: '',
          bankName: '',
          bankAccount: '',
          bankIfsc: '',
          gstNumber: '',
          panNumber: '',
          businessName: shop?.name || '',
          businessAddress: shop?.address || '',
          businessPhone: shop?.mobile || '',
          businessEmail: shop?.email || '',
          termsAndConditions: '',
          isActive: true
        }
      })
    }

    return NextResponse.json({
      settings: {
        id: billingSettings.id,
        invoicePrefix: billingSettings.invoicePrefix,
        taxRate: billingSettings.taxRate,
        autoGenerate: billingSettings.autoGenerate,
        paymentReminder: billingSettings.paymentReminder,
        lateFeeRate: billingSettings.lateFeeRate,
        lateFeeDays: billingSettings.lateFeeDays,
        dueDays: billingSettings.dueDays,
        autoSendInvoice: billingSettings.autoSendInvoice,
        acceptOnlinePayment: billingSettings.acceptOnlinePayment,
        acceptCreditPayment: billingSettings.acceptCreditPayment,
        acceptCashPayment: billingSettings.acceptCashPayment,
        upiId: billingSettings.upiId,
        bankName: billingSettings.bankName,
        bankAccount: billingSettings.bankAccount,
        bankIfsc: billingSettings.bankIfsc,
        gstNumber: billingSettings.gstNumber,
        panNumber: billingSettings.panNumber,
        businessName: billingSettings.businessName,
        businessAddress: billingSettings.businessAddress,
        businessPhone: billingSettings.businessPhone,
        businessEmail: billingSettings.businessEmail,
        termsAndConditions: billingSettings.termsAndConditions,
        isActive: billingSettings.isActive,
        createdAt: billingSettings.createdAt.toISOString(),
        updatedAt: billingSettings.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Billing settings fetch error:', error)
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
    let billingSettings = await db.billingSettings.findFirst({
      where: { shopId }
    })

    if (!billingSettings) {
      // Create new settings if they don't exist
      billingSettings = await db.billingSettings.create({
        data: {
          shopId,
          invoicePrefix: validatedData.invoicePrefix || 'INV',
          taxRate: validatedData.taxRate || 0,
          autoGenerate: validatedData.autoGenerate ?? true,
          paymentReminder: validatedData.paymentReminder ?? true,
          lateFeeRate: validatedData.lateFeeRate || 0.02,
          lateFeeDays: validatedData.lateFeeDays || 7,
          dueDays: validatedData.dueDays || 15,
          autoSendInvoice: validatedData.autoSendInvoice ?? false,
          acceptOnlinePayment: validatedData.acceptOnlinePayment ?? false,
          acceptCreditPayment: validatedData.acceptCreditPayment ?? true,
          acceptCashPayment: validatedData.acceptCashPayment ?? true,
          upiId: validatedData.upiId || '',
          bankName: validatedData.bankName || '',
          bankAccount: validatedData.bankAccount || '',
          bankIfsc: validatedData.bankIfsc || '',
          gstNumber: validatedData.gstNumber || '',
          panNumber: validatedData.panNumber || '',
          businessName: validatedData.businessName || '',
          businessAddress: validatedData.businessAddress || '',
          businessPhone: validatedData.businessPhone || '',
          businessEmail: validatedData.businessEmail || '',
          termsAndConditions: validatedData.termsAndConditions || '',
          isActive: validatedData.isActive ?? true
        }
      })
    } else {
      // Update existing settings
      billingSettings = await db.billingSettings.update({
        where: { id: billingSettings.id },
        data: {
          ...(validatedData.invoicePrefix !== undefined && { invoicePrefix: validatedData.invoicePrefix }),
          ...(validatedData.taxRate !== undefined && { taxRate: validatedData.taxRate }),
          ...(validatedData.autoGenerate !== undefined && { autoGenerate: validatedData.autoGenerate }),
          ...(validatedData.paymentReminder !== undefined && { paymentReminder: validatedData.paymentReminder }),
          ...(validatedData.lateFeeRate !== undefined && { lateFeeRate: validatedData.lateFeeRate }),
          ...(validatedData.lateFeeDays !== undefined && { lateFeeDays: validatedData.lateFeeDays }),
          ...(validatedData.dueDays !== undefined && { dueDays: validatedData.dueDays }),
          ...(validatedData.autoSendInvoice !== undefined && { autoSendInvoice: validatedData.autoSendInvoice }),
          ...(validatedData.acceptOnlinePayment !== undefined && { acceptOnlinePayment: validatedData.acceptOnlinePayment }),
          ...(validatedData.acceptCreditPayment !== undefined && { acceptCreditPayment: validatedData.acceptCreditPayment }),
          ...(validatedData.acceptCashPayment !== undefined && { acceptCashPayment: validatedData.acceptCashPayment }),
          ...(validatedData.upiId !== undefined && { upiId: validatedData.upiId }),
          ...(validatedData.bankName !== undefined && { bankName: validatedData.bankName }),
          ...(validatedData.bankAccount !== undefined && { bankAccount: validatedData.bankAccount }),
          ...(validatedData.bankIfsc !== undefined && { bankIfsc: validatedData.bankIfsc }),
          ...(validatedData.gstNumber !== undefined && { gstNumber: validatedData.gstNumber }),
          ...(validatedData.panNumber !== undefined && { panNumber: validatedData.panNumber }),
          ...(validatedData.businessName !== undefined && { businessName: validatedData.businessName }),
          ...(validatedData.businessAddress !== undefined && { businessAddress: validatedData.businessAddress }),
          ...(validatedData.businessPhone !== undefined && { businessPhone: validatedData.businessPhone }),
          ...(validatedData.businessEmail !== undefined && { businessEmail: validatedData.businessEmail }),
          ...(validatedData.termsAndConditions !== undefined && { termsAndConditions: validatedData.termsAndConditions }),
          ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive })
        }
      })
    }

    return NextResponse.json({
      message: 'Billing settings updated successfully',
      settings: {
        id: billingSettings.id,
        invoicePrefix: billingSettings.invoicePrefix,
        taxRate: billingSettings.taxRate,
        autoGenerate: billingSettings.autoGenerate,
        paymentReminder: billingSettings.paymentReminder,
        lateFeeRate: billingSettings.lateFeeRate,
        lateFeeDays: billingSettings.lateFeeDays,
        dueDays: billingSettings.dueDays,
        autoSendInvoice: billingSettings.autoSendInvoice,
        acceptOnlinePayment: billingSettings.acceptOnlinePayment,
        acceptCreditPayment: billingSettings.acceptCreditPayment,
        acceptCashPayment: billingSettings.acceptCashPayment,
        upiId: billingSettings.upiId,
        bankName: billingSettings.bankName,
        bankAccount: billingSettings.bankAccount,
        bankIfsc: billingSettings.bankIfsc,
        gstNumber: billingSettings.gstNumber,
        panNumber: billingSettings.panNumber,
        businessName: billingSettings.businessName,
        businessAddress: billingSettings.businessAddress,
        businessPhone: billingSettings.businessPhone,
        businessEmail: billingSettings.businessEmail,
        termsAndConditions: billingSettings.termsAndConditions,
        isActive: billingSettings.isActive,
        updatedAt: billingSettings.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Billing settings update error:', error)
    
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