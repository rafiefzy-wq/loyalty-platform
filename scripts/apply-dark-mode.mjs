// One-shot script: applies dark: variants to dashboard client pages.
// Idempotent — skips classes that already have a sibling dark: utility.
import fs from 'node:fs'

const files = [
  'app/(dashboard)/dashboard/analytics/analytics-client.tsx',
  'app/(dashboard)/dashboard/design/card-design-client.tsx',
  'app/(dashboard)/dashboard/settings/settings-client.tsx',
  'app/(dashboard)/dashboard/team/team-client.tsx',
  'app/(dashboard)/dashboard/broadcast/page.tsx',
]

const mappings = [
  ['text-gray-900', 'text-gray-900 dark:text-gray-100'],
  ['text-gray-800', 'text-gray-800 dark:text-gray-200'],
  ['text-gray-700', 'text-gray-700 dark:text-gray-300'],
  ['text-gray-600', 'text-gray-600 dark:text-gray-400'],
  ['text-gray-500', 'text-gray-500 dark:text-gray-400'],
  ['text-gray-400', 'text-gray-400 dark:text-gray-500'],
  ['border-gray-200', 'border-gray-200 dark:border-gray-800'],
  ['border-gray-100', 'border-gray-100 dark:border-gray-800'],
  ['bg-white', 'bg-white dark:bg-[#16161e]'],
  ['bg-gray-50', 'bg-gray-50 dark:bg-gray-900/40'],
  ['bg-gray-100', 'bg-gray-100 dark:bg-gray-800'],
  ['divide-gray-100', 'divide-gray-100 dark:divide-gray-800'],
  ['divide-gray-50', 'divide-gray-50 dark:divide-gray-800'],
  ['hover:bg-gray-50', 'hover:bg-gray-50 dark:hover:bg-gray-800/50'],
  ['hover:bg-gray-100', 'hover:bg-gray-100 dark:hover:bg-gray-800'],
]

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  let changes = 0
  for (const [plain, dark] of mappings) {
    // Match the plain class as a whole word, but only if not already followed by " dark:"
    // Look-ahead avoids re-applying when the variant was already added previously.
    const re = new RegExp(`(?<![\\w/-])${escapeRe(plain)}(?![\\w/-])(?!\\s+dark:)`, 'g')
    const before = content
    content = content.replace(re, dark)
    if (content !== before) {
      const matches = before.match(re)
      if (matches) changes += matches.length
    }
  }
  fs.writeFileSync(file, content)
  console.log(`${file}: ${changes} replacements`)
}
