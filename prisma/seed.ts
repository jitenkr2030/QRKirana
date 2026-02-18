import { PrismaClient } from '@prisma/client'
import QRCode from 'qrcode'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Check if demo shop already exists
  let demoShop = await db.shop.findFirst({
    where: { mobile: '9876543210' }
  })

  if (demoShop) {
    // Update existing shop with password
    demoShop = await db.shop.update({
      where: { id: demoShop.id },
      data: { password: '123456' }
    })
    console.log('✅ Updated existing demo shop with password')
  } else {
    // Create a new demo shop
    demoShop = await db.shop.create({
      data: {
        name: 'Sharma Kirana Store',
        ownerName: 'Ramesh Sharma',
        mobile: '9876543210',
        email: 'sharma.kirana@example.com',
        address: '123 Main Street, Sector 15, Gurgaon, Haryana 122001',
        category: 'kirana',
        uniqueUrl: 'sharma-kirana-store',
        password: '123456', // Default password for demo
        subscriptionType: 'premium',
        subscriptionEnds: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        isActive: true,
      }
    })
  }

  // Generate QR code for the demo shop
  const shopUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/shop/${demoShop.uniqueUrl}`
  const qrCodeDataUrl = await QRCode.toDataURL(shopUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })

  // Update shop with QR code
  await db.shop.update({
    where: { id: demoShop.id },
    data: { qrCodeUrl: qrCodeDataUrl }
  })

  // Add sample products
  const products = [
    {
      name: 'Basmati Rice',
      price: 120.00,
      unit: 'kg',
      category: 'grains',
      description: 'Premium quality long grain basmati rice',
      inStock: true,
    },
    {
      name: 'Turmeric Powder',
      price: 80.00,
      unit: 'packet',
      category: 'spices',
      description: 'Pure turmeric powder, 100g packet',
      inStock: true,
    },
    {
      name: 'Refined Oil',
      price: 150.00,
      unit: 'litre',
      category: 'oils',
      description: 'Healthy refined cooking oil',
      inStock: true,
    },
    {
      name: 'Milk',
      price: 56.00,
      unit: 'litre',
      category: 'dairy',
      description: 'Fresh full cream milk',
      inStock: true,
    },
    {
      name: 'Biscuits',
      price: 40.00,
      unit: 'packet',
      category: 'snacks',
      description: 'Tasty glucose biscuits',
      inStock: true,
    },
    {
      name: 'Tea Powder',
      price: 200.00,
      unit: 'packet',
      category: 'beverages',
      description: 'Premium tea powder, 250g',
      inStock: true,
    },
    {
      name: 'Soap',
      price: 35.00,
      unit: 'piece',
      category: 'personal-care',
      description: 'Bathing soap, 125g',
      inStock: true,
    },
    {
      name: 'Detergent',
      price: 120.00,
      unit: 'kg',
      category: 'home-care',
      description: 'Washing detergent powder',
      inStock: false, // Out of stock for demo
    }
  ]

  for (const product of products) {
    await db.product.create({
      data: {
        shopId: demoShop.id,
        ...product
      }
    })
  }

  console.log('✅ Demo shop created successfully!')
  console.log(`📱 Shop URL: ${shopUrl}`)
  console.log(`🏪 Shop Name: ${demoShop.name}`)
  console.log(`📞 Mobile: ${demoShop.mobile}`)
  console.log(`📦 Products: ${products.length}`)
  
  console.log('\n🎯 You can now:')
  console.log('1. Visit the homepage to see the landing page')
  console.log(`2. Scan QR or visit: ${shopUrl}`)
  console.log('3. Login with mobile: 9876543210 (any password)')
  console.log('4. View dashboard at: /dashboard')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })