'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Store, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Plus, 
  Edit, 
  Trash2,
  QrCode,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  IndianRupee,
  Calendar,
  Gift,
  Shield,
  CreditCard
} from 'lucide-react'
import { toast } from 'sonner'

interface Shop {
  id: string
  name: string
  ownerName: string
  mobile: string
  email?: string
  address: string
  category: string
  uniqueUrl: string
  qrCodeUrl?: string
  subscriptionType: string
}

interface Product {
  id: string
  name: string
  price: number
  unit: string
  category?: string
  description?: string
  inStock: boolean
  image?: string
}

interface Order {
  id: string
  customerName: string
  customerMobile: string
  totalAmount: number
  status: string
  deliveryType: string
  createdAt: string
  items: {
    id: string
    productName: string
    quantity: number
    price: number
    total: number
  }[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [creditAccounts, setCreditAccounts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken')
    const shopId = localStorage.getItem('shopId')
    
    console.log('Dashboard auth check:', { token: token ? 'exists' : 'missing', shopId })
    
    if (!token || !shopId) {
      console.log('No auth data, redirecting to login')
      router.push('/auth/login')
      return
    }

    fetchDashboardData(shopId)
  }, [router])

  // Fetch analytics data when analytics tab is opened
  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData) {
      fetchAnalyticsData()
    }
  }, [activeTab])

  const fetchDashboardData = async (shopId: string) => {
    try {
      const response = await fetch(`/api/dashboard/${shopId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setShop(data.shop)
        setProducts(data.products)
        setOrders(data.orders)
      } else if (response.status === 401) {
        console.log('Dashboard API returned 401, clearing auth and redirecting')
        localStorage.removeItem('authToken')
        localStorage.removeItem('shopId')
        router.push('/auth/login')
      } else {
        toast.error('Failed to load dashboard data')
      }

      // Also fetch credit accounts
      try {
        const creditResponse = await fetch('/api/credit/accounts', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        })

        if (creditResponse.ok) {
          const creditData = await creditResponse.json()
          setCreditAccounts(creditData.accounts)
        }
      } catch (error) {
        console.error('Failed to fetch credit accounts:', error)
      }

    } catch (error) {
      console.error('Dashboard fetch error:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        toast.success(`Order ${newStatus.toLowerCase()}`)
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        )
      } else {
        toast.error('Failed to update order status')
      }
    } catch (error) {
      toast.error('Failed to update order status')
    }
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        toast.success('Product deleted successfully')
        setProducts(prevProducts => prevProducts.filter(p => p.id !== productId))
      } else {
        toast.error('Failed to delete product')
      }
    } catch (error) {
      toast.error('Failed to delete product')
    }
  }

  const fetchAnalyticsData = async (period: string = '7d') => {
    try {
      const shopId = localStorage.getItem('shopId')
      if (!shopId) return

      const response = await fetch(`/api/analytics/${shopId}?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
    }
  }

  const downloadQRCode = () => {
    if (shop?.qrCodeUrl) {
      const link = document.createElement('a')
      link.href = shop.qrCodeUrl
      link.download = `${shop.name.replace(/\s+/g, '-')}-qrcode.png`
      link.click()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800'
      case 'PREPARING': return 'bg-purple-100 text-purple-800'
      case 'OUT_FOR_DELIVERY': return 'bg-indigo-100 text-indigo-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4" />
      case 'ACCEPTED': return <CheckCircle className="h-4 w-4" />
      case 'DELIVERED': return <CheckCircle className="h-4 w-4" />
      case 'CANCELLED': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Analytics Period Selector Component
  const AnalyticsPeriodSelector = ({ onPeriodChange }: { onPeriodChange: (period: string) => void }) => {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPeriodChange('7d')}
        >
          7 Days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPeriodChange('30d')}
        >
          30 Days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPeriodChange('90d')}
        >
          90 Days
        </Button>
      </div>
    )
  }

  // Simple Line Chart Component
  const SimpleLineChart = ({ data, dataKey, xAxisDataKey, label }: any) => {
    const maxValue = Math.max(...data.map((d: any) => d[dataKey]))
    const minValue = 0
    
    return (
      <div className="w-full h-full relative">
        <div className="absolute inset-0 flex items-end justify-between px-2 pb-8">
          {data.map((point: any, index: number) => {
            const height = maxValue > 0 ? (point[dataKey] / maxValue) * 100 : 0
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="w-full bg-orange-500 rounded-t-sm relative group cursor-pointer"
                  style={{ height: `${height}%`, minHeight: '2px' }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ₹{point[dataKey].toLocaleString()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-300"></div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 -mb-6">
          {data.map((point: any, index: number) => (
            <div key={index} className="text-xs text-gray-600 text-center flex-1">
              {new Date(point[xAxisDataKey]).getDate()}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!shop) {
    return null
  }

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const pendingOrders = orders.filter(order => order.status === 'PENDING').length
  const deliveredOrders = orders.filter(order => order.status === 'DELIVERED').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Store className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-xl font-bold text-gray-900">QRKirana</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="font-semibold text-gray-900">{shop.name}</h1>
                <p className="text-sm text-gray-600">{shop.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={downloadQRCode}>
                <Download className="h-4 w-4 mr-2" />
                Download QR
              </Button>
              <Button onClick={() => window.open(`/shop/${shop.uniqueUrl}`, '_blank')}>
                <Eye className="h-4 w-4 mr-2" />
                View Shop
              </Button>
              <Button 
                variant="ghost"
                onClick={() => window.open('/admin', '_blank')}
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin Panel
              </Button>
              <Button 
                variant="ghost"
                onClick={() => {
                  localStorage.removeItem('authToken')
                  localStorage.removeItem('shopId')
                  router.push('/auth/login')
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    {deliveredOrders} delivered this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Credit</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {creditAccounts?.filter(a => a.isActive).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Credit accounts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +20.1% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    Requires attention
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{products.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {products.filter(p => p.inStock).length} in stock
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks you might want to perform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Link href="/dashboard/products/add">
                    <Button className="w-full" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Product
                    </Button>
                  </Link>
                  <Button className="w-full" variant="outline">
                    <QrCode className="h-4 w-4 mr-2" />
                    Print QR Code
                  </Button>
                  <Link href="/dashboard/subscriptions">
                    <Button className="w-full" variant="outline">
                      <Package className="h-4 w-4 mr-2" />
                      QRMilk
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Products</h2>
                <p className="text-gray-600">Manage your product inventory</p>
              </div>
              <Link href="/dashboard/products/add">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </Link>
            </div>

            {products.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No products yet</h3>
                  <p className="text-gray-600 mb-4">Start by adding your first product</p>
                  <Link href="/dashboard/products/add">
                    <Button>Add Your First Product</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Card key={product.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          {product.category && (
                            <Badge variant="secondary" className="mt-1">
                              {product.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteProduct(product.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {product.description && (
                        <CardDescription>{product.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold">₹{product.price}</span>
                          <span className="text-gray-600 ml-1">/{product.unit}</span>
                        </div>
                        <Badge variant={product.inStock ? "default" : "destructive"}>
                          {product.inStock ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Orders</h2>
              <p className="text-gray-600">Manage customer orders</p>
            </div>

            {orders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShoppingCart className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                  <p className="text-gray-600">Orders will appear here when customers place them</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Order #{order.id.slice(-8).toUpperCase()}</CardTitle>
                          <CardDescription>
                            {order.customerName} • {order.customerMobile}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(order.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(order.status)}
                              {order.status}
                            </div>
                          </Badge>
                          <span className="text-lg font-bold">₹{order.totalAmount}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Order Items:</h4>
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span>{item.productName} x {item.quantity}</span>
                                <span>₹{item.total}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="text-sm text-gray-600">
                            {order.deliveryType === 'delivery' ? 'Home Delivery' : 'Store Pickup'} • 
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex gap-2">
                            {order.status === 'PENDING' && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                                >
                                  Accept
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => updateOrderStatus(order.id, 'REJECTED')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {order.status === 'ACCEPTED' && (
                              <Button 
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                              >
                                Start Preparing
                              </Button>
                            )}
                            {order.status === 'PREPARING' && (
                              <Button 
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'OUT_FOR_DELIVERY')}
                              >
                                Out for Delivery
                              </Button>
                            )}
                            {order.status === 'OUT_FOR_DELIVERY' && (
                              <Button 
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                              >
                                Mark Delivered
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Customers</h2>
              <p className="text-gray-600">View and manage your customer base</p>
            </div>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Management</h3>
                <p className="text-gray-600">Customer analytics and management features coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Analytics</h2>
                <p className="text-gray-600">Track your business performance and insights</p>
              </div>
              <AnalyticsPeriodSelector onPeriodChange={fetchAnalyticsData} />
            </div>

            {analyticsData ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{analyticsData.summary.totalRevenue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground flex items-center">
                        {analyticsData.summary.revenueChange >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                        ) : (
                          <TrendingUp className="h-3 w-3 mr-1 text-red-600 rotate-180" />
                        )}
                        {Math.abs(analyticsData.summary.revenueChange)}% from last period
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.summary.totalOrders}</div>
                      <p className="text-xs text-muted-foreground flex items-center">
                        {analyticsData.summary.ordersChange >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                        ) : (
                          <TrendingUp className="h-3 w-3 mr-1 text-red-600 rotate-180" />
                        )}
                        {Math.abs(analyticsData.summary.ordersChange)}% from last period
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{analyticsData.summary.avgOrderValue}</div>
                      <p className="text-xs text-muted-foreground flex items-center">
                        {analyticsData.summary.avgOrderChange >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                        ) : (
                          <TrendingUp className="h-3 w-3 mr-1 text-red-600 rotate-180" />
                        )}
                        {Math.abs(analyticsData.summary.avgOrderChange)}% from last period
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.summary.uniqueCustomers}</div>
                      <p className="text-xs text-muted-foreground">
                        {analyticsData.summary.repeatCustomers} repeat customers
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Period</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analyticsData.summary.period === '7d' ? '7 Days' : 
                         analyticsData.summary.period === '30d' ? '30 Days' : '90 Days'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Selected time period
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Sales Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Sales Trend</CardTitle>
                      <CardDescription>Daily revenue and order volume</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <SimpleLineChart 
                          data={analyticsData.charts.dailySales}
                          dataKey="revenue"
                          xAxisDataKey="date"
                          label="Revenue (₹)"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Products */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Selling Products</CardTitle>
                      <CardDescription>Best performing products by revenue</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analyticsData.charts.topProducts.slice(0, 5).map((product, index) => (
                          <div key={product.productId} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm font-semibold text-orange-600">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-600">{product.quantity} units sold</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">₹{product.revenue.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Order Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Status Breakdown</CardTitle>
                      <CardDescription>Distribution of order statuses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(analyticsData.charts.statusBreakdown).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
                              <span className="capitalize">{status.replace('_', ' ')}</span>
                            </div>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Delivery Types */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Delivery Preferences</CardTitle>
                      <CardDescription>Customer delivery choices</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(analyticsData.charts.deliveryBreakdown).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${type === 'delivery' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                              <span className="capitalize">{type === 'delivery' ? 'Home Delivery' : 'Store Pickup'}</span>
                            </div>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Analytics</h3>
                  <p className="text-gray-600">Fetching your business insights...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}