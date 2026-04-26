/**
 * Normalize employee data before sending to database
 * Handles empty strings, null values, and date formatting
 */

/**
 * Normalize a date value for database storage
 * Converts empty strings, 'null', 'undefined' to null
 * Validates and formats date strings to YYYY-MM-DD format
 */
export function normalizeDate(dateValue: any): string | null {
  // Handle null, undefined, empty string, or string 'null'/'undefined'
  if (!dateValue || dateValue === '' || dateValue === 'null' || dateValue === 'undefined') {
    return null;
  }

  // If it's already a valid date string in YYYY-MM-DD format
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim();
    
    // Empty after trim
    if (trimmed === '') {
      return null;
    }

    // Validate YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(trimmed)) {
      return trimmed;
    }

    // Try to parse and reformat if it's a different format
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      // Format as YYYY-MM-DD
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // If it's a Date object
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Invalid date, return null
  return null;
}

/**
 * Normalize nullable string fields (convert empty strings to null)
 */
export function normalizeNullableString(value: any): string | null {
  if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return String(value);
}

/**
 * Normalize employee data object for database operations
 * Handles all date fields and nullable string fields
 */
export function normalizeEmployeeData(data: any): any {
  const normalized: any = { ...data };

  // Normalize date fields
  if ('hire_date' in normalized) {
    normalized.hire_date = normalizeDate(normalized.hire_date);
  }
  if ('termination_date' in normalized) {
    normalized.termination_date = normalizeDate(normalized.termination_date);
  }

  // Normalize nullable string fields
  const nullableStringFields = [
    'email',
    'phone',
    'employee_code',
    'role',
    'team',
    'position',
    'bank_name',
    'bank_account',
    'emergency_contact_name',
    'emergency_contact_phone',
    'department_id',
    'work_schedule_id'
  ];

  nullableStringFields.forEach(field => {
    if (field in normalized) {
      normalized[field] = normalizeNullableString(normalized[field]);
    }
  });

  // Normalize numeric fields
  if ('base_salary' in normalized && normalized.base_salary !== null && normalized.base_salary !== undefined) {
    const salary = typeof normalized.base_salary === 'string' 
      ? parseFloat(normalized.base_salary) 
      : Number(normalized.base_salary);
    normalized.base_salary = isNaN(salary) ? 0 : salary;
  }

  // Remove id from update data if present (should be in query params)
  if ('id' in normalized && normalized.id) {
    // Keep id for reference but don't include in update
    delete normalized.id;
  }

  return normalized;
}

