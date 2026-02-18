'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Store, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Settings, 
  Search,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  BarChart3,
  IndianRupee,
  Calendar,
  Globe,
  Shield,
  Zap
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
  isActive: boolean
  subscriptionType: string
  subscriptionEnds?: string
  createdAt: string
  _count: {
    products: number
    orders: number
    customers: number
  }
}

interface PlatformStats {
  totalShops: number
  activeShops: number
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  recentOrders: any[]
  topCategories: any[]
}

export default function AdminPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    // Check if user is admin (simple check for demo)
    const isAdmin = localStorage.getItem('isAdmin') === 'true'
    if (!isAdmin) {
      // For demo purposes, set admin flag
      localStorage.setItem('isAdmin', 'true')
    }

    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      // Fetch platform stats
      const statsResponse = await fetch('/api/admin/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch shops
      const shopsResponse = await fetch('/api/admin/shops')
      if (shopsResponse.ok) {
        const shopsData = await shopsResponse.json()
        setShops(shopsData.shops)
      }
    } catch (error) {
      toast.error('Failed to load admin data')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleShopStatus = async (shopId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/shops/${shopId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })

      if (response.ok) {
        toast.success(`Shop ${isActive ? 'activated' : 'deactivated'}`)
        setShops(prevShops => 
          prevShops.map(shop => 
            shop.id === shopId ? { ...shop, isActive } : shop
          )
        )
      } else {
        toast.error('Failed to update shop status')
      }
    } catch (error) {
      toast.error('Failed to update shop status')
    }
  }

  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shop.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shop.mobile.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'active' && shop.isActive) ||
                          (filterStatus === 'inactive' && !shop.isActive)
    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
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
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">QRKirana Admin</h1>
                <p className="text-sm text-gray-600">Platform Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="shops">Shops</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {stats && (
              <>
                {/* Key Metrics */}
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
                      <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalShops}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.activeShops} active
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalOrders}</div>
                      <p className="text-xs text-muted-foreground">
                        All time
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        Platform wide
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Customers</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                      <p className="text-xs text-muted-foreground">
                        Registered users
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Growth</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">+24%</div>
                      <p className="text-xs text-muted-foreground">
                        This month
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Recent Orders */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Orders</CardTitle>
                      <CardDescription>Latest orders across the platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {stats.recentOrders.slice(0, 5).map((order: any) => (
                          <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">{order.shopName}</h4>
                              <p className="text-sm text-gray-600">{order.customerName} • ₹{order.totalAmount}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{order.status}</Badge>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Categories */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Categories</CardTitle>
                      <CardDescription>Most popular shop categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {stats.topCategories.map((category: any, index: number) => (
                          <div key={category.category} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm font-semibold text-orange-600">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium capitalize">{category.category}</p>
                                <p className="text-sm text-gray-600">{category.count} shops</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{category.percentage}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Shops Tab */}
          <TabsContent value="shops" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Shop Management</h2>
                <p className="text-gray-600">Manage all registered shops</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search shops..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shops List */}
            <div className="space-y-4">
              {filteredShops.map((shop) => (
                <Card key={shop.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{shop.name}</h3>
                          <Badge variant={shop.isActive ? "default" : "secondary"}>
                            {shop.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">{shop.subscriptionType}</Badge>
                        </div>
                        <p className="text-gray-600 mb-2">
                          {shop.ownerName} • {shop.mobile} • {shop.category}
                        </p>
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <span>{shop._count.products} products</span>
                          <span>{shop._count.orders} orders</span>
                          <span>{shop._count.customers} customers</span>
                          <span>Joined {new Date(shop.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/shop/${shop.uniqueUrl}`, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleShopStatus(shop.id, !shop.isActive)}
                          className={shop.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                        >
                          {shop.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Platform Settings</h2>
              <p className="text-gray-600">Configure platform-wide settings</p>
            </div>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    General Settings
                  </CardTitle>
                  <CardDescription>Basic platform configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="platformName">Platform Name</Label>
                      <Input id="platformName" defaultValue="QRKirana" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supportEmail">Support Email</Label>
                      <Input id="supportEmail" defaultValue="support@qrkirana.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Platform Description</Label>
                    <textarea 
                      id="description" 
                      className="w-full p-2 border rounded-md" 
                      rows={3}
                      defaultValue="Digital ordering system for local kirana stores"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Subscription Settings
                  </CardTitle>
                  <CardDescription>Manage subscription plans and pricing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Free Plan</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Product Limit</span>
                          <Input type="number" defaultValue="20" className="w-20" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Price</span>
                          <Input value="₹0/month" disabled className="w-24" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Premium Plan</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Product Limit</span>
                          <Input value="Unlimited" disabled className="w-24" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Price</span>
                          <Input defaultValue="299" className="w-20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Analytics Settings
                  </CardTitle>
                  <CardDescription>Configure analytics and reporting</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Enable Advanced Analytics</h4>
                      <p className="text-sm text-gray-600">Provide detailed insights to shop owners</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Export Reports</h4>
                      <p className="text-sm text-gray-600">Allow data export in CSV/Excel format</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button>Save Settings</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}