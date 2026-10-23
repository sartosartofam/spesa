interface ParsedQuantity {
  amount: number
  unit: string
}

const QUANTITY_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(.*)$/

function parseQuantity(value: string): ParsedQuantity | null {
  const match = QUANTITY_PATTERN.exec(value.trim())
  if (!match) return null
  const amount = Number(match[1]?.replace(',', '.'))
  if (!Number.isFinite(amount)) return null
  return { amount, unit: match[2]?.trim() ?? '' }
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(amount).replace('.', ',')
}

/**
 * Somma due quantità testuali quando hanno la stessa unità ("2 pacchi" + "3 pacchi").
 * Se le unità non coincidono, o il testo non è numerico, le tiene entrambe.
 */
export function mergeQuantities(first: string | null, second: string | null): string | null {
  const a = first?.trim()
  const b = second?.trim()
  if (!a && !b) return '2'
  if (!a) return b || null
  if (!b) {
    const parsedA = parseQuantity(a)
    if (parsedA && parsedA.unit === '' && Number.isInteger(parsedA.amount)) {
      return formatAmount(parsedA.amount + 1)
    }
    return a
  }

  const parsedA = parseQuantity(a)
  const parsedB = parseQuantity(b)
  if (parsedA && parsedB && parsedA.unit.toLowerCase() === parsedB.unit.toLowerCase()) {
    const unit = parsedA.unit || parsedB.unit
    return `${formatAmount(parsedA.amount + parsedB.amount)}${unit ? ` ${unit}` : ''}`
  }

  if (a.toLowerCase() === b.toLowerCase()) return a
  return `${a} + ${b}`
}
