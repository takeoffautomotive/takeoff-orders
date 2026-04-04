export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getProfitColor(profit: number | null): string {
  if (profit === null) return 'text-gray-400'
  if (profit > 20) return 'text-green-400'
  if (profit > 0) return 'text-amber-400'
  return 'text-red-400'
}
