# 🏪 QRKirana - Digital Ordering System for Local Kirana Stores

<div align="center">

![QRKirana Logo](https://img.shields.io/badge/QRKirana-Digital%20Ordering-orange?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16.1.3-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-6.19.2-2D3748?style=for-the-badge&logo=prisma)

**Scan Karo, Order Karo** - Transform your local kirana store with QR-based digital ordering

[Live Demo](#) • [Documentation](#) • [Report Bug](#) • [Request Feature](#)

</div>

## 📋 Table of Contents

- [About QRKirana](#about-qrkirana)
- [✨ Key Features](#-key-features)
- [🚀 Quick Start](#-quick-start)
- [🛠️ Installation](#️-installation)
- [📁 Project Structure](#-project-structure)
- [🔧 Configuration](#-configuration)
- [📱 User Guides](#-user-guides)
- [🔐 API Documentation](#-api-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🎯 About QRKirana

QRKirana is a comprehensive digital ordering system designed specifically for local kirana stores in India. It enables shop owners to create their digital presence with QR codes, allowing customers to browse products and place orders without downloading any app.

### 🎬 The Vision

Transform every local kirana store into a digital-ready business with minimal technical knowledge required. Our mission is to bridge the gap between traditional stores and modern e-commerce.

### 🌟 Why QRKirana?

- **No App Required**: Customers scan QR and order directly in browser
- **5-Minute Setup**: Register shop, add products, start receiving orders
- **Affordable**: Free tier available, premium at just ₹299/month
- **Local Focus**: Built specifically for Indian kirana stores
- **WhatsApp Integration**: Order notifications directly on WhatsApp

## ✨ Key Features

### 🏪 For Shop Owners
- **Quick Registration**: Sign up in minutes with mobile verification
- **Automatic QR Generation**: Unique QR code for your shop
- **Product Management**: Add, edit, delete products with ease
- **Order Dashboard**: Manage orders from pending to delivered
- **Customer Management**: Track repeat customers and their preferences
- **Analytics**: Sales insights and top-selling products
- **Loyalty Program**: Reward customers with points and discounts

### 🛍️ For Customers
- **Scan & Shop**: No app download, scan QR and start shopping
- **Product Catalog**: Browse products with prices and images
- **Smart Cart**: Add/remove items with live total calculation
- **Quick Checkout**: Simple order placement with minimal details
- **Order Tracking**: Know your order status in real-time

### 🔧 Technical Features
- **Progressive Web App**: Works on any smartphone browser
- **Offline Support**: Basic functionality works without internet
- **Real-time Updates**: Live order status and inventory sync
- **Secure Payments**: Multiple payment options (COD, UPI, Wallets)
- **WhatsApp Integration**: Automated order notifications

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or bun
- Git

### One-Click Setup
```bash
# Clone the repository
git clone https://github.com/jitenkr2030/QRKirana.git
cd QRKirana

# Install dependencies
bun install

# Setup database
bun run db:push

# Seed demo data (optional)
bunx tsx prisma/seed.ts

# Start development server
bun run dev
```

Visit `http://localhost:3000` to see QRKirana in action!

### Demo Credentials
- **Shop URL**: `http://localhost:3000/shop/sharma-kirana-store`
- **Login Mobile**: `9876543210` (any password)
- **Features**: 8 sample products across categories

## 🛠️ Installation

### 1. Clone & Setup
```bash
git clone https://github.com/jitenkr2030/QRKirana.git
cd QRKirana
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Install Dependencies
```bash
# Using bun (recommended)
bun install

# Or using npm
npm install
```

### 4. Database Setup
```bash
# Push schema to database
bun run db:push

# Generate Prisma client
bun run db:generate
```

### 5. Start Development
```bash
# Development server
bun run dev

# Production build
bun run build
bun start
```

## 📁 Project Structure

```
QRKirana/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Shop owner dashboard
│   │   └── shop/[uniqueUrl]/  # Customer-facing shop pages
│   ├── components/            # Reusable UI components
│   │   └── ui/               # shadcn/ui components
│   ├── lib/                   # Utility libraries
│   └── hooks/                 # Custom React hooks
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts              # Demo data seeding
├── public/                   # Static assets
└── docs/                     # Documentation
```

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL="file:./dev.db"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"

# Application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# WhatsApp API (optional)
WHATSAPP_API_KEY="your-whatsapp-api-key"
WHATSAPP_PHONE_NUMBER_ID="your-phone-id"
```

### Database Schema
The application uses Prisma with SQLite (development) and PostgreSQL (production).

Key models:
- **Shop**: Store information and subscription
- **Product**: Inventory management
- **Order**: Order processing and tracking
- **Customer**: Customer data and loyalty
- **LoyaltyPoint**: Rewards system

## 📱 User Guides

### For Shop Owners

#### 1. Register Your Shop
1. Visit `/auth/register`
2. Fill in shop details (name, address, category)
3. Verify mobile number
4. Get your unique QR code instantly

#### 2. Add Products
1. Login to dashboard
2. Go to Products tab
3. Click "Add Product"
4. Enter details (name, price, unit, category)
5. Upload product images (optional)

#### 3. Manage Orders
1. View new orders in dashboard
2. Accept/reject orders
3. Update order status (Preparing → Out for Delivery → Delivered)
4. Track revenue and analytics

### For Customers

#### 1. Place Order
1. Scan shop's QR code
2. Browse products
3. Add items to cart
4. Enter delivery details
5. Confirm order

#### 2. Track Order
- Receive WhatsApp updates
- Check order status online
- Contact shop directly

## 🔐 API Documentation

### Authentication
```bash
# Register shop
POST /api/auth/register
{
  "shopName": "My Store",
  "ownerName": "John Doe",
  "mobile": "9876543210",
  "address": "123 Main St",
  "category": "kirana"
}

# Login
POST /api/auth/login
{
  "mobile": "9876543210",
  "password": "password"
}
```

### Products
```bash
# Add product
POST /api/products
Headers: Authorization: Bearer <token>
{
  "name": "Product Name",
  "price": 100.00,
  "unit": "kg",
  "category": "grains"
}

# Get shop products
GET /api/shop/[uniqueUrl]
```

### Orders
```bash
# Create order
POST /api/orders
{
  "shopId": "shop_id",
  "customerName": "Jane Doe",
  "customerMobile": "9876543211",
  "items": [
    {
      "productId": "product_id",
      "quantity": 2,
      "price": 100.00,
      "total": 200.00
    }
  ],
  "totalAmount": 200.00
}

# Update order status
PUT /api/orders/[orderId]/status
{
  "status": "ACCEPTED"
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Process
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Write tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://prisma.io/) - Database toolkit
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Lucide](https://lucide.dev/) - Icon library

## 📞 Support

- 📧 Email: support@qrkirana.com
- 💬 WhatsApp: +91 98765 43210
- 📱 Help Center: [docs.qrkirana.com](https://docs.qrkirana.com)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/jitenkr2030/QRKirana/issues)

## 🗺️ Roadmap

### Version 2.0 (Coming Soon)
- [ ] Advanced analytics dashboard
- [ ] Customer loyalty program UI
- [ ] Multi-language support (Hindi, Bengali, Tamil)
- [ ] Delivery boy management
- [ ] Inventory predictions
- [ ] Digital payments integration

### Version 3.0 (Future)
- [ ] AI-powered product recommendations
- [ ] Voice ordering support
- [ ] Supplier integration
- [ ] Multi-store management
- [ ] White-label solution

---

<div align="center">

**Made with ❤️ for Indian Kirana Stores**

[⭐ Star this repo](https://github.com/jitenkr2030/QRKirana) • [🐛 Report Issue](https://github.com/jitenkr2030/QRKirana/issues) • [📧 Contact Us](mailto:support@qrkirana.com)

</div>