export const eur = new Intl.NumberFormat('de-AT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2
})

export function euro(n) {
  if (n == null || isNaN(n)) return '—'
  return eur.format(n)
}

export function nr(n, digits = 0) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('de-AT', { maximumFractionDigits: digits }).format(n)
}
