const ADJECTIVES = ['ngon', 'xanh', 'do', 'vang', 'moi', 'ngot', 'lanh', 'dep', 'vui', 'hot']
const NOUNS = ['tra', 'sua', 'che', 'ca-phe', 'nuoc', 'cup', 'team', 'party', 'boom', 'mix']

/**
 * Generate a human-readable slug like "tra-sua-3x7k"
 */
export function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const rand = Math.random().toString(36).substring(2, 6)
  return `${adj}-${noun}-${rand}`
}
