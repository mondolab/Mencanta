export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function uniqueSlug(
  db: { prepare: (sql: string) => { bind: (...p: unknown[]) => { first: <T>() => Promise<T | null> } } },
  table: 'products' | 'categories',
  base: string,
  excludeId?: number,
): Promise<string> {
  let slug = slugify(base) || 'item'
  let candidate = slug
  let i = 2
  for (;;) {
    const query = `SELECT id FROM ${table} WHERE slug = ? AND (? IS NULL OR id != ?) LIMIT 1`
    const existing = await db.prepare(query).bind(candidate, excludeId ?? null, excludeId ?? 0).first<{ id: number }>()
    if (!existing) return candidate
    candidate = `${slug}-${i}`
    i += 1
  }
}