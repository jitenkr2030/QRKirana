'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  QrCode, 
  Store, 
  Phone, 
  MapPin, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2,
  Clock,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

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

interface CartItem extends Product {
  quantity: number
  total: number
}

interface Shop {
  id: string
  name: string
  ownerName: string
  mobile: string
  address: string
  category: string
}

export default function ShopPage() {
  const params = useParams()
  const uniqueUrl = params.uniqueUrl as string

  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerMobile: '',
    customerEmail: '',
    customerAddress: '',
    deliveryType: 'delivery',
    notes: ''
  })

  // Fetch shop and products
  useEffect(() => {
    fetchShopData()
  }, [uniqueUrl])

  const fetchShopData = async () => {
    try {
      const response = await fetch(`/api/shop/${uniqueUrl}`)
      if (response.ok) {
        const data = await response.json()
        setShop(data.shop)
        setProducts(data.products)
      } else {
        toast.error('Shop not found')
      }
    } catch (error) {
      toast.error('Failed to load shop data')
    } finally {
      setIsLoading(false)
    }
  }

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        )
      } else {
        return [...prevCart, { ...product, quantity: 1, total: product.price }]
      }
    })
    toast.success(`${product.name} added to cart`)
  }

  const updateQuantity = (productId: string, change: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId) {
          const newQuantity = item.quantity + change
          if (newQuantity <= 0) {
            return item
          }
          return { ...item, quantity: newQuantity, total: newQuantity * item.price }
        }
        return item
      }).filter(item => item.quantity > 0)
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId))
    toast.success('Item removed from cart')
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.total, 0)
  }

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setIsPlacingOrder(true)

    try {
      const orderData = {
        shopId: shop?.id,
        customerName: orderForm.customerName,
        customerMobile: orderForm.customerMobile,
        customerEmail: orderForm.customerEmail || undefined,
        customerAddress: orderForm.customerAddress || undefined,
        deliveryType: orderForm.deliveryType,
        notes: orderForm.notes || undefined,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        totalAmount: getTotalAmount()
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      if (response.ok) {
        toast.success('Order placed successfully! The shop will contact you soon.')
        setCart([])
        setShowCheckout(false)
        setOrderForm({
          customerName: '',
          customerMobile: '',
          customerEmail: '',
          customerAddress: '',
          deliveryType: 'delivery',
          notes: ''
        })
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to place order')
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shop...</p>
        </div>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Shop Not Found</h1>
          <p className="text-gray-600">This shop doesn't exist or has been deactivated.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Store className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{shop.name}</h1>
                <p className="text-sm text-gray-600">{shop.category}</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCheckout(true)} 
              className="relative"
              disabled={cart.length === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cart ({cart.length})
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Shop Info */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{shop.mobile}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{shop.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Products</h2>
          <p className="text-gray-600">Browse our selection and add items to your cart</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products available</h3>
            <p className="text-gray-600">This shop hasn't added any products yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      {product.category && (
                        <Badge variant="secondary" className="mt-1">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                    {!product.inStock && (
                      <Badge variant="destructive">Out of Stock</Badge>
                    )}
                  </div>
                  {product.description && (
                    <CardDescription className="text-sm">
                      {product.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">₹{product.price}</span>
                      <span className="text-gray-600 ml-1">/{product.unit}</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => addToCart(product)}
                    disabled={!product.inStock}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Checkout</h2>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowCheckout(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>

              {/* Cart Items */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">₹{item.price}/{item.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold">₹{item.total}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-orange-600">₹{getTotalAmount()}</span>
                </div>
              </div>

              {/* Order Form */}
              <form onSubmit={handleOrderSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Your Name *</Label>
                    <Input
                      id="customerName"
                      value={orderForm.customerName}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerMobile">Mobile Number *</Label>
                    <Input
                      id="customerMobile"
                      type="tel"
                      value={orderForm.customerMobile}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, customerMobile: e.target.value }))}
                      placeholder="Enter 10-digit mobile number"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email Address</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={orderForm.customerEmail}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="Enter email (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerAddress">Delivery Address</Label>
                  <Textarea
                    id="customerAddress"
                    value={orderForm.customerAddress}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerAddress: e.target.value }))}
                    placeholder="Enter your delivery address"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Delivery Type</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="deliveryType"
                        value="delivery"
                        checked={orderForm.deliveryType === 'delivery'}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryType: e.target.value }))}
                      />
                      <span>Home Delivery</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="deliveryType"
                        value="pickup"
                        checked={orderForm.deliveryType === 'pickup'}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryType: e.target.value }))}
                      />
                      <span>Store Pickup</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any special instructions..."
                    rows={2}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isPlacingOrder}
                >
                  {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}