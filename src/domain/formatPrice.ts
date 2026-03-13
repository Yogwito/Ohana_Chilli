export function formatPrice(price: number): string {
  // `price` is always an integer peso value, never real cents.
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price);
}
