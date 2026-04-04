export type OrderStatus = 'pending' | 'approved' | 'rejected'

export interface VendorQuote {
  id: number
  order_id: number
  vendor_name: string
  product_cost: number
  shipping_cost: number
  total_cost: number
  has_stock: boolean
  stock_qty: number
  ships_usa: boolean
}

export interface Order {
  id: number
  amazon_order_id: string
  customer_name: string
  customer_address: string
  destination_country: string
  asin: string
  part_number: string
  product_name: string
  quantity: number
  amazon_price: number
  referral_fee: number
  status: OrderStatus
  selected_vendor: string | null
  selected_vendor_cost: number | null
  profit: number | null
  created_at: string
  updated_at: string
}

export interface OrderWithVendors extends Order {
  vendors: VendorQuote[]
}
