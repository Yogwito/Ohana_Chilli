/**
 * Traduce el error de create_order_with_items a un mensaje para el cliente.
 * La RPC ya responde en español; aquí se agregan instrucciones para los casos
 * más comunes y se quita el detalle técnico.
 */
export function describeOrderError(message?: string | null): string {
  const raw = (message ?? '').trim();
  if (!raw) return 'No pudimos crear el pedido. Intenta nuevamente.';
  if (/(Precio|Total) no coincide/i.test(raw)) {
    return 'Los precios de tu carrito cambiaron. Recarga la página, revisa tu pedido y envíalo de nuevo.';
  }
  if (/CERRADO/i.test(raw)) return 'En este momento estamos cerrados. Revisa nuestro horario e inténtalo más tarde.';
  if (/Tarifa de domicilio|Zona de entrega/i.test(raw)) {
    return 'La zona de domicilio cambió. Selecciónala de nuevo para actualizar el costo.';
  }
  if (/no disponible|Recargo de bowl|excede el tamaño|Falta seleccionar/i.test(raw)) {
    return `${raw}. Quita ese producto del carrito o vuelve a armarlo.`;
  }
  return raw;
}
