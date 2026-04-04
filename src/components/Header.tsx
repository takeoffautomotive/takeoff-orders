import React from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { ShoppingCart, LogOut } from 'lucide-react'

interface HeaderProps {
  session: Session
}

export const Header: React.FC<HeaderProps> = ({ session }) => {
  const handleSignOut = () => supabase.auth.signOut()

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50, padding: '12px 16px',
      borderBottom: '1px solid #2a2a2a',
      background: 'rgba(15, 15, 15, 0.95)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ maxWidth: 768, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #e63c2f, #ff6b35)',
          }}>
            <ShoppingCart size={15} color="#fff" />
          </div>
          <div>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>TakeOff Orders</span>
            <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 8 }}>99 Performance Auto</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#6b7280', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.user.email}
          </span>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af',
              fontSize: 12, padding: '6px 12px', borderRadius: 8,
              border: '1px solid #2e2e2e', background: 'transparent', cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#3a3a3a' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9ca3af'; (e.currentTarget as HTMLElement).style.borderColor = '#2e2e2e' }}
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}
