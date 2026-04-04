import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ShoppingCart, Loader2, AlertCircle } from 'lucide-react'

interface LoginProps {
  onLogin: () => void
}

export const Login: React.FC<LoginProps> = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', position: 'relative' }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(230, 60, 47, 0.12) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: 360, position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, background: 'linear-gradient(135deg, #e63c2f, #ff6b35)',
            boxShadow: '0 8px 32px rgba(230,60,47,0.3)',
          }}>
            <ShoppingCart size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>TakeOff Orders</h1>
          <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 4 }}>Admin Dashboard — Sign in to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', padding: '12px 16px', borderRadius: 12, fontSize: 14,
            }}>
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@takeoffcorp.com"
              required
              style={{
                width: '100%', background: '#1a1a1a', border: '1px solid #2e2e2e',
                color: '#fff', borderRadius: 12, padding: '12px 16px', fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#e63c2f')}
              onBlur={e => (e.target.style.borderColor = '#2e2e2e')}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', background: '#1a1a1a', border: '1px solid #2e2e2e',
                color: '#fff', borderRadius: 12, padding: '12px 16px', fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = '#e63c2f')}
              onBlur={e => (e.target.style.borderColor = '#2e2e2e')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, fontWeight: 600,
              color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #e63c2f, #ff6b35)', marginTop: 8,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 12, marginTop: 32 }}>
          99 Performance Auto × TakeOff Automotive
        </p>
      </div>
    </div>
  )
}
