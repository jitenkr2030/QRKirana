'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  ArrowLeft, 
  Gift, 
  Users, 
  Tag, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp,
  Star,
  Award,
  Crown
} from 'lucide-react'
import { toast } from 'sonner'

interface Customer {
  id: string
  name: string
  mobile: string
  email?: string
  totalOrders: number
  totalSpent: number
  loyaltyPoints: number
  createdAt: string
}

interface Coupon {
  id: string
  code: string
  discount: number
  discountType: string
  minOrder?: number
  maxUses?: number
  usedCount: number
  isActive: boolean
  expiresAt?: string
  createdAt: string
}

export default function LoyaltyPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('customers')
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)

  const [couponForm, setCouponForm] = useState({
    code: '',
    discount: '',
    discountType: 'percentage',
    minOrder: '',
    maxUses: '',
    isActive: true,
    expiresAt: '',
  })

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken')
    const shopId = localStorage.getItem('shopId')
    
    if (!token || !shopId) {
      router.push('/auth/login')
      return
    }

    fetchLoyaltyData(shopId)
  }, [router])

  const fetchLoyaltyData = async (shopId: string) => {
    try {
      // Fetch customers with loyalty points
      const customersResponse = await fetch(`/api/loyalty/${shopId}/customers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      // Fetch coupons
      const couponsResponse = await fetch(`/api/loyalty/${shopId}/coupons`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        setCustomers(customersData.customers)
      }

      if (couponsResponse.ok) {
        const couponsData = await couponsResponse.json()
        setCoupons(couponsData.coupons)
      }
    } catch (error) {
      toast.error('Failed to load loyalty data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const shopId = localStorage.getItem('shopId')
      if (!shopId) return

      const couponData = {
        shopId,
        code: couponForm.code,
        discount: parseFloat(couponForm.discount),
        discountType: couponForm.discountType,
        minOrder: couponForm.minOrder ? parseFloat(couponForm.minOrder) : undefined,
        maxUses: couponForm.maxUses ? parseInt(couponForm.maxUses) : undefined,
        isActive: couponForm.isActive,
        expiresAt: couponForm.expiresAt || undefined,
      }

      const url = editingCoupon 
        ? `/api/loyalty/coupons/${editingCoupon.id}`
        : '/api/loyalty/coupons'
      
      const response = await fetch(url, {
        method: editingCoupon ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(couponData),
      })

      if (response.ok) {
        toast.success(`Coupon ${editingCoupon ? 'updated' : 'created'} successfully!`)
        setShowCouponForm(false)
        setEditingCoupon(null)
        setCouponForm({
          code: '',
          discount: '',
          discountType: 'percentage',
          minOrder: '',
          maxUses: '',
          isActive: true,
          expiresAt: '',
        })
        fetchLoyaltyData(shopId)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save coupon')
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const deleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) {
      return
    }

    try {
      const response = await fetch(`/api/loyalty/coupons/${couponId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        toast.success('Coupon deleted successfully')
        setCoupons(prevCoupons => prevCoupons.filter(c => c.id !== couponId))
      } else {
        toast.error('Failed to delete coupon')
      }
    } catch (error) {
      toast.error('Failed to delete coupon')
    }
  }

  const toggleCouponStatus = async (couponId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/loyalty/coupons/${couponId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ isActive }),
      })

      if (response.ok) {
        toast.success(`Coupon ${isActive ? 'activated' : 'deactivated'}`)
        setCoupons(prevCoupons => 
          prevCoupons.map(c => 
            c.id === couponId ? { ...c, isActive } : c
          )
        )
      } else {
        toast.error('Failed to update coupon status')
      }
    } catch (error) {
      toast.error('Failed to update coupon status')
    }
  }

  const getCustomerTier = (totalSpent: number) => {
    if (totalSpent >= 10000) return { tier: 'Gold', icon: Crown, color: 'text-yellow-600 bg-yellow-100' }
    if (totalSpent >= 5000) return { tier: 'Silver', icon: Star, color: 'text-gray-600 bg-gray-100' }
    return { tier: 'Bronze', icon: Award, color: 'text-orange-600 bg-orange-100' }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading loyalty data...</p>
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
                  <Gift className="h-5 w-5 text-orange-600" />
                  Loyalty Program
                </h1>
                <p className="text-sm text-gray-600">Manage customer rewards and discounts</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customers">Loyal Customers</TabsTrigger>
            <TabsTrigger value="coupons">Discount Coupons</TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{customers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered customers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Points Issued</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {customers.reduce((sum, c) => sum + c.loyaltyPoints, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all customers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Points/Customer</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {customers.length > 0 ? Math.round(customers.reduce((sum, c) => sum + c.loyaltyPoints, 0) / customers.length) : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Loyalty engagement
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Customer Loyalty Rankings</CardTitle>
                <CardDescription>Your most valuable customers</CardDescription>
              </CardHeader>
              <CardContent>
                {customers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers yet</h3>
                    <p className="text-gray-600">Customers will appear here after they place orders</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customers
                      .sort((a, b) => b.loyaltyPoints - a.loyaltyPoints)
                      .slice(0, 10)
                      .map((customer, index) => {
                        const tier = getCustomerTier(customer.totalSpent)
                        const Icon = tier.icon
                        return (
                          <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm font-semibold text-orange-600">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-medium">{customer.name}</h4>
                                <p className="text-sm text-gray-600">{customer.mobile}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-6">
                              <div className="text-right">
                                <p className="font-semibold">{customer.loyaltyPoints} pts</p>
                                <p className="text-sm text-gray-600">₹{customer.totalSpent.toLocaleString()} spent</p>
                              </div>
                              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${tier.color}`}>
                                <Icon className="h-4 w-4" />
                                <span className="text-sm font-medium">{tier.tier}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Discount Coupons</h2>
                <p className="text-gray-600">Create and manage discount coupons</p>
              </div>
              <Button onClick={() => setShowCouponForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Coupon
              </Button>
            </div>

            {/* Coupon Form Modal */}
            {showCouponForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold">
                        {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                      </h3>
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setShowCouponForm(false)
                          setEditingCoupon(null)
                          setCouponForm({
                            code: '',
                            discount: '',
                            discountType: 'percentage',
                            minOrder: '',
                            maxUses: '',
                            isActive: true,
                            expiresAt: '',
                          })
                        }}
                        className="h-8 w-8 p-0"
                      >
                        ×
                      </Button>
                    </div>

                    <form onSubmit={handleCouponSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="code">Coupon Code *</Label>
                        <Input
                          id="code"
                          value={couponForm.code}
                          onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                          placeholder="e.g., SAVE20"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="discount">Discount *</Label>
                          <Input
                            id="discount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={couponForm.discount}
                            onChange={(e) => setCouponForm(prev => ({ ...prev, discount: e.target.value }))}
                            placeholder="20"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="discountType">Discount Type</Label>
                          <Select 
                            value={couponForm.discountType} 
                            onValueChange={(value) => setCouponForm(prev => ({ ...prev, discountType: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="minOrder">Minimum Order</Label>
                          <Input
                            id="minOrder"
                            type="number"
                            step="0.01"
                            min="0"
                            value={couponForm.minOrder}
                            onChange={(e) => setCouponForm(prev => ({ ...prev, minOrder: e.target.value }))}
                            placeholder="100"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="maxUses">Max Uses</Label>
                          <Input
                            id="maxUses"
                            type="number"
                            min="1"
                            value={couponForm.maxUses}
                            onChange={(e) => setCouponForm(prev => ({ ...prev, maxUses: e.target.value }))}
                            placeholder="100"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expiresAt">Expiry Date</Label>
                        <Input
                          id="expiresAt"
                          type="date"
                          value={couponForm.expiresAt}
                          onChange={(e) => setCouponForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={couponForm.isActive}
                          onCheckedChange={(checked) => setCouponForm(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label htmlFor="isActive">Coupon is active</Label>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <Button type="submit" className="flex-1">
                          {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => {
                            setShowCouponForm(false)
                            setEditingCoupon(null)
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Coupons List */}
            <div className="grid gap-4">
              {coupons.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Tag className="h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No coupons yet</h3>
                    <p className="text-gray-600 mb-4">Create your first discount coupon</p>
                    <Button onClick={() => setShowCouponForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Coupon
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                coupons.map((coupon) => (
                  <Card key={coupon.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold">{coupon.code}</h3>
                            <Badge variant={coupon.isActive ? "default" : "secondary"}>
                              {coupon.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {coupon.usedCount >= (coupon.maxUses || Infinity) && (
                              <Badge variant="destructive">Expired</Badge>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">
                            {coupon.discountType === 'percentage' 
                              ? `${coupon.discount}% off` 
                              : `₹${coupon.discount} off`}
                            {coupon.minOrder && ` on orders above ₹${coupon.minOrder}`}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Used {coupon.usedCount} times</span>
                            {coupon.maxUses && <span>• {coupon.maxUses - coupon.usedCount} uses left</span>}
                            {coupon.expiresAt && (
                              <span>• Expires {new Date(coupon.expiresAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCouponStatus(coupon.id, !coupon.isActive)}
                          >
                            {coupon.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCoupon(coupon)
                              setCouponForm({
                                code: coupon.code,
                                discount: coupon.discount.toString(),
                                discountType: coupon.discountType,
                                minOrder: coupon.minOrder?.toString() || '',
                                maxUses: coupon.maxUses?.toString() || '',
                                isActive: coupon.isActive,
                                expiresAt: coupon.expiresAt || '',
                              })
                              setShowCouponForm(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCoupon(coupon.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}