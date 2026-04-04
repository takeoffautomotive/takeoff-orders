import React from 'react'
import { CheckCircle, Package, Truck } from 'lucide-react'
import type { VendorQuote } from '../types'
import { formatCurrency } from '../utils/helpers'

interface VendorCardProps {
  quote: VendorQuote
  isCheapest: boolean
  isSelected: boolean
  onSelect: (vendorName: string) => void
  disabled: boolean
  orderCountry: string
}

export const VendorCard: React.FC<VendorCardProps> = ({
  quote, isCheapest, isSelected, onSelect, disabled, orderCountry
}) => {
  const hasStock = quote.has_stock
  const canShip = orderCountry !== 'US' || quote.ships_usa
  const isAvailable = hasStock && canShip
  const isClickable = isAvailable && !disabled

  let borderColor = '#2a2a2a'
  if (isSelected) borderColor = '#e63c2f'
  else if (isCheapest && isAvailable) borderColor = '#22c55e'

  return (
    <div
      onClick={() => isClickable && onSelect(quote.vendor_name)}
      style={{
        borderRadius: 16, border: `2px solid ${borderColor}`,
        background: '#1a1a1a', transition: 'border-color 0.15s',
        opacity: !isAvailable ? 0.4 : 1,
        cursor: isClickable ? 'pointer' : !isAvailable ? 'not-allowed' : 'default',
      }}
    >
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 700, color: '#fff', fontSize: 14, margin: 0 }}>{quote.vendor_name}</h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isCheapest && isAvailable && (
              <span style={{
                fontSize: 12, padding: '2px 8px', borderRadius: 999,
                background: 'rgba(34,197,94,0.15)', color: '#4ade80',
                border: '1px solid rgba(34,197,94,0.3)', fontWeight: 600,
              }}>Best Price</span>
            )}
            {!hasStock && (
              <span style={{
                fontSize: 12, padding: '2px 8px', borderRadius: 999,
                background: 'rgba(239,68,68,0.15)', color: '#f87171',
                border: '1px solid rgba(239,68,68,0.3)',
              }}>No Stock</span>
            )}
            {hasStock && !canShip && (
              <span style={{
                fontSize: 12, padding: '2px 8px', borderRadius: 999,
                background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.3)',
              }}>🍁 CA Only</span>
            )}
            {isSelected && <CheckCircle size={16} color="#e63c2f" />}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af' }}>
              <Package size={13} /> Product Cost
            </span>
            <span style={{ color: '#fff' }}>{formatCurrency(quote.product_cost)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af' }}>
              <Truck size={13} /> Shipping
              {quote.vendor_name === 'CLTW' && (
                <span style={{ fontSize: 11, color: '#6b7280' }}>(est.)</span>
              )}
            </span>
            <span style={{ color: '#fff' }}>{formatCurrency(quote.shipping_cost)}</span>
          </div>
          <div style={{ height: 1, background: '#2a2a2a', margin: '2px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
            <span style={{ color: '#d1d5db' }}>Total Landed</span>
            <span style={{ color: isCheapest && isAvailable ? '#4ade80' : '#fff' }}>
              {formatCurrency(quote.total_cost)}
            </span>
          </div>
          {hasStock && canShip && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Stock: {quote.stock_qty} units</div>
          )}
          {hasStock && !canShip && (
            <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>⚠️ Meyer does not ship to USA — CA orders only</div>
          )}
        </div>
      </div>
    </div>
  )
}
