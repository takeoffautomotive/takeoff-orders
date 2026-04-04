import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Login } from './components/Login'
import { Header } from './components/Header'
import { OrderList } from './components/OrderList'
import { OrderDetail } from './components/OrderDetail'
import type { OrderWithVendors } from './types'
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

type Tab = 'pending' | 'approved' | 'rejected'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pending')
  const [orders, setOrders] = useState<OrderWithVendors[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithVendors | null>(null)

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadOrders = useCallback(async (status: Tab) => {
    setOrdersLoading(true)
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) throw error

      const ordersWithVendors: OrderWithVendors[] = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: vendors } = await supabase
            .from('order_vendors')
            .select('*')
            .eq('order_id', order.id)
            .order('total_cost', { ascending: true })
          return { ...order, vendors: vendors || [] }
        })
      )

      setOrders(ordersWithVendors)

      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      setPendingCount(count || 0)
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) loadOrders(tab)
  }, [session, tab, loadOrders])

  const handleApprove = async (orderId: number, vendorName: string, vendorCost: number) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    const revenue = order.amazon_price * order.quantity
    const referralFee = order.referral_fee || 0
    const profit = revenue - referralFee - vendorCost

    await supabase
      .from('orders')
      .update({
        status: 'approved',
        selected_vendor: vendorName,
        selected_vendor_cost: vendorCost,
        profit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    setSelectedOrder(null)
    await loadOrders(tab)
  }

  const handleReject = async (orderId: number) => {
    await supabase
      .from('orders')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', orderId)
    setSelectedOrder(null)
    await loadOrders(tab)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f0f' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #e63c2f', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!session) {
    return <Login onLogin={() => {}} />
  }

  if (selectedOrder) {
    const liveOrder = orders.find(o => o.id === selectedOrder.id) || selectedOrder
    return (
      <div className="min-h-screen" style={{ background: '#0f0f0f' }}>
        <Header session={session} />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
          <OrderDetail
            order={liveOrder}
            onBack={() => setSelectedOrder(null)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'pending' as Tab, label: 'Pending', icon: Clock, count: pendingCount },
    { id: 'approved' as Tab, label: 'Approved', icon: CheckCircle },
    { id: 'rejected' as Tab, label: 'Rejected', icon: XCircle },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', flexDirection: 'column' }}>
      <Header session={session} />

      <div style={{ maxWidth: 768, margin: '0 auto', width: '100%', padding: '24px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24, background: '#1a1a1a', padding: 4, borderRadius: 12, border: '1px solid #2e2e2e' }}>
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: tab === id ? '#e63c2f' : 'transparent',
                color: tab === id ? '#fff' : '#9ca3af',
              }}
            >
              <Icon size={14} />
              {label}
              {count !== undefined && count > 0 && (
                <span style={{
                  padding: '2px 6px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: tab === id ? 'rgba(255,255,255,0.2)' : 'rgba(245,158,11,0.2)',
                  color: tab === id ? '#fff' : '#f59e0b',
                }}>{count}</span>
              )}
            </button>
          ))}
          <button
            onClick={() => loadOrders(tab)}
            style={{ padding: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', borderRadius: 8 }}
          >
            <RefreshCw size={14} style={{ animation: ordersLoading ? 'spin 0.8s linear infinite' : 'none' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </button>
        </div>

        {/* Orders */}
        {ordersLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #e63c2f', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <OrderList
            orders={orders}
            onSelect={setSelectedOrder}
            emptyMessage={
              tab === 'pending' ? 'No pending orders — all clear! 🎉' :
              tab === 'approved' ? 'No approved orders yet' :
              'No rejected orders'
            }
          />
        )}
      </div>
    </div>
  )
}
