import React from 'react'
import { ChevronRight, Clock, CheckCircle, XCircle, Package } from 'lucide-react'
import type { OrderWithVendors } from '../types'
import { formatCurrency, formatDate } from '../utils/helpers'

interface OrderListProps {
  orders: OrderWithVendors[]
  onSelect: (order: OrderWithVendors) => void
  emptyMessage: string
}

export const OrderList: React.FC<OrderListProps> = ({ orders, onSelect, emptyMessage }) => {
  if (orders.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
        <CheckCircle size={40} color="#374151" />
        <p style={{ color: '#6b7280', fontSize: 14 }}>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {orders.map(order => {
        const availableVendors = order.vendors.filter(v => v.has_stock)
        const cheapest = availableVendors.length > 0
          ? availableVendors.reduce((a, b) => a.total_cost < b.total_cost ? a : b)
          : null
        const isCA = order.destination_country === 'CA'

        return (
          <div
            key={order.id}
            onClick={() => onSelect(order)}
            style={{
              borderRadius: 16, border: '1px solid #2a2a2a', cursor: 'pointer',
              background: '#1a1a1a', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3a3a3a' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a' }}
          >
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {order.status === 'pending' && <Clock size={14} color="#f59e0b" style={{ flexShrink: 0 }} />}
                    {order.status === 'approved' && <CheckCircle size={14} color="#22c55e" style={{ flexShrink: 0 }} />}
                    {order.status === 'rejected' && <XCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />}
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.product_name}
                    </span>
                    {isCA && (
                      <span style={{
                        fontSize: 11, padding: '2px 6px', borderRadius: 6,
                        background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.2)', flexShrink: 0,
                      }}>🍁 CA</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{order.amazon_order_id}</span>
                    <span>{order.part_number}</span>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {order.customer_name} — {order.customer_address.split(',').slice(-2).join(',')}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Amazon Sale</span>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
                    {formatCurrency(order.amazon_price * order.quantity)}
                  </span>
                  <ChevronRight size={14} color="#4b5563" />
                </div>
              </div>

              {/* Vendor grid */}
              {order.vendors.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {order.vendors.map(v => {
                    const hasStock = v.has_stock
                    const isBest = cheapest?.vendor_name === v.vendor_name && hasStock
                    const isMeyerDisabled = v.vendor_name === 'Meyer' && order.destination_country === 'US'
                    return (
                      <div
                        key={v.vendor_name}
                        style={{
                          borderRadius: 12, padding: 10, textAlign: 'center', border: '1px solid',
                          borderColor: isBest ? 'rgba(34,197,94,0.4)' : '#2e2e2e',
                          background: isBest ? 'rgba(34,197,94,0.08)' : (!hasStock || isMeyerDisabled ? 'transparent' : '#242424'),
                          opacity: (!hasStock || isMeyerDisabled) ? 0.4 : 1,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.vendor_name}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: isBest ? '#4ade80' : '#fff' }}>
                          {formatCurrency(v.total_cost)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 }}>
                          {isMeyerDisabled ? (
                            <span style={{ fontSize: 11, color: '#f59e0b' }}>🍁 CA Only</span>
                          ) : hasStock ? (
                            <>
                              <Package size={9} color="#6b7280" />
                              <span style={{ fontSize: 11, color: '#6b7280' }}>{v.stock_qty}</span>
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: '#f87171' }}>No Stock</span>
                          )}
                        </div>
                        {isBest && <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 600, marginTop: 2 }}>✓ Best</div>}
                      </div>
                    )
                  })}
                </div>
              )}

              {order.status === 'approved' && order.selected_vendor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4ade80' }}>
                  <CheckCircle size={12} />
                  PO sent to {order.selected_vendor}
                  {order.profit !== null && (
                    <span style={{ marginLeft: 'auto', color: '#4ade80', fontWeight: 600 }}>
                      +{formatCurrency(order.profit)} profit
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
