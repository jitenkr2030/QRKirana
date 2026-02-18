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
import { Switch } from '@/components/ui/switch'
import { 
  Calendar,
  Clock,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  X,
  Plus,
  Eye,
  Edit,
  Trash2,
  Settings,
  Truck,
  CreditCard,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'

interface Subscription {
  id: string
  customer: {
    id: string
    name: string
    mobile: string
    address: string
  }
  product: {
    id: string
    name: string
    unit: string
    image: string
  }
  quantity: number
  unit: string
  pricePerUnit: number
  frequency: string
  deliveryTime: string
  deliveryDays: string
  isActive: boolean
  paused: boolean
  startDate: string
  endDate?: string
  nextDelivery?: string
  autoCharge: boolean
  lastCharged?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface DeliverySchedule {
  id: string
  subscriptionId: string
  deliveryDate: string
  scheduledTime: string
  status: string
  quantity: number
  actualQuantity?: number
  actualPrice?: number
  deliveredBy?: string
  deliveredAt?: string
  notes?: string
  subscription: {
    customer: {
      name: string
      mobile: string
    }
    product: {
      name: string
      unit: string
    }
  }
}

interface SubscriptionSettings {
  autoGenerate: boolean
  defaultFrequency: string
  minSubscriptionDays: number
  allowPause: boolean
  allowCancel: boolean
  cancellationFee: number
  pauseFee: number
  deliveryRadius: number
  deliveryCharge: number
  isActive: boolean
}

export default function SubscriptionsPage() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [deliveries, setDeliveries] = useState<DeliverySchedule[]>([])
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false)
  const [showSettingsForm, setShowSettingsForm] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [activeTab, setActiveTab] = useState('subscriptions')

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken')
    const shopId = localStorage.getItem('shopId')
    
    if (!token || !shopId) {
      router.push('/auth/login')
      return
    }

    fetchSubscriptionData(shopId)
  }, [router])

  const fetchSubscriptionData = async (shopId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      
      // Fetch subscriptions
      const subscriptionsResponse = await fetch('/api/subscriptions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (subscriptionsResponse.ok) {
        const subscriptionsData = await subscriptionsResponse.json()
        setSubscriptions(subscriptionsData.subscriptions)
      }

      // Fetch deliveries
      const deliveriesResponse = await fetch('/api/deliveries', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (deliveriesResponse.ok) {
        const deliveriesData = await deliveriesResponse.json()
        setDeliveries(deliveriesData.deliveries)
      }

      // Fetch settings
      const settingsResponse = await fetch('/api/subscription-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSettings(settingsData.settings)
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
      toast.error('Failed to load subscription data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSubscription = async (formData: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Subscription created successfully!')
        setShowSubscriptionForm(false)
        fetchSubscriptionData(localStorage.getItem('shopId')!)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create subscription')
      }
    } catch (error) {
      toast.error('Failed to create subscription')
    }
  }

  const handleUpdateSubscription = async (subscriptionId: string, formData: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/subscriptions?id=${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Subscription updated successfully!')
        fetchSubscriptionData(localStorage.getItem('shopId')!)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update subscription')
      }
    } catch (error) {
      toast.error('Failed to update subscription')
    }
  }

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/subscriptions?id=${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast.success('Subscription deleted successfully!')
        fetchSubscriptionData(localStorage.getItem('shopId')!)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete subscription')
      }
    } catch (error) {
      toast.error('Failed to delete subscription')
    }
  }

  const handleSubscriptionAction = async (subscriptionId: string, action: string, reason?: string) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/subscription-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscriptionId,
          action,
          reason
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        fetchSubscriptionData(localStorage.getItem('shopId')!)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update subscription')
      }
    } catch (error) {
      toast.error('Failed to update subscription')
    }
  }

  const handleUpdateDelivery = async (deliveryId: string, formData: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/deliveries?id=${deliveryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Delivery updated successfully!')
        fetchSubscriptionData(localStorage.getItem('shopId')!)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update delivery')
      }
    } catch (error) {
      toast.error('Failed to update delivery')
    }
  }

  const handleUpdateSettings = async (formData: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/subscription-settings', {
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
      case 'DELIVERED': return 'text-green-600 bg-green-100'
      case 'SCHEDULED': return 'text-blue-600 bg-blue-100'
      case 'SKIPPED': return 'text-yellow-600 bg-yellow-100'
      case 'CANCELLED': return 'text-red-600 bg-red-100'
      case 'FAILED': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'daily': return <Calendar className="h-4 w-4" />
      case 'weekly': return <RefreshCw className="h-4 w-4" />
      case 'custom': return <Settings className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const activeSubscriptions = subscriptions.filter(s => s.isActive && !s.paused)
  const pausedSubscriptions = subscriptions.filter(s => s.paused)
  const totalMonthlyRevenue = activeSubscriptions.reduce((sum, sub) => {
    const daysInMonth = 30
    const deliveriesPerMonth = sub.frequency === 'daily' ? daysInMonth : sub.frequency === 'weekly' ? 4 : 1
    return sum + (sub.pricePerUnit * sub.quantity * deliveriesPerMonth)
  }, 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription data...</p>
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
                  <Package className="h-5 w-5 text-orange-600" />
                  QRMilk Subscriptions
                </h1>
                <p className="text-sm text-gray-600">Manage daily subscription deliveries</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowSubscriptionForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subscription
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
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSubscriptions.length}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paused Subscriptions</CardTitle>
              <Pause className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pausedSubscriptions.length}</div>
              <p className="text-xs text-muted-foreground">
                Temporarily paused
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalMonthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                From subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Deliveries</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deliveries.filter(d => {
                  const today = new Date()
                  const deliveryDate = new Date(d.deliveryDate)
                  return deliveryDate.toDateString() === today.toDateString()
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Scheduled for today
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Customer Subscriptions</h2>
                <p className="text-gray-600">Manage daily subscription deliveries</p>
              </div>
              <Button onClick={() => setShowSubscriptionForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subscription
              </Button>
            </div>

            {subscriptions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subscriptions</h3>
                  <p className="text-gray-600 mb-4">Create your first subscription to get started</p>
                  <Button onClick={() => setShowSubscriptionForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Subscription
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {subscriptions.map((subscription) => (
                  <Card key={subscription.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{subscription.customer.name}</h3>
                          <p className="text-sm text-gray-600">{subscription.customer.mobile}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getFrequencyIcon(subscription.frequency)}
                            <span className="text-sm capitalize">{subscription.frequency}</span>
                            <Badge variant="outline">
                              {subscription.quantity} {subscription.unit}
                            </Badge>
                            {subscription.paused && (
                              <Badge variant="secondary">Paused</Badge>
                            )}
                            {!subscription.isActive && (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubscription(subscription)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {subscription.paused ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSubscriptionAction(subscription.id, 'resume')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSubscriptionAction(subscription.id, 'pause')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Product</p>
                          <p className="font-semibold">{subscription.product.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Price</p>
                          <p className="font-semibold">₹{subscription.pricePerUnit}/{subscription.unit}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Next Delivery</p>
                          <p className="font-semibold">
                            {subscription.nextDelivery 
                              ? new Date(subscription.nextDelivery).toLocaleDateString()
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Auto-Charge</p>
                          <p className="font-semibold">
                            {subscription.autoCharge ? (
                              <span className="text-green-600">Enabled</span>
                            ) : (
                              <span className="text-gray-600">Disabled</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Delivery Schedule</h2>
              <p className="text-gray-600">Track and manage daily deliveries</p>
            </div>

            {deliveries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Truck className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Deliveries</h3>
                  <p className="text-gray-600">Deliveries will appear here once they are scheduled</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {deliveries.map((delivery) => (
                  <Card key={delivery.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{delivery.subscription.customer.name}</h3>
                          <p className="text-sm text-gray-600">{delivery.subscription.product.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(delivery.status)}>
                              {delivery.status}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(delivery.deliveryDate).toLocaleDateString()} at {delivery.scheduledTime}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {delivery.status === 'SCHEDULED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateDelivery(delivery.id, { status: 'DELIVERED' })}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {delivery.status === 'DELIVERED' && (
                            <Badge className="text-green-600 bg-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Delivered
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Quantity</p>
                          <p className="font-semibold">
                            {delivery.quantity} {delivery.subscription.product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Actual</p>
                          <p className="font-semibold">
                            {delivery.actualQuantity || delivery.quantity} {delivery.subscription.product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Price</p>
                          <p className="font-semibold">
                            ₹{delivery.actualPrice || (delivery.subscription.pricePerUnit * delivery.quantity)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Delivered By</p>
                          <p className="font-semibold">
                            {delivery.deliveredBy || 'Not assigned'}
                          </p>
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
              <h2 className="text-2xl font-bold">Subscription Analytics</h2>
              <p className="text-gray-600">Insights and performance metrics</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Product</CardTitle>
                  <CardDescription>Monthly revenue from subscriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(
                      subscriptions.reduce((acc, sub) => {
                        const product = sub.product.name
                        const monthlyRevenue = sub.pricePerUnit * sub.quantity * (sub.frequency === 'daily' ? 30 : sub.frequency === 'weekly' ? 4 : 1)
                        acc[product] = (acc[product] || 0) + monthlyRevenue
                        return acc
                      }, {} as Record<string, number>)
                    )
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([product, revenue]) => (
                        <div key={product} className="flex items-center justify-between">
                          <span className="font-medium">{product}</span>
                          <span className="font-semibold">₹{revenue.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery Performance</CardTitle>
                  <CardDescription>Success rate and delivery metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">On-Time Delivery Rate</span>
                      <span className="font-semibold">95%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Average Delivery Time</span>
                      <span className="font-semibold">06:30 AM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Customer Satisfaction</span>
                      <span className="font-semibold">4.8/5.0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Subscription Settings</h2>
              <p className="text-gray-600">Configure subscription policies and parameters</p>
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
                        <Label>Default Frequency</Label>
                        <Select value={settings.defaultFrequency} onValueChange={(value) => handleUpdateSettings({ defaultFrequency: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Minimum Subscription Days</Label>
                        <Input
                          type="number"
                          value={settings.minSubscriptionDays}
                          onChange={(e) => handleUpdateSettings({ minSubscriptionDays: parseInt(e.target.value) })}
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
                        <Label htmlFor="autoGenerate">Auto-generate deliveries</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="allowPause"
                          checked={settings.allowPause}
                          onChange={(e) => handleUpdateSettings({ allowPause: e.target.checked })}
                        />
                        <Label htmlFor="allowPause">Allow pausing subscriptions</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Fees & Charges</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cancellation Fee (₹)</Label>
                        <Input
                          type="number"
                          value={settings.cancellationFee}
                          onChange={(e) => handleUpdateSettings({ cancellationFee: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pause Fee (₹)</Label>
                        <Input
                          type="number"
                          value={settings.pauseFee}
                          onChange={(e) => handleUpdateSettings({ pauseFee: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Delivery Radius (km)</Label>
                        <Input
                          type="number"
                          value={settings.deliveryRadius}
                          onChange={(e) => handleUpdateSettings({ deliveryRadius: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Delivery Charge (₹)</Label>
                        <Input
                          type="number"
                          value={settings.deliveryCharge}
                          onChange={(e) => handleUpdateSettings({ deliveryCharge: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Subscription Modal */}
      {showSubscriptionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Create Subscription</h3>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowSubscriptionForm(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>

              <CreateSubscriptionForm 
                onCreate={handleCreateSubscription}
                onCancel={() => setShowSubscriptionForm(false)}
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
                <h3 className="text-xl font-bold">Subscription Settings</h3>
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
                  <Label>Default Frequency</Label>
                  <Select value={settings?.defaultFrequency} onValueChange={(value) => handleUpdateSettings({ defaultFrequency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Minimum Subscription Days</Label>
                  <Input
                    type="number"
                    value={settings?.minSubscriptionDays || 7}
                    onChange={(e) => handleUpdateSettings({ minSubscriptionDays: parseInt(e.target.value) })}
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
                    <Label htmlFor="autoGenerate">Auto-generate deliveries</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowPause"
                      checked={settings?.allowPause || false}
                      onChange={(e) => handleUpdateSettings({ allowPause: e.target.checked })}
                    />
                    <Label htmlFor="allowPause">Allow pausing subscriptions</Label>
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

// Form component for creating subscriptions
function CreateSubscriptionForm({ onCreate, onCancel }: any) {
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    quantity: 1,
    pricePerUnit: 0,
    frequency: 'daily',
    deliveryTime: '06:00',
    deliveryDays: 'monday,tuesday,wednesday,thursday,friday,saturday,sunday',
    startDate: new Date().toISOString().split('T')[0],
    autoCharge: false,
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate({
      ...formData,
      quantity: parseFloat(formData.quantity.toString()),
      pricePerUnit: parseFloat(formData.pricePerUnit.toString()),
      startDate: new Date(formData.startDate)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
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
          <Label htmlFor="product">Select Product</Label>
          <Select value={formData.productId} onValueChange={(value) => setFormData(prev => ({ ...prev, productId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a product" />
            </SelectTrigger>
            <SelectContent>
              {/* This would be populated with actual products */}
              <SelectItem value="product1">Product 1</SelectItem>
              <SelectItem value="product2">Product 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            step="0.1"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pricePerUnit">Price per Unit</Label>
          <Input
            id="pricePerUnit"
            type="number"
            step="0.01"
            value={formData.pricePerUnit}
            onChange={(e) => setFormData(prev => ({ ...prev, pricePerUnit: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="frequency">Frequency</Label>
          <Select value={formData.frequency} onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryTime">Delivery Time</Label>
          <Input
            id="deliveryTime"
            type="time"
            value={formData.deliveryTime}
            onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDate">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
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

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="autoCharge"
          checked={formData.autoCharge}
          onChange={(e) => setFormData(prev => ({ ...prev, autoCharge: e.target.checked }))}
        />
        <Label htmlFor="autoCharge">Auto-charge for deliveries</Label>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="button" onClick={onCancel} variant="outline">Cancel</Button>
        <Button type="submit">Create Subscription</Button>
      </div>
    </form>
  )
}