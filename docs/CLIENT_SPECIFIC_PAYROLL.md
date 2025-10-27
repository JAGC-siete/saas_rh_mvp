# Client-Specific Payroll Fields

## Overview

This system allows you to add client-specific payroll fields without affecting other clients or modifying the core database schema.

## Architecture

### 1. Metadata Column (JSONB)

The `payroll_run_lines` table has a `metadata` JSONB column that stores client-specific fields as JSON objects.

**Benefits:**
- No schema changes needed for new clients
- Each client can have different fields
- Type-safe with TypeScript interfaces
- Flexible and scalable

### 2. Configuration-Based Approach

Client-specific configurations are stored in `lib/payroll-client-specific.ts`:

```typescript
export interface ClientPayrollConfig {
  companyId: string
  companyName: string
  calculationType: 'standard' | 'prohalca'
  customFields?: {
    [key: string]: string // field_name: description
  }
}
```

## Example: PROHALCA

### Current Custom Fields

PROHALCA uses the following custom fields stored in metadata:

```json
{
  "feriado_trabajado": 150.00,
  "horas_extras": 4.00,
  "valor_hora_extra": 53.91,
  "descanso_por_turno_noche": true,
  "doble_turno": false
}
```

### How to Query

```sql
-- Get all custom fields for a payroll line
SELECT 
  *,
  metadata->'feriado_trabajado' as feriado_trabajado,
  metadata->'horas_extras' as horas_extras,
  metadata->'descanso_por_turno_noche' as descanso_turno_noche
FROM payroll_run_lines
WHERE company_id = '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c';
```

### How to Update

```sql
-- Update custom fields for a payroll line
UPDATE payroll_run_lines 
SET metadata = jsonb_set(
  metadata,
  '{feriado_trabajado}',
  '862.52'
)
WHERE id = 'line_id' 
  AND company_id = '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c';
```

## Adding a New Client

### Step 1: Add Configuration

Edit `lib/payroll-client-specific.ts`:

```typescript
export const CLIENT_PAYROLL_CONFIGS: ClientPayrollConfig[] = [
  {
    companyId: 'existing-client-id',
    companyName: 'Existing Client',
    calculationType: 'standard',
    customFields: {
      'bonus': 'Bonus amount',
      'commission': 'Commission percentage'
    }
  },
  // Add your new client here
  {
    companyId: 'new-client-id',
    companyName: 'New Client',
    calculationType: 'custom',
    customFields: {
      'custom_field_1': 'Description of field 1',
      'custom_field_2': 'Description of field 2'
    }
  }
]
```

### Step 2: Use in API

```typescript
import { getPayrollConfig, buildPayrollMetadata } from '../../../lib/payroll-client-specific'

// In your API endpoint
const config = getPayrollConfig(companyId)

// Build metadata when creating payroll lines
const metadata = buildPayrollMetadata(companyId, {
  custom_field_1: 100.00,
  custom_field_2: 'some value'
})

await supabase
  .from('payroll_run_lines')
  .insert({
    ...standardFields,
    metadata: metadata
  })
```

### Step 3: Calculate with Custom Fields

```typescript
import { calculateProhalcaPayroll } from '../../../lib/payroll-client-specific'

// Get metadata from payroll line
const { data } = await supabase
  .from('payroll_run_lines')
  .select('metadata')
  .eq('id', lineId)
  .single()

// Calculate with custom fields
const customPayroll = calculateProhalcaPayroll(
  baseSalary,
  data.metadata
)
```

## API Integration

### Creating Payroll Lines with Custom Fields

```typescript
// pages/api/payroll/preview.ts or similar

import { buildPayrollMetadata } from '../../../lib/payroll-client-specific'

// When creating payroll lines
for (const emp of employees) {
  const customFields = {
    feriado_trabajado: calculateFeriado(emp),
    horas_extras: calculateHorasExtras(emp)
  }

  const metadata = buildPayrollMetadata(companyId, customFields)

  await supabase
    .from('payroll_run_lines')
    .upsert({
      run_id: runId,
      company_id: companyId,
      employee_id: emp.id,
      // ... standard fields
      metadata: metadata
    })
}
```

### Reading Custom Fields

```typescript
import { extractCustomFields } from '../../../lib/payroll-client-specific'

const { data: lines } = await supabase
  .from('payroll_run_lines')
  .select('*, metadata')
  .eq('company_id', companyId)

const processedLines = lines.map(line => {
  const customFields = extractCustomFields(companyId, line.metadata)
  
  return {
    ...line,
    customFields
  }
})
```

## Frontend Integration

### Display Custom Fields

```typescript
// components/UnifiedPayrollTable.tsx or similar

import { extractCustomFields, getPayrollConfig } from '../../lib/payroll-client-specific'

const config = getPayrollConfig(companyId)

// In your component
{config?.customFields && Object.keys(config.customFields).map(fieldName => {
  const value = extractCustomFields(companyId, row.metadata)[fieldName]
  
  return (
    <div key={fieldName}>
      <span>{config.customFields![fieldName]}:</span>
      <span>{value}</span>
    </div>
  )
})}
```

## Benefits

1. **No Schema Changes**: Adding new fields doesn't require database migrations
2. **Client Isolation**: Each client's custom fields are isolated in JSON
3. **Type Safe**: TypeScript interfaces ensure type safety
4. **Flexible**: Easy to add, modify, or remove fields per client
5. **Scalable**: Can support unlimited clients with different field structures

## Migration

Run the metadata migration:

```bash
supabase db push
```

Or execute in Supabase SQL Editor:
```sql
-- Content of supabase/migrations/20250128000001_add_payroll_metadata.sql
```

## Example: Complete Flow

### Backend (API)

```typescript
// 1. Get config
const config = getPayrollConfig(companyId)

// 2. Calculate custom fields
const customData = {
  feriado_trabajado: 862.52,
  horas_extras: 4.00
}

// 3. Build metadata
const metadata = buildPayrollMetadata(companyId, customData)

// 4. Save to database
await supabase
  .from('payroll_run_lines')
  .insert({
    employee_id: employee.id,
    metadata: metadata
  })
```

### Frontend (Display)

```typescript
// 1. Read metadata
const metadata = payrollLine.metadata

// 2. Extract custom fields
const customFields = extractCustomFields(companyId, metadata)

// 3. Display
<div>
  <strong>Feriado Trabajado:</strong> {customFields.feriado_trabajado}
  <strong>Horas Extras:</strong> {customFields.horas_extras}
</div>
```

## Testing

Test with PROHALCA:

```sql
-- Insert test data
UPDATE payroll_run_lines 
SET metadata = jsonb_build_object(
  'feriado_trabajado', 862.52,
  'horas_extras', 4.00,
  'valor_hora_extra', 53.91
)
WHERE company_id = '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c';

-- Query test
SELECT 
  employee_id,
  eff_bruto,
  metadata->'feriado_trabajado' as feriado,
  metadata->'horas_extras' as horas_extras
FROM payroll_run_lines
WHERE company_id = '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c';
```

