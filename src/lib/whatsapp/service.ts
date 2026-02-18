interface WhatsAppMessage {
  to: string
  message: string
  type?: 'text' | 'order_notification' | 'order_update'
}

interface OrderNotificationData {
  customerName: string
  customerMobile: string
  orderNumber: string
  totalAmount: number
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  deliveryType: string
  shopName: string
  shopMobile: string
}

class WhatsAppService {
  private apiKey: string
  private phoneNumberId: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.WHATSAPP_API_KEY || ''
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
    this.baseUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0'
  }

  private isConfigured(): boolean {
    return !!(this.apiKey && this.phoneNumberId)
  }

  async sendOrderNotification(data: OrderNotificationData): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('WhatsApp API not configured. Skipping notification.')
      return false
    }

    try {
      const message = this.formatOrderMessage(data)
      return await this.sendMessage({
        to: data.shopMobile,
        message,
        type: 'order_notification'
      })
    } catch (error) {
      console.error('Failed to send WhatsApp order notification:', error)
      return false
    }
  }

  async sendOrderUpdate(
    customerMobile: string, 
    orderNumber: string, 
    status: string,
    shopName: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('WhatsApp API not configured. Skipping notification.')
      return false
    }

    try {
      const message = this.formatOrderUpdateMessage(orderNumber, status, shopName)
      return await this.sendMessage({
        to: customerMobile,
        message,
        type: 'order_update'
      })
    } catch (error) {
      console.error('Failed to send WhatsApp order update:', error)
      return false
    }
  }

  private async sendMessage(whatsappMessage: WhatsAppMessage): Promise<boolean> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: whatsappMessage.to.replace(/[^\d]/g, ''), // Remove non-digits
        type: 'template',
        template: {
          name: whatsappMessage.type || 'text_message',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: whatsappMessage.message
                }
              ]
            }
          ]
        }
      }

      const response = await fetch(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`WhatsApp API error: ${error.error?.message || 'Unknown error'}`)
      }

      const result = await response.json()
      console.log('WhatsApp message sent successfully:', result)
      return true

    } catch (error) {
      console.error('WhatsApp API error:', error)
      return false
    }
  }

  private formatOrderMessage(data: OrderNotificationData): string {
    const itemsList = data.items
      .map(item => `• ${item.name} x${item.quantity} = ₹${item.price * item.quantity}`)
      .join('\n')

    return `🛒 *NEW ORDER RECEIVED* 🛒

📦 *Order #${data.orderNumber}*
👤 *Customer:* ${data.customerName}
📱 *Mobile:* ${data.customerMobile}
💰 *Total:* ₹${data.totalAmount}
🚚 *Delivery:* ${data.deliveryType === 'delivery' ? 'Home Delivery' : 'Store Pickup'}

*Order Items:*
${itemsList}

⏰ *Time:* ${new Date().toLocaleString('en-IN', { 
  timeZone: 'Asia/Kolkata',
  dateStyle: 'medium',
  timeStyle: 'short'
  })}

📞 *Contact Customer:* ${data.customerMobile}

Please check your dashboard for more details.`
  }

  private formatOrderUpdateMessage(
    orderNumber: string, 
    status: string, 
    shopName: string
  ): string {
    const statusEmojis = {
      'PENDING': '⏳',
      'ACCEPTED': '✅',
      'REJECTED': '❌',
      'PREPARING': '👨‍🍳',
      'OUT_FOR_DELIVERY': '🚚',
      'DELIVERED': '🎉',
      'CANCELLED': '🚫'
    }

    const statusMessages = {
      'PENDING': 'Your order is pending confirmation',
      'ACCEPTED': 'Your order has been accepted and is being prepared',
      'REJECTED': 'Unfortunately, your order could not be fulfilled',
      'PREPARING': 'Your order is being prepared with care',
      'OUT_FOR_DELIVERY': 'Your order is on the way!',
      'DELIVERED': 'Your order has been delivered successfully',
      'CANCELLED': 'Your order has been cancelled'
    }

    const emoji = statusEmojis[status as keyof typeof statusEmojis] || '📦'
    const message = statusMessages[status as keyof typeof statusMessages] || 'Your order status has been updated'

    return `${emoji} *Order Update - ${shopName}*

📦 *Order #${orderNumber}*
🔄 *Status:* ${status.replace('_', ' ').toUpperCase()}

${message}

Thank you for choosing ${shopName}! 🙏

For any queries, please contact us.`
  }

  // Fallback method for development/testing - logs to console
  async sendNotification(data: OrderNotificationData | {
    customerMobile: string
    orderNumber: string
    status: string
    shopName: string
  }, type: 'order' | 'update' = 'order'): Promise<boolean> {
    // In development, just log the message
    if (process.env.NODE_ENV === 'development') {
      if (type === 'order') {
        console.log('📱 WhatsApp Order Notification:', this.formatOrderMessage(data as OrderNotificationData))
      } else {
        const updateData = data as any
        console.log('📱 WhatsApp Update Notification:', 
          this.formatOrderUpdateMessage(updateData.orderNumber, updateData.status, updateData.shopName))
      }
      return true
    }

    // In production, try to send actual WhatsApp message
    if (type === 'order') {
      return await this.sendOrderNotification(data as OrderNotificationData)
    } else {
      const updateData = data as any
      return await this.sendOrderUpdate(updateData.customerMobile, updateData.orderNumber, updateData.status, updateData.shopName)
    }
  }
}

export const whatsappService = new WhatsAppService()