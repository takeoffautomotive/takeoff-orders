import React, { useState } from 'react'
import { ArrowLeft, CheckCircle, XCircle, MapPin, Tag, Hash, Globe } from 'lucide-react'
import type { OrderWithVendors } from '../types'
import { VendorCard } from './VendorCard'
import { formatCurrency, formatDate, getProfitColor } from '../utils/helpers'

interface OrderDetailProps {
  order: OrderWithVendors
  onBack: () => void
  onApprove: (orderId: number, vendorName: string, vendorCost: number) => void
  onReject: (orderId: number) => void
}

export const OrderDetail: React.FC<OrderDetailProps> = ({ order, onBack, onApprove, onReject }) => {
  const isUSOrder = order.destination_country === 'US'

  const availableVendors = order.vendors.filter(v => v.has_stock && (order.destination_country !== 'US' || v.ships_usa))
  const cheapestVendor = availableVendors.length > 0
    ? availableVendors.reduce((a, b) => a.total_cost < b.total_cost ? a : b)
    : null

  const [selectedVendor, setSelectedVendor] = useState<string>(
    order.selected_vendor || cheapestVendor?.vendor_name || ''
  )

  const selectedQuote = order.vendors.find(v => v.vendor_name === selectedVendor)
  const revenue = order.amazon_price * order.quantity
  const referralFee = order.referral_fee || 0
  const referralPct = revenue > 0 ? ((referralFee / revenue) * 100).toFixed(1) : '0'
  const profit = selectedQuote ? revenue - referralFee - selectedQuote.total_cost : null
  const profitPct = profit !== null ? (profit / revenue) * 100 : null
  const isPending = order.status === 'pending'

  const statusStyle: Record<string, React.CSSProperties> = {
    pending: { color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' },
    approved: { color: '#4ade80', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' },
    rejected: { color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' },
  }

  const profitColorMap: Record<string, string> = {
    'text-green-400': '#4ade80',
    'text-amber-400': '#f59e0b',
    'text-red-400': '#f87171',
    'text-gray-400': '#9ca3af',
  }

  const profitColorClass = getProfitColor(profit)
  const profitColorHex = profitColorMap[profitColorClass] || '#9ca3af'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Back + Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af',
            fontSize: 14, padding: '6px 12px', borderRadius: 8,
            border: '1px solid #2e2e2e', background: 'transparent', cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9ca3af' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, fontWeight: 600, ...statusStyle[order.status] }}>
          {order.status.toUpperCase()}
        </span>
        <span style={{
          fontSize: 12, padding: '4px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4,
          ...(isUSOrder
            ? { color: '#60a5fa', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)' }
            : { color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }
          ),
        }}>
          <Globe size={11} />
          {isUSOrder ? '🇺🇸 USA' : '🍁 Canada'}
        </span>
      </div>

      {/* Order Summary Card */}
      <div style={{ borderRadius: 16, border: '1px solid #2a2a2a', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: '#1a1a1a' }}>
        <h2 style={{ fontWeight: 700, color: '#fff', margin: 0, fontSize: 16 }}>{order.product_name}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
          {[
            { icon: Hash, label: 'Amazon Order', value: order.amazon_order_id, mono: true },
            { icon: Tag, label: 'Part #', value: order.part_number },
            { icon: Tag, label: 'ASIN', value: order.asin, mono: true },
            { icon: MapPin, label: 'Ship To', value: order.customer_address },
          ].map(({ icon: Icon, label, value, mono }) => (
            <React.Fragment key={label}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280' }}>
                <Icon size={12} /> {label}
              </span>
              <span style={{ color: '#d1d5db', fontSize: 12, fontFamily: mono ? 'monospace' : undefined }}>{value}</span>
            </React.Fragment>
          ))}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 12px', borderRadius: 12, background: '#242424', marginTop: 4,
        }}>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>Amazon Sale Price</span>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
            {formatCurrency(order.amazon_price)} × {order.quantity} = {formatCurrency(revenue)}
          </span>
        </div>
      </div>

      {/* Vendor Comparison */}
      <div>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 0 }}>
          {isPending ? 'Select Vendor' : 'Vendor Used'}
        </h3>
        {isUSOrder && (
          <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 8, marginTop: 0 }}>
            🇺🇸 US order — Meyer (CA only) is not available for this shipment
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {order.vendors.map(quote => (
            <VendorCard
              key={quote.vendor_name}
              quote={quote}
              isCheapest={cheapestVendor?.vendor_name === quote.vendor_name}
              isSelected={selectedVendor === quote.vendor_name}
              onSelect={setSelectedVendor}
              disabled={!isPending}
              orderCountry={order.destination_country}
            />
          ))}
        </div>
      </div>

      {/* Profit Breakdown */}
      {selectedQuote && (
        <div style={{ borderRadius: 16, border: '1px solid #2a2a2a', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, background: '#1a1a1a' }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Profit Breakdown
          </h3>

          {[
            { label: `Amazon Revenue (${order.quantity}× ${formatCurrency(order.amazon_price)})`, value: `+ ${formatCurrency(revenue)}`, color: '#4ade80' },
            { label: `Amazon Referral Fee (${referralPct}% · via SP-API)`, value: `− ${formatCurrency(referralFee)}`, color: '#f87171' },
            { label: `Vendor Product Cost (${selectedQuote.vendor_name})`, value: `− ${formatCurrency(selectedQuote.product_cost)}`, color: '#f87171' },
            { label: `Shipping${selectedQuote.vendor_name === 'CLTW' ? ' (est. — confirmed after PO)' : ''}`, value: `− ${formatCurrency(selectedQuote.shipping_cost)}`, color: '#f87171' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
              <span style={{ color: '#9ca3af' }}>{label}</span>
              <span style={{ color }}>{value}</span>
            </div>
          ))}

          <div style={{ height: 1, background: '#2a2a2a', margin: '4px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 16 }}>
            <span style={{ color: '#fff' }}>Net Profit</span>
            <span style={{ color: profitColorHex }}>
              {formatCurrency(profit)}{profitPct !== null ? ` (${profitPct.toFixed(1)}%)` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button
            onClick={() => onReject(order.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: 12, borderRadius: 12, border: '1px solid rgba(239,68,68,0.4)',
              color: '#f87171', fontSize: 14, fontWeight: 600, background: 'transparent', cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <XCircle size={16} /> Reject
          </button>
          <button
            onClick={() => selectedQuote && onApprove(order.id, selectedVendor, selectedQuote.total_cost)}
            disabled={!selectedVendor || !selectedQuote}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: 12, borderRadius: 12, border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 600,
              background: selectedVendor && selectedQuote ? 'linear-gradient(135deg, #e63c2f, #ff6b35)' : '#2a2a2a',
              cursor: selectedVendor && selectedQuote ? 'pointer' : 'not-allowed',
              opacity: selectedVendor && selectedQuote ? 1 : 0.5,
            }}
          >
            <CheckCircle size={16} /> Approve & Send PO
          </button>
        </div>
      )}

      {!isPending && (
        <div style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', padding: '8px 0' }}>
          {order.status === 'approved' ? `✅ Approved — PO sent to ${order.selected_vendor}` : '❌ Order rejected'}
          <br /><span style={{ fontSize: 12 }}>{formatDate(order.updated_at)}</span>
        </div>
      )}
    </div>
  )
}
