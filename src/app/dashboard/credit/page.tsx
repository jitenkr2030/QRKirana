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
import { 
  CreditCard, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Eye, 
  Settings,
  Calculator,
  UserCheck,
  ArrowUpRight,
  ArrowDown
} from 'lucide-react'
import { toast } from 'sonner'

interface CreditAccount {
  id: string
  customerId: string
  customer: {
    id: string
    name: string
    mobile: string
    totalOrders: number
    totalSpent: number
  }
  creditLimit: number
  currentBalance: number
  availableCredit: number
  creditScore: number
  isActive: boolean
  dueDate?: string
  lastPaymentDate?: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
}

interface CreditTransaction {
  id: string
  accountId: string
  type: string
  amount: number
  balance: number
  description?: string
  reference?: string
  createdAt: string
}

interface CreditSettings {
  defaultCreditLimit: number
  minCreditScore: number
  interestRate: number
  lateFeeRate: number
  gracePeriod: number
  autoApprove: boolean
  requireVerification: boolean
  isActive: boolean
}

export default function CreditDashboard() {
  const router = useRouter()
  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>([])
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [creditSettings, setCreditSettings] = useState<CreditSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showSettingsForm, setShowSettingsForm] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<CreditAccount | null>(null)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken')
    const shopId = localStorage.getItem('shopId')
    
    if (!token || !shopId) {
      router.push('/auth/login')
      return
    }

    fetchCreditData(shopId)
  }, [router])

  const fetchCreditData = async (shopId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      
      // Fetch credit accounts
      const accountsResponse = await fetch('/api/credit/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        setCreditAccounts(accountsData.accounts)
      }

      // Fetch credit transactions
      const transactionsResponse = await fetch('/api/credit/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(transactionsData.transactions)
      }

      // Fetch credit settings
      const settingsResponse = await fetch('/api/credit/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setCreditSettings(settingsData.settings)
      }
    } catch (error) {
      console.error('Failed to fetch credit data:', error)
      toast.error('Failed to load credit data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAccount = async (formData: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/credit/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Credit account created successfully!')
        setShowAccountForm(false)
        fetchCreditData(localStorage.getItem('shopId')!)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create credit account')
      }
    } catch (error) {
      toast.error('Failed to create credit account')
    }
  }

  const handleCreateTransaction = async (formData: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/credit/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Transaction processed successfully!')
        setShowTransactionForm(false)
        fetchCreditData(localStorage.getItem('shopId')!)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to process transaction')
      }
    } catch (error) {
      toast.error('Failed to process transaction')
    }
  }

  const handleUpdateSettings = async (formData: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/credit/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('Credit settings updated successfully!')
        setShowSettingsForm(false)
        fetchCreditData(localStorage.getItem('shopId')!)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update settings')
      }
    } catch (error) {
      toast.error('Failed to update settings')
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-100'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
      case 'HIGH': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'CREDIT': return <ArrowUpRight className="h-4 w-4 text-green-600" />
      case 'DEBIT': return <ArrowDownRight className="h-4 w-4 text-red-600" />
      case 'PAYMENT': return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'INTEREST': return <Calculator className="h-4 w-4 text-orange-600" />
      case 'FEE': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <CreditCard className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading credit dashboard...</p>
        </div>
      </div>
    )
  }

  const totalCreditLimit = creditAccounts.reduce((sum, account) => sum + account.creditLimit, 0)
  const totalBalance = creditAccounts.reduce((sum, account) => sum + account.currentBalance, 0)
  const activeAccounts = creditAccounts.filter(account => account.isActive).length
  const highRiskAccounts = creditAccounts.filter(account => account.creditScore < 60).length

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
                  <CreditCard className="h-5 w-5 text-orange-600" />
                  QRKhata Credit System
                </h1>
                <p className="text-sm text-gray-600">Manage customer credit accounts and transactions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowAccountForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
              <Button variant="outline" onClick={() => setShowTransactionForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
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
              <CardTitle className="text-sm font-medium">Total Credit Limit</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalCreditLimit.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total outstanding
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAccounts}</div>
              <p className="text-xs text-muted-foreground">
                of {creditAccounts.length} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Accounts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{highRiskAccounts}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="accounts">Credit Accounts</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Credit Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Credit Accounts</h2>
                <p className="text-gray-600">Manage customer credit accounts</p>
              </div>
              <Button onClick={() => setShowAccountForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>

            {creditAccounts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Credit Accounts</h3>
                  <p className="text-gray-600 mb-4">Create your first credit account to get started</p>
                  <Button onClick={() => setShowAccountForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {creditAccounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{account.customer.name}</h3>
                          <p className="text-sm text-gray-600">{account.customer.mobile}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getRiskColor(account.riskLevel)}>
                              {account.riskLevel} RISK
                            </Badge>
                            <span className="text-sm text-gray-600">
                              Score: {account.creditScore}/100
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAccount(account)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Credit Limit</p>
                          <p className="font-semibold">₹{account.creditLimit.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Current Balance</p>
                          <p className="font-semibold">₹{account.currentBalance.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Available</p>
                          <p className="font-semibold">₹{account.availableCredit.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Utilization</p>
                          <p className="font-semibold">
                            {account.creditLimit > 0 
                              ? Math.round((account.currentBalance / account.creditLimit) * 100) 
                              : 0}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Credit Transactions</h2>
              <p className="text-gray-600">View all credit transactions</p>
            </div>

            {transactions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions</h3>
                  <p className="text-gray-600">Transactions will appear here once they are created</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {creditAccounts.find(a => a.id === transaction.accountId)?.customer.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.type)}
                            <span className="capitalize">{transaction.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={transaction.type === 'CREDIT' || transaction.type === 'PAYMENT' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.type === 'CREDIT' || transaction.type === 'PAYMENT' ? '+' : '-'}
                            ₹{Math.abs(transaction.amount).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>₹{transaction.balance.toLocaleString()}</TableCell>
                        <TableCell className="max-w-xs truncate">{transaction.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Credit Analytics</h2>
              <p className="text-gray-600">Insights and performance metrics</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-600">Low Risk</span>
                      <span className="font-semibold">
                        {creditAccounts.filter(a => a.creditScore >= 80).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-600">Medium Risk</span>
                      <span className="font-semibold">
                        {creditAccounts.filter(a => a.creditScore >= 60 && a.creditScore < 80).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-red-600">High Risk</span>
                      <span className="font-semibold">
                        {creditAccounts.filter(a => a.creditScore < 60).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Customers by Credit Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {creditAccounts
                      .sort((a, b) => b.creditScore - a.creditScore)
                      .slice(0, 5)
                      .map((account, index) => (
                        <div key={account.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{account.customer.name}</p>
                            <p className="text-sm text-gray-600">{account.customer.mobile}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getRiskColor(account.riskLevel)}>
                              {account.creditScore}
                            </Badge>
                          </div>
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
              <h2 className="text-2xl font-bold">Credit Settings</h2>
              <p className="text-gray-600">Configure credit system parameters</p>
            </div>

            {creditSettings ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Default Credit Limit</Label>
                        <Input
                          type="number"
                          value={creditSettings.defaultCreditLimit}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value)
                            if (!isNaN(newValue)) {
                              handleUpdateSettings({ defaultCreditLimit: newValue })
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Minimum Credit Score</Label>
                        <Input
                          type="number"
                          value={creditSettings.minCreditScore}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value)
                            if (!isNaN(newValue)) {
                              handleUpdateSettings({ minCreditScore: newValue })
                            }
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Interest & Fees</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Interest Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={creditSettings.interestRate}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value)
                            if (!isNaN(newValue)) {
                              handleUpdateSettings({ interestRate: newValue })
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Late Fee Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={creditSettings.lateFeeRate * 100}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value) / 100
                            if (!isNaN(newValue)) {
                              handleUpdateSettings({ lateFeeRate: newValue })
                            }
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Policies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="autoApprove"
                          checked={creditSettings.autoApprove}
                          onChange={(e) => {
                            handleUpdateSettings({ autoApprove: e.target.checked })
                          }}
                        />
                        <Label htmlFor="autoApprove">Auto Approve Accounts</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="requireVerification"
                          checked={creditSettings.requireVerification}
                          onChange={(e) => {
                            handleUpdateSettings({ requireVerification: e.target.checked })
                          }}
                        />
                        <Label htmlFor="requireVerification">Require Verification</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Settings className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Settings Found</h3>
                  <p className="text-gray-600">Configure your credit settings to get started</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Account Modal */}
      {showAccountForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Create Credit Account</h3>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAccountForm(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>

              <CreateAccountForm 
                onCreate={handleCreateAccount}
                onCancel={() => setShowAccountForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Add Transaction</h3>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowTransactionForm(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>

              <CreateTransactionForm 
                accounts={creditAccounts}
                onCreate={handleCreateTransaction}
                onCancel={() => setShowTransactionForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Form components
function CreateAccountForm({ onCreate, onCancel }: any) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [creditLimit, setCreditLimit] = useState('5000')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate({
      customerId: selectedCustomerId,
      creditLimit: parseFloat(creditLimit)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer">Select Customer</Label>
        <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
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
        <Label htmlFor="creditLimit">Credit Limit (₹)</Label>
        <Input
          id="creditLimit"
          type="number"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          placeholder="Enter credit limit"
        />
      </div>
      <div className="flex gap-4 pt-4">
        <Button type="button" onClick={onCancel} variant="outline">Cancel</Button>
        <Button type="submit">Create Account</Button>
      </div>
    </form>
  )
}

function CreateTransactionForm({ accounts, onCreate, onCancel }: any) {
  const [accountId, setAccountId] = useState('')
  const [type, setType] = useState('PAYMENT')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate({
      accountId,
      type,
      amount: parseFloat(amount),
      description
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="account">Select Account</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.customer.name} - ₹{account.creditLimit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Transaction Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CREDIT">Credit</SelectItem>
            <SelectItem value="DEBIT">Debit</SelectItem>
            <SelectItem value="PAYMENT">Payment</SelectItem>
            <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description (optional)"
        />
      </div>
      <div className="flex gap-4 pt-4">
        <Button type="button" onClick={onCancel} variant="outline">Cancel</Button>
        <Button type="submit">Add Transaction</Button>
      </div>
    </form>
  )
}