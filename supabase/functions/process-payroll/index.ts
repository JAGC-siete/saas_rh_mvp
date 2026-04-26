// Edge Function: Process Payroll File
// Triggered when a file is uploaded to HR_BUCKET/payroll-uploads/
// Extracts employee data from Excel/PDF and stores in database
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // Health check endpoint
  const url = new URL(req.url);
  const path = url.pathname;
  if (req.method === 'GET' && (path.endsWith('/process-payroll/health') || path.endsWith('/health'))) {
    return new Response(JSON.stringify({
      status: 'ok',
      name: 'process-payroll',
      version: 1,
      time: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Parse request body
    const payload = await req.json();
    console.log('Received payload:', payload);
    // Handle different invocation types
    let storagePath;
    let uploadId = null;
    if (payload.type === 'INSERT' || payload.type === 'UPDATE') {
      // Triggered by Storage webhook
      const event = payload;
      storagePath = event.record.name;
      // Extract tenant_id from path: payroll-uploads/{tenant_id}/{filename}
      const pathParts = storagePath.split('/');
      if (pathParts.length < 3 || pathParts[0] !== 'payroll-uploads') {
        throw new Error('Invalid storage path format');
      }
      const tenantId = pathParts[1];
      const filename = pathParts.slice(2).join('/');
      // Find upload record by storage path
      const { data: upload, error: uploadError } = await supabase.from('payroll_uploads').select('*').eq('storage_path', storagePath).single();
      if (uploadError || !upload) {
        console.error('Upload record not found:', uploadError);
        throw new Error('Upload record not found');
      }
      uploadId = upload.id;
    } else if (payload.uploadId) {
      // Manual invocation with uploadId
      uploadId = payload.uploadId;
      const { data: upload, error: uploadError } = await supabase.from('payroll_uploads').select('*').eq('id', uploadId).single();
      if (uploadError || !upload) {
        throw new Error('Upload not found');
      }
      storagePath = upload.storage_path;
      if (!storagePath) {
        throw new Error('Upload has no storage path');
      }
    } else {
      throw new Error('Invalid payload: missing uploadId or storage event');
    }
    console.log('Processing upload:', uploadId, 'at path:', storagePath);
    // Update status to processing
    await supabase.from('payroll_uploads').update({
      upload_status: 'processing',
      processing_started_at: new Date().toISOString()
    }).eq('id', uploadId);
    // Download file from Storage
    const { data: fileData, error: downloadError } = await supabase.storage.from('HR_BUCKET').download(storagePath);
    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }
    console.log('File downloaded, size:', fileData.size);
    // Determine file type from path
    const fileExtension = storagePath.toLowerCase().split('.').pop();
    let extractedEmployees = [];
    let confidenceScore = 0;
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Process Excel file
      const result = await processExcelFile(fileData);
      extractedEmployees = result.employees;
      confidenceScore = result.confidenceScore;
    } else if (fileExtension === 'pdf') {
      // Process PDF file
      const result = await processPdfFile(fileData);
      extractedEmployees = result.employees;
      confidenceScore = result.confidenceScore;
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
    console.log(`Extracted ${extractedEmployees.length} employees`);
    if (extractedEmployees.length === 0) {
      // No data found
      await supabase.from('payroll_uploads').update({
        upload_status: 'failed',
        processing_completed_at: new Date().toISOString(),
        error_message: 'No employee data could be extracted from the file'
      }).eq('id', uploadId);
      return new Response(JSON.stringify({
        success: false,
        error: 'No data extracted'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Store extracted employees
    const employeeRecords = extractedEmployees.map((emp, index)=>({
        upload_id: uploadId,
        row_number: index + 1,
        extracted_name: emp.name,
        extracted_dni: emp.dni,
        extracted_salary: emp.salary,
        extracted_position: emp.position,
        extracted_department: emp.department,
        confidence_score: emp.confidence
      }));
    const { error: insertError } = await supabase.from('payroll_extracted_employees').insert(employeeRecords);
    if (insertError) {
      throw new Error(`Failed to insert extracted employees: ${insertError.message}`);
    }
    // Update upload with success status
    await supabase.from('payroll_uploads').update({
      upload_status: 'processed',
      processing_completed_at: new Date().toISOString(),
      extracted_data: {
        total_employees: extractedEmployees.length,
        confidence_score: confidenceScore,
        extraction_method: fileExtension,
        processed_at: new Date().toISOString()
      }
    }).eq('id', uploadId);
    console.log('Processing completed successfully');
    return new Response(JSON.stringify({
      success: true,
      uploadId,
      employeesExtracted: extractedEmployees.length,
      confidenceScore
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error processing payroll:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
// ============================================================================
// EXCEL PROCESSING
// ============================================================================
async function processExcelFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array'
    });
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(sheet, {
      header: 1
    });
    if (data.length < 2) {
      return {
        employees: [],
        confidenceScore: 0
      };
    }
    // Detect columns - Enhanced for PROHALCA and other clients
    const headers = data[0].map((h)=>String(h).toLowerCase().trim());
    const nameCol = detectColumn(headers, [
      'nombre',
      'name',
      'empleado',
      'employee',
      'trabajador'
    ]);
    const dniCol = detectColumn(headers, [
      'dni',
      'identidad',
      'id',
      'cedula',
      'identificacion'
    ]);
    const salaryCol = detectColumn(headers, [
      'salario',
      'salary',
      'sueldo',
      'bruto',
      'gross',
      'sueldo_base'
    ]);
    const positionCol = detectColumn(headers, [
      'puesto',
      'position',
      'cargo',
      'rol',
      'role'
    ]);
    const departmentCol = detectColumn(headers, [
      'departamento',
      'department',
      'dept',
      'area',
      'area_funcional'
    ]);
    // PROHALCA specific columns
    const overtimeHoursCol = detectColumn(headers, [
      'horas_extras',
      'horas extra',
      'overtime',
      'extras'
    ]);
    const overtimeRateCol = detectColumn(headers, [
      'valor_hora_extra',
      'valor hora extra',
      'rate_extra'
    ]);
    const holidayWorkCol = detectColumn(headers, [
      'feriado_trabajado',
      'feriado trabajado',
      'holiday_work'
    ]);
    const shiftCol = detectColumn(headers, [
      'turno',
      'shift',
      'horario'
    ]);
    const grossSalaryCol = detectColumn(headers, [
      'sueldo_bruto',
      'sueldo bruto',
      'total_bruto',
      'gross_salary'
    ]);
    const deductionsCol = detectColumn(headers, [
      'deducciones',
      'total_deducciones',
      'total deducciones'
    ]);
    const netSalaryCol = detectColumn(headers, [
      'sueldo_neto',
      'sueldo neto',
      'total_neto',
      'net_salary'
    ]);
    const employees = [];
    let totalConfidence = 0;
    // Process data rows
    for(let i = 1; i < data.length; i++){
      const row = data[i];
      if (!row || row.length === 0) continue;
      const name = nameCol >= 0 ? cleanString(row[nameCol]) : undefined;
      if (!name) continue; // Skip rows without name
      const dni = dniCol >= 0 ? cleanString(row[dniCol]) : undefined;
      const salary = salaryCol >= 0 ? parseNumber(row[salaryCol]) : undefined;
      const position = positionCol >= 0 ? cleanString(row[positionCol]) : undefined;
      const department = departmentCol >= 0 ? cleanString(row[departmentCol]) : undefined;
      // PROHALCA specific fields
      const overtimeHours = overtimeHoursCol >= 0 ? parseNumber(row[overtimeHoursCol]) : undefined;
      const overtimeRate = overtimeRateCol >= 0 ? parseNumber(row[overtimeRateCol]) : undefined;
      const holidayWork = holidayWorkCol >= 0 ? parseNumber(row[holidayWorkCol]) : undefined;
      const shift = shiftCol >= 0 ? cleanString(row[shiftCol]) : undefined;
      const grossSalary = grossSalaryCol >= 0 ? parseNumber(row[grossSalaryCol]) : undefined;
      const deductions = deductionsCol >= 0 ? parseNumber(row[deductionsCol]) : undefined;
      const netSalary = netSalaryCol >= 0 ? parseNumber(row[netSalaryCol]) : undefined;
      // Calculate confidence - Enhanced for PROHALCA
      let confidence = 0.5 // Base confidence
      ;
      if (name) confidence += 0.3;
      if (salary && salary > 0) confidence += 0.2;
      if (dni) confidence += 0.1;
      if (department) confidence += 0.05;
      if (position) confidence += 0.05;
      // PROHALCA specific confidence boosters
      if (grossSalary && grossSalary > 0) confidence += 0.1;
      if (netSalary && netSalary > 0) confidence += 0.1;
      if (overtimeHours && overtimeHours > 0) confidence += 0.05;
      if (shift) confidence += 0.05;
      employees.push({
        name,
        dni,
        salary,
        position,
        department,
        confidence: Math.min(confidence, 1.0),
        // PROHALCA specific fields
        overtimeHours,
        overtimeRate,
        holidayWork,
        shift,
        grossSalary,
        deductions,
        netSalary
      });
      totalConfidence += confidence;
    }
    const avgConfidence = employees.length > 0 ? totalConfidence / employees.length : 0;
    return {
      employees,
      confidenceScore: avgConfidence
    };
  } catch (error) {
    console.error('Excel processing error:', error);
    throw new Error(`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
// ============================================================================
// PDF PROCESSING (Basic implementation)
// ============================================================================
async function processPdfFile(file) {
  // TODO: Implement PDF parsing with pdf-parse or similar
  // For now, return empty result with note
  console.warn('PDF processing not yet implemented');
  return {
    employees: [],
    confidenceScore: 0
  };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function detectColumn(headers, keywords) {
  for(let i = 0; i < headers.length; i++){
    const header = headers[i];
    for (const keyword of keywords){
      if (header.includes(keyword)) {
        return i;
      }
    }
  }
  return -1;
}
function cleanString(value) {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str.length > 0 ? str : undefined;
}
function parseNumber(value) {
  if (value === null || value === undefined || value === '') return undefined;
  // Remove common currency symbols and separators
  const cleaned = String(value).replace(/[L$,\s]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}
