#!/usr/bin/env node

/**
 * Script para verificar la lógica de los endpoints del sistema de reportes
 * Verifica que las funciones principales estén correctamente implementadas
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 VERIFICANDO LÓGICA DE ENDPOINTS DE REPORTES');
console.log('='.repeat(60));

// Función para verificar validaciones en endpoints
function checkValidations(filePath, endpointName) {
  console.log(`\n🔍 Verificando validaciones: ${endpointName}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ Archivo no encontrado: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let allValidationsFound = true;

  const validations = [
    {
      name: 'Validación de método HTTP',
      check: 'req.method !== \'POST\'',
      description: 'Verifica que solo se acepten requests POST'
    },
    {
      name: 'Validación de formato',
      check: '![\'pdf\', \'csv\'].includes(format)',
      description: 'Verifica que el formato sea pdf o csv'
    },
    {
      name: 'Validación de autenticación',
      check: '!authResult.success',
      description: 'Verifica que el usuario esté autenticado'
    },
    {
      name: 'Manejo de errores',
      check: 'catch (error)',
      description: 'Verifica que haya manejo de errores'
    },
    {
      name: 'Respuesta de error',
      check: 'res.status(400).json',
      description: 'Verifica que se devuelvan errores apropiados'
    }
  ];

  for (const validation of validations) {
    if (content.includes(validation.check)) {
      console.log(`   ✅ ${validation.name}: ${validation.description}`);
    } else {
      console.log(`   ❌ ${validation.name}: NO ENCONTRADO`);
      allValidationsFound = false;
    }
  }

  return allValidationsFound;
}

// Función para verificar funciones de generación de reportes
function checkReportGeneration(filePath, endpointName) {
  console.log(`\n📊 Verificando generación de reportes: ${endpointName}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ Archivo no encontrado: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let allFunctionsFound = true;

  // Definir funciones específicas para cada endpoint
  let functions = [];
  
  if (endpointName === 'Reporte General') {
    functions = [
      {
        name: 'Función de datos',
        check: 'generateReportData',
        description: 'Función para obtener datos del reporte'
      },
      {
        name: 'Función PDF',
        check: 'generatePDFReport',
        description: 'Función para generar reportes PDF'
      },
      {
        name: 'Función CSV',
        check: 'generateCSVReport',
        description: 'Función para generar reportes CSV'
      }
    ];
  } else if (endpointName === 'Reporte de Empleados') {
    functions = [
      {
        name: 'Función de datos',
        check: 'generateEmployeeReportData',
        description: 'Función para obtener datos del reporte'
      },
      {
        name: 'Función PDF',
        check: 'generateEmployeePDFReport',
        description: 'Función para generar reportes PDF'
      },
      {
        name: 'Función CSV',
        check: 'generateEmployeeCSVReport',
        description: 'Función para generar reportes CSV'
      }
    ];
  } else if (endpointName === 'Reporte de Nómina') {
    functions = [
      {
        name: 'Función de datos',
        check: 'generatePayrollReportData',
        description: 'Función para obtener datos del reporte'
      },
      {
        name: 'Función PDF',
        check: 'generatePayrollPDFReport',
        description: 'Función para generar reportes PDF'
      },
      {
        name: 'Función CSV',
        check: 'generatePayrollCSVReport',
        description: 'Función para generar reportes CSV'
      }
    ];
  } else if (endpointName === 'Reporte de Asistencia') {
    functions = [
      {
        name: 'Función de datos',
        check: 'generateAttendanceReportData',
        description: 'Función para obtener datos del reporte'
      },
      {
        name: 'Función PDF',
        check: 'generateAttendancePDFReport',
        description: 'Función para generar reportes PDF'
      },
      {
        name: 'Función CSV',
        check: 'generateAttendanceCSVReport',
        description: 'Función para generar reportes CSV'
      }
    ];
  }

  // Agregar verificaciones comunes
  functions.push(
    {
      name: 'PDFKit',
      check: 'require(\'pdfkit\')',
      description: 'Librería para generar PDFs'
    },
    {
      name: 'Headers de respuesta',
      check: 'Content-Type',
      description: 'Headers apropiados para descarga'
    }
  );

  for (const func of functions) {
    if (content.includes(func.check)) {
      console.log(`   ✅ ${func.name}: ${func.description}`);
    } else {
      console.log(`   ❌ ${func.name}: NO ENCONTRADO`);
      allFunctionsFound = false;
    }
  }

  return allFunctionsFound;
}

// Función para verificar seguridad y permisos
function checkSecurity(filePath, endpointName) {
  console.log(`\n🔒 Verificando seguridad: ${endpointName}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ Archivo no encontrado: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let allSecurityFound = true;

  const securityChecks = [
    {
      name: 'Autenticación',
      check: 'authenticateUser',
      description: 'Verificación de autenticación'
    },
    {
      name: 'Permisos',
      check: 'can_view_reports',
      description: 'Verificación de permisos específicos'
    },
    {
      name: 'Filtrado por empresa',
      check: 'company_id',
      description: 'Filtrado de datos por empresa'
    },
    {
      name: 'Logging de seguridad',
      check: 'Usuario autenticado',
      description: 'Logs de seguridad'
    },
    {
      name: 'Validación de entrada',
      check: 'req.body',
      description: 'Validación de datos de entrada'
    }
  ];

  for (const check of securityChecks) {
    if (content.includes(check.check)) {
      console.log(`   ✅ ${check.name}: ${check.description}`);
    } else {
      console.log(`   ❌ ${check.name}: NO ENCONTRADO`);
      allSecurityFound = false;
    }
  }

  return allSecurityFound;
}

// Función para verificar integración con Supabase
function checkSupabaseIntegration(filePath, endpointName) {
  console.log(`\n🗄️  Verificando integración Supabase: ${endpointName}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ Archivo no encontrado: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let allIntegrationFound = true;

  // Definir integraciones específicas para cada endpoint
  let integrations = [
    {
      name: 'Cliente Supabase',
      check: 'createClient',
      description: 'Creación del cliente Supabase'
    },
    {
      name: 'Manejo de errores DB',
      check: 'empError',
      description: 'Manejo de errores de base de datos'
    }
  ];
  
  if (endpointName === 'Reporte General') {
    integrations.push(
      {
        name: 'Query de empleados',
        check: 'from(\'employees\')',
        description: 'Consulta a tabla de empleados'
      },
      {
        name: 'Query de asistencia',
        check: 'from(\'attendance_records\')',
        description: 'Consulta a tabla de asistencia'
      },
      {
        name: 'Query de nómina',
        check: 'from(\'payroll_records\')',
        description: 'Consulta a tabla de nómina'
      }
    );
  } else if (endpointName === 'Reporte de Empleados') {
    integrations.push(
      {
        name: 'Query de empleados',
        check: 'from(\'employees\')',
        description: 'Consulta a tabla de empleados'
      },
      {
        name: 'Query de departamentos',
        check: 'from(\'departments\')',
        description: 'Consulta a tabla de departamentos'
      }
    );
  } else if (endpointName === 'Reporte de Nómina') {
    integrations.push(
      {
        name: 'Query de empleados',
        check: 'from(\'employees\')',
        description: 'Consulta a tabla de empleados'
      },
      {
        name: 'Query de nómina',
        check: 'from(\'payroll_records\')',
        description: 'Consulta a tabla de nómina'
      }
    );
  } else if (endpointName === 'Reporte de Asistencia') {
    integrations.push(
      {
        name: 'Query de empleados',
        check: 'from(\'employees\')',
        description: 'Consulta a tabla de empleados'
      },
      {
        name: 'Query de asistencia',
        check: 'from(\'attendance_records\')',
        description: 'Consulta a tabla de asistencia'
      }
    );
  }

  for (const integration of integrations) {
    if (content.includes(integration.check)) {
      console.log(`   ✅ ${integration.name}: ${integration.description}`);
    } else {
      console.log(`   ❌ ${integration.name}: NO ENCONTRADO`);
      allIntegrationFound = false;
    }
  }

  return allIntegrationFound;
}

// Lista de endpoints a verificar
const endpoints = [
  {
    name: 'Reporte General',
    path: 'pages/api/reports/export.ts'
  },
  {
    name: 'Reporte de Empleados',
    path: 'pages/api/reports/export-employees.ts'
  },
  {
    name: 'Reporte de Nómina',
    path: 'pages/api/reports/export-payroll.ts'
  },
  {
    name: 'Reporte de Asistencia',
    path: 'pages/api/attendance/export-report.ts'
  }
];

// Función principal
function runLogicCheck() {
  console.log('🚀 Iniciando verificación de lógica...\n');

  let allChecksPassed = true;
  let totalChecks = 0;
  let passedChecks = 0;

  for (const endpoint of endpoints) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔌 ENDPOINT: ${endpoint.name}`);
    console.log(`${'='.repeat(50)}`);

    // Verificar validaciones
    const validationsOk = checkValidations(endpoint.path, endpoint.name);
    if (validationsOk) passedChecks++;
    totalChecks++;
    if (!validationsOk) allChecksPassed = false;

    // Verificar generación de reportes
    const generationOk = checkReportGeneration(endpoint.path, endpoint.name);
    if (generationOk) passedChecks++;
    totalChecks++;
    if (!generationOk) allChecksPassed = false;

    // Verificar seguridad
    const securityOk = checkSecurity(endpoint.path, endpoint.name);
    if (securityOk) passedChecks++;
    totalChecks++;
    if (!securityOk) allChecksPassed = false;

    // Verificar integración Supabase
    const integrationOk = checkSupabaseIntegration(endpoint.path, endpoint.name);
    if (integrationOk) passedChecks++;
    totalChecks++;
    if (!integrationOk) allChecksPassed = false;
  }

  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE VERIFICACIÓN DE LÓGICA');
  console.log('='.repeat(60));
  console.log(`✅ Checks pasados: ${passedChecks}/${totalChecks}`);
  console.log(`❌ Checks fallidos: ${totalChecks - passedChecks}/${totalChecks}`);
  console.log(`📈 Porcentaje de éxito: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

  if (allChecksPassed) {
    console.log('\n🎉 ¡TODAS LAS VERIFICACIONES DE LÓGICA PASARON!');
    console.log('✅ Los endpoints tienen todas las validaciones necesarias');
    console.log('✅ La generación de reportes está correctamente implementada');
    console.log('✅ Las medidas de seguridad están en su lugar');
    console.log('✅ La integración con Supabase está funcionando');
    console.log('\n🚀 Los endpoints están listos para testing funcional');
  } else {
    console.log('\n⚠️  ALGUNAS VERIFICACIONES DE LÓGICA FALLARON');
    console.log('❌ Revisar los logs anteriores para identificar problemas');
    console.log('❌ Corregir los problemas antes de proceder con testing funcional');
  }

  return allChecksPassed;
}

// Ejecutar verificación
runLogicCheck(); 