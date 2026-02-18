'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText,
  DollarSign,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  Settings,
  Plus,
  Eye,
  Download,
  Send,
  RefreshCw,
  ArrowLeft,
  Banknote,
  Receipt,
  IndianRupee,
  Mail,
  Phone,
  MapPin,
  Smartphone
} from 'lucide-react'
import { toast } from 'sonner'

interface Invoice {
  id: string
  invoiceNumber: string
  customerId?: string
  orderId?: string
  items: any[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  status: string
  dueDate: string
  paidAmount: number
  balanceAmount: number
  reference?: string
  notes?: string
  createdAt: string
  payments: any[]
}

interface Payment {
  id: string
  invoiceId?: string
  orderId?: string
  customerId?: string
  amount: number
  method: string
  status: string
  transactionId?: string
  reference?: string
  notes?: string
  createdAt: string
  invoice?: {
    id: string
    invoiceNumber: string
    totalAmount: number
    status: string
  }
}

interface BillingSettings {
  invoicePrefix: string
  taxRate: number
  autoGenerate: boolean
  paymentReminder: boolean
  lateFeeRate: number
  lateFeeDays: number
  dueDays: number
  autoSendInvoice: boolean
  acceptOnlinePayment: boolean
  acceptCreditPayment: boolean
  acceptCashPayment: boolean
  upiId: string
  bankName: string
  bankAccount: string
  bankIfsc: string
  gstNumber: string
  panNumber: string
  businessName: string
  businessAddress: string
  businessPhone: string
  businessEmail: string
  termsAndConditions: string
  isActive: boolean
}

export default function BillingPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [settings, setSettings] = useState<BillingSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showSettingsForm, setShowSettingsForm] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [activeTab, setActiveTab] = useState('invoices')

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken')
    const shopId = localStorage.getItem('shopId')
    
    if (!token || !shopId) {
      router.push('/auth/login')
      return
    }

    fetchBillingData(shopId)
  }, [router])

  const fetchBillingData = async (shopId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      
      // Fetch billing settings
      const settingsResponse = await fetch('/api/billing-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSettings(settingsData.settings)
      }

      // Fetch invoices
      const invoicesResponse = await fetch('/api/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        setInvoices(invoicesData.invoices)
      }

      // Fetch payments
      const paymentsResponse = await fetch('/api/payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json()
        setPayments(paymentsData.payments)
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error)
      toast.error('Failed to load billing data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateInvoice = async (formData: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Invoice created successfully!')
        setShowInvoiceForm(false)
        fetchBillingData(localStorage.getItem('shopId')!)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create invoice')
      }
    } catch (error) {
      toast.error('Failed to create invoice')
    }
  }

  const handleUpdateInvoice = async (invoiceId: string, formData: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/invoices?id=${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Invoice updated successfully!')
        fetchBillingData(localStorage.getItem('shopId')!)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update invoice')
      }
    } catch (error) {
      toast.error('Failed to update invoice')
    }
  }

  const handleProcessPayment = async (formData: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Payment processed successfully!')
        fetchBillingData(localStorage.getItem('shopId')!)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to process payment')
      }
    } catch (error) {
      toast.error('Failed to process payment')
    }
  }

  const handleUpdateSettings = async (formData: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/billing-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Settings updated successfully!')
        setSettings(response.data.settings)
        setShowSettingsForm(false)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update settings')
      }
    } catch (error) {
      toast.error('Failed to update settings')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-green-600 bg-green-100'
      case 'SENT': return 'text-blue-600 bg-blue-100'
      case 'OVERDUE': return 'text-red-600 bg-red-100'
      case 'DRAFT': return 'text-gray-600 bg-gray-100'
      case 'CANCELLED': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100'
      case 'PENDING': return 'text-yellow-600 bg-yellow-100'
      case 'FAILED': return 'text-red-600 bg-red-100'
      case 'REFUNDED': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'UPI': return <Smartphone className="h-4 w-4" />
      case 'CASH': return <Banknote className="h-4 w-4" />
      case 'CARD': return <CreditCard className="h-4 w-4" />
      case 'CREDIT': return <Receipt className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0)
  const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceAmount, 0)
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID').length
  const overdueInvoices = invoices.filter(inv => inv.status === 'OVERDUE').length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-orange-600" />
                  QRBilling System
                </h1>
                <p className="text-sm text-gray-600">Professional invoicing and payment processing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowInvoiceForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
              <Button variant="outline" onClick={() => setShowSettingsForm(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                From all invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">₹{totalOutstanding.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Unpaid invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{paidInvoices}</div>
              <p className="text-xs text-muted-foreground">
                Fully paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{overdueInvoices}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Invoices</h2>
                <p className="text-gray-600">Manage customer invoices and billing</p>
              </div>
              <Button onClick={() => setShowInvoiceForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>

            {invoices.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoices</h3>
                  <p className="text-gray-600 mb-4">Create your first invoice to get started</p>
                  <Button onClick={() => setShowInvoiceForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <Card key={invoice.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{invoice.invoiceNumber}</h3>
                            <Badge className={getStatusColor(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Created: {new Date(invoice.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Due: {new Date(invoice.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/invoice/${invoice.id}`, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {invoice.status === 'DRAFT' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateInvoice(invoice.id, { status: 'SENT' })}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Subtotal</p>
                          <p className="font-semibold">₹{invoice.subtotal.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Tax</p>
                          <p className="font-semibold">₹{invoice.taxAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total</p>
                          <p className="font-semibold">₹{invoice.totalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Balance</p>
                          <p className={`font-semibold ${invoice.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{invoice.balanceAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Payments</h2>
              <p className="text-gray-600">Track and manage all payment transactions</p>
            </div>

            {payments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <DollarSign className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payments</h3>
                  <p className="text-gray-600">Payments will appear here once they are processed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getPaymentMethodIcon(payment.method)}
                            <span className="text-sm capitalize">{payment.method}</span>
                            <Badge className={getPaymentStatusColor(payment.status)}>
                              {payment.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                          {payment.invoice && (
                            <p className="text-sm text-gray-600">
                              Invoice: {payment.invoice.invoiceNumber}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">₹{payment.amount.toLocaleString()}</p>
                          {payment.transactionId && (
                            <p className="text-xs text-gray-500">ID: {payment.transactionId}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Billing Analytics</h2>
              <p className="text-gray-600">Insights and performance metrics</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Month</CardTitle>
                  <CardDescription>Monthly revenue breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(
                      invoices.reduce((acc, invoice) => {
                        const month = new Date(invoice.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' })
                        acc[month] = (acc[month] || 0) + invoice.paidAmount
                        return acc
                      }, {} as Record<string, number>)
                    )
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 6)
                      .map(([month, revenue]) => (
                        <div key={month} className="flex items-center justify-between">
                          <span className="font-medium">{month}</span>
                          <span className="font-semibold">₹{revenue.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Payment method distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(
                      payments.reduce((acc, payment) => {
                        acc[payment.method] = (acc[payment.method] || 0) + payment.amount
                        return acc
                      }, {} as Record<string, number>)
                    )
                      .sort(([,a], [,b]) => b - a)
                      .map(([method, amount]) => (
                        <div key={method} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(method)}
                            <span className="capitalize">{method}</span>
                          </div>
                          <span className="font-semibold">₹{amount.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Billing Settings</h2>
              <p className="text-gray-600">Configure billing policies and payment options</p>
            </div>

            {settings && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Invoice Prefix</Label>
                        <Input
                          value={settings.invoicePrefix}
                          onChange={(e) => handleUpdateSettings({ invoicePrefix: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tax Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={settings.taxRate}
                          onChange={(e) => handleUpdateSettings({ taxRate: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="autoGenerate"
                          checked={settings.autoGenerate}
                          onChange={(e) => handleUpdateSettings({ autoGenerate: e.target.checked })}
                        />
                        <Label htmlFor="autoGenerate">Auto-generate invoices</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="paymentReminder"
                          checked={settings.paymentReminder}
                          onChange={(e) => handleUpdateSettings({ paymentReminder: e.target.checked })}
                        />
                        <Label htmlFor="paymentReminder">Send payment reminders</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="acceptOnlinePayment"
                          checked={settings.acceptOnlinePayment}
                          onChange={(e) => handleUpdateSettings({ acceptOnlinePayment: e.target.checked })}
                        />
                        <Label htmlFor="acceptOnlinePayment">Accept Online Payments</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="acceptCreditPayment"
                          checked={settings.acceptCreditPayment}
                          onChange={(e) => handleUpdateSettings({ acceptCreditPayment: e.target.checked })}
                        />
                        <Label htmlFor="acceptCreditPayment">Accept Credit Payments</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="acceptCashPayment"
                          checked={settings.acceptCashPayment}
                          onChange={(e) => handleUpdateSettings({ acceptCashPayment: e.target.checked })}
                        />
                        <Label htmlFor="acceptCashPayment">Accept Cash Payments</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Business Name</Label>
                        <Input
                          value={settings.businessName}
                          onChange={(e) => handleUpdateSettings({ businessName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Business Phone</Label>
                        <Input
                          value={settings.businessPhone}
                          onChange={(e) => handleUpdateSettings({ businessPhone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Business Address</Label>
                      <Textarea
                        value={settings.businessAddress}
                        onChange={(e) => handleUpdateSettings({ businessAddress: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Invoice Modal */}
      {showInvoiceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Create Invoice</h3>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowInvoiceForm(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>

              <CreateInvoiceForm 
                onCreate={handleCreateInvoice}
                onCancel={() => setShowInvoiceForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Billing Settings</h3>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowSettingsForm(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Invoice Prefix</Label>
                  <Input
                    value={settings?.invoicePrefix || 'INV'}
                    onChange={(e) => handleUpdateSettings({ invoicePrefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings?.taxRate || 0}
                    onChange={(e) => handleUpdateSettings({ taxRate: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoGenerate"
                      checked={settings?.autoGenerate || false}
                      onChange={(e) => handleUpdateSettings({ autoGenerate: e.target.checked })}
                    />
                    <Label htmlFor="autoGenerate">Auto-generate invoices</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setShowSettingsForm(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Form component for creating invoices
function CreateInvoiceForm({ onCreate, onCancel }: any) {
  const [formData, setFormData] = useState({
    customerId: '',
    items: [],
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate({
      ...formData,
      shopId: localStorage.getItem('shopId'),
      items: formData.items,
      subtotal: parseFloat(formData.subtotal.toString()),
      taxAmount: parseFloat(formData.taxAmount.toString()),
      totalAmount: parseFloat(formData.totalAmount.toString()),
      dueDate: new Date(formData.dueDate)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer">Select Customer</Label>
        <Select value={formData.customerId} onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a customer" />
          </SelectTrigger>
          <SelectContent>
            {/* This would be populated with actual customers */}
            <SelectItem value="customer1">Customer 1</SelectItem>
            <SelectItem value="customer2">Customer 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          id="dueDate"
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="w-full p-2 border rounded-md"
        />
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="button" onClick={onCancel} variant="outline">Cancel</Button>
        <Button type="submit">Create Invoice</Button>
      </div>
    </form>
  )
}