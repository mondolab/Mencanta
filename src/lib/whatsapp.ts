export const DEFAULT_WHATSAPP = '5493434056155'

function cleanNumber(number: string): string {
  return number.replace(/\D/g, '')
}

export function buildWaLink(number: string, message: string): string {
  const n = cleanNumber(number) || DEFAULT_WHATSAPP
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`
}

/** "Hola M' encanta, ..." mensaje de contacto genérico */
export function contactarWhatsApp(number: string, businessName = "M' encanta"): string {
  return buildWaLink(number, `Hola ${businessName}, quería hacerles una consulta.`)
}

/** Consulta sobre un producto específico */
export function consultarProductoWhatsApp(number: string, productName: string, variant = '', businessName = "M' encanta"): string {
  const detail = variant ? ` (${variant})` : ''
  return buildWaLink(
    number,
    `Hola ${businessName}, quería consultar por el producto ${productName}${detail}. ¿Tienen disponibilidad?`,
  )
}

/** Mensaje de pedido generado desde el carrito (formato del enunciado) */
export function enviarPedidoWhatsApp(
  number: string,
  items: { name: string; variant: string; quantity: number }[],
  totalCents: number,
  deliveryNote: string,
): string {
  const lines = items
    .map((i) => `${i.name}${i.variant ? ` (${i.variant})` : ''} x ${i.quantity}`)
    .join('\n')
  const total = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(totalCents / 100)

  const message = `Hola M' encanta, quiero realizar el siguiente pedido:\n\n${lines}\n\nTotal estimado: ${total}\n\n${deliveryNote}\n\nQuisiera consultar disponibilidad y coordinar el pago y la entrega.`
  return buildWaLink(number, message)
}