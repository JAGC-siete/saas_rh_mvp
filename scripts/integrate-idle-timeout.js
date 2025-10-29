#!/usr/bin/env node
/**
 * Script to integrate idle timeout middleware in all protected APIs
 * This script wraps all API handlers with withIdleTimeout middleware
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// APIs that should NOT have idle timeout (public/debug)
const EXCLUDE_PATTERNS = [
  '**/auth/login*.ts',
  '**/auth/register*.ts',
  '**/auth/create-profile*.ts',
  '**/auth/fix-user-creation.ts',
  '**/health.ts',
  '**/env.ts',
  '**/railway-env-check.ts',
  '**/demo/**',
  '**/trial/**',
  '**/debug/**',
  '**/attendance/register.ts',
  '**/attendance/lookup.ts',
  '**/employees/invitations/**',
  '**/cron/**',
  '**/activar.ts'
]

// APIs that already have middleware applied
const ALREADY_DONE = [
  'pages/api/admin/users.ts'
]

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => {
    const regex = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
    return new RegExp(regex).test(filePath)
  })
}

function shouldSkip(filePath) {
  return ALREADY_DONE.some(done => filePath.includes(done))
}

function needsMiddleware(filePath, content) {
  // Check if it already has withIdleTimeout
  if (content.includes('withIdleTimeout')) return false
  
  // Check if it has auth checks
  if (!content.includes('auth.getUser') && !content.includes('authenticateUser')) {
    return false
  }
  
  return true
}

function wrapHandler(filePath, content) {
  const fileName = path.basename(filePath)
  
  // Change export default to async function handler
  if (content.includes('export default async function handler')) {
    content = content.replace(
      'export default async function handler',
      'async function handler'
    )
  } else if (content.includes('export default function handler')) {
    content = content.replace(
      'export default function handler',
      'async function handler'
    )
  }
  
  // Add import if not present
  if (!content.includes('from \'../../lib/middleware/idle-timeout\'')) {
    const relativePath = getRelativePath(filePath)
    content = content.replace(
      /^(import.*from.*['"][^'"]+['"];?\n)+/gm,
      (match) => {
        return match + `import { withIdleTimeout } from '${relativePath}'\n`
      }
    )
  }
  
  // Add export wrapper at the end
  if (!content.includes('// Export handler wrapped with idle timeout middleware')) {
    content += `\n\n// Export handler wrapped with idle timeout middleware\nexport default withIdleTimeout(handler, {\n  idleTimeoutMinutes: 90\n})\n`
  }
  
  return content
}

function getRelativePath(filePath) {
  // Calculate relative path from file to lib/middleware/idle-timeout
  const depth = filePath.split('/').length - 2 // pages/api/file.ts = depth 2
  const relativePath = '../'.repeat(depth) + 'lib/middleware/idle-timeout'
  return relativePath
}

function processFile(filePath) {
  if (shouldExclude(filePath)) {
    console.log(`⏭️  Skipping excluded: ${filePath}`)
    return false
  }
  
  if (shouldSkip(filePath)) {
    console.log(`⏭️  Already done: ${filePath}`)
    return false
  }
  
  const content = fs.readFileSync(filePath, 'utf8')
  
  if (!needsMiddleware(filePath, content)) {
    console.log(`ℹ️  No auth check found: ${filePath}`)
    return false
  }
  
  try {
    const newContent = wrapHandler(filePath, content)
    fs.writeFileSync(filePath, newContent)
    console.log(`✅ Updated: ${filePath}`)
    return true
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    return false
  }
}

function main() {
  console.log('🔍 Finding API files...\n')
  
  const apiFiles = glob.sync('pages/api/**/*.ts', {
    ignore: ['**/node_modules/**', '**/.next/**']
  })
  
  console.log(`Found ${apiFiles.length} API files\n`)
  
  let updated = 0
  let skipped = 0
  
  for (const file of apiFiles) {
    const result = processFile(file)
    if (result === true) updated++
    if (result === false) skipped++
  }
  
  console.log(`\n✨ Done! Updated ${updated} files, skipped ${skipped}`)
}

// Run if executed directly
if (require.main === module) {
  main()
}

module.exports = { wrapHandler, processFile }
