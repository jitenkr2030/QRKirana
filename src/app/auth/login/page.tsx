'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QrCode, ArrowLeft, Store, Phone, Lock } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    mobile: '',
    password: '',
  })

  const handleInputChange = (field: string, value: string) => {
    console.log(`Updating ${field} to:`, value)
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    console.log('Login button clicked with data:', formData)
    setIsLoading(true)

    // Basic validation
    if (!formData.mobile || !formData.password) {
      toast.error('Please enter both mobile number and password')
      setIsLoading(false)
      return
    }

    try {
      console.log('Making login request...')
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      console.log('Login response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Login response:', data)
        toast.success('Login successful!')
        // Store auth token and redirect to dashboard
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('shopId', data.shop.id)
        console.log('Stored auth data, redirecting to dashboard...')
        router.push('/dashboard')
      } else {
        const error = await response.json()
        console.log('Login error:', error)
        toast.error(error.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login request error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <QrCode className="h-8 w-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-900">QRKirana</span>
          </Link>
          <Link href="/auth/register">
            <Button>Don't have an account? Register</Button>
          </Link>
        </div>
      </header>

      {/* Login Form */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome Back
            </h1>
            <p className="text-lg text-gray-600">
              Login to manage your shop and orders
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-orange-600" />
                Shop Login
              </CardTitle>
              <CardDescription>
                Enter your mobile number and password to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mobile" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Mobile Number *
                  </Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                    pattern="[0-9]{10}"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-600">Remember me</span>
                  </label>
                  <Link href="/auth/forgot-password" className="text-sm text-orange-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <div className="space-y-2">
                  <Button 
                    type="button" 
                    className="w-full" 
                    size="lg"
                    disabled={isLoading}
                    onClick={handleSubmit}
                  >
                    {isLoading ? 'Logging in...' : 'Login to Dashboard'}
                  </Button>

                  {/* Debug button for testing */}
                  <Button 
                    type="button" 
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      console.log('Debug button clicked, current form data:', formData)
                      console.log('isLoading:', isLoading)
                    }}
                  >
                    Debug: Show Form Data
                  </Button>

                  {/* Test direct navigation */}
                  <Button 
                    type="button" 
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      console.log('Testing direct navigation to dashboard')
                      router.push('/dashboard')
                    }}
                  >
                    Test: Go to Dashboard
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link href="/auth/register" className="text-orange-600 hover:underline font-semibold">
                      Register your shop
                    </Link>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Demo: Mobile 9876543210, Password 123456
                  </p>
                </div>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}