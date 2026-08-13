/**
 * Run: npx tsx --test tests/fetch-attendance-report-data.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('fetch-attendance-report-data', () => {
  it('uses admin client for export queries', () => {
    const src = readFileSync(
      join(process.cwd(), 'lib/reports/fetch-attendance-report-data.ts'),
      'utf8'
    )
    assert.match(src, /createAdminClient\(\)/)
    assert.match(src, /\.eq\('company_id', companyId\)/)
  })

  it('export-attendance and export.ts use shared fetch helper', () => {
    const exportAttendance = readFileSync(
      join(process.cwd(), 'pages/api/reports/export-attendance.ts'),
      'utf8'
    )
    const exportMain = readFileSync(join(process.cwd(), 'pages/api/reports/export.ts'), 'utf8')
    assert.match(exportAttendance, /fetchAttendanceReportDataForExport/)
    assert.match(exportMain, /fetchAttendanceReportDataForExport/)
  })
})
