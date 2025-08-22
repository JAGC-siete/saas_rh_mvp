const fs = require('fs')
const path = require('path')
const emojiRegex = require('emoji-regex')

const rx = emojiRegex()
const list = (process.env.LINT_STAGED || '').split(' ').filter(Boolean)
const bad = []
for (const f of list) {
  const p = path.resolve(process.cwd(), f)
  if (fs.existsSync(p)) {
    const text = fs.readFileSync(p, 'utf8')
    if (rx.test(text)) bad.push(f)
  }
}
if (bad.length) {
  console.error('Emojis encontrados en:', bad.join(', '))
  process.exit(1)
}

