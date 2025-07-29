#!/usr/bin/env node

/**
 * Supabase Database Audit Script
 * 
 * This script performs a deep audit of the Supabase database configuration:
 * - Database connectivity
 * - RLS policies
 * - Multi-tenant setup
 * - Table structure
 * - Authentication setup
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class SupabaseAuditor {
  constructor() {
    this.auditResults = {
      passed: [],
      failed: [],
      warnings: [],
      info: []
    };
    this.projectRoot = process.cwd();
    this.supabase = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const color = colors[type === 'error' ? 'red' : type === 'success' ? 'green' : type === 'warning' ? 'yellow' : 'blue'];
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  addResult(type, category, message, details = null) {
    this.auditResults[type].push({
      category,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Initialize Supabase client
  async initializeSupabase() {
    this.log('🔧 Initializing Supabase client...', 'info');
    
    try {
      // Try to load environment variables
      const envFile = path.join(this.projectRoot, '.env.local');
      let envVars = {};
      
      if (fs.existsSync(envFile)) {
        const envContent = fs.readFileSync(envFile, 'utf8');
        envContent.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        });
      }
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase URL or Anon Key');
      }
      
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.addResult('passed', 'Supabase Client', 'Supabase client initialized successfully');
      
    } catch (error) {
      this.addResult('failed', 'Supabase Client', `Failed to initialize Supabase client: ${error.message}`);
      throw error;
    }
  }

  // Test database connectivity
  async testConnectivity() {
    this.log('🔍 Testing database connectivity...', 'info');
    
    try {
      const { data, error } = await this.supabase.from('user_profiles').select('count').limit(1);
      
      if (error) {
        this.addResult('failed', 'Connectivity', `Database connection failed: ${error.message}`);
      } else {
        this.addResult('passed', 'Connectivity', 'Database connection successful');
      }
    } catch (error) {
      this.addResult('failed', 'Connectivity', `Connection test failed: ${error.message}`);
    }
  }

  // Check table structure
  async checkTableStructure() {
    this.log('🔍 Checking table structure...', 'info');
    
    const requiredTables = [
      'user_profiles',
      'employees',
      'departments',
      'attendance_records',
      'leave_requests',
      'payroll_records',
      'companies'
    ];
    
    for (const tableName of requiredTables) {
      try {
        const { data, error } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          this.addResult('failed', 'Table Structure', `Table ${tableName} not accessible: ${error.message}`);
        } else {
          this.addResult('passed', 'Table Structure', `Table ${tableName} exists and accessible`);
        }
      } catch (error) {
        this.addResult('failed', 'Table Structure', `Error checking table ${tableName}: ${error.message}`);
      }
    }
  }

  // Check RLS policies
  async checkRLSPolicies() {
    this.log('🔍 Checking RLS policies...', 'info');
    
    const tablesWithRLS = [
      'user_profiles',
      'employees',
      'departments',
      'attendance_records',
      'leave_requests',
      'payroll_records'
    ];
    
    for (const tableName of tablesWithRLS) {
      try {
        // Try to query without authentication (should fail if RLS is enabled)
        const { data, error } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error && error.message.includes('permission denied')) {
          this.addResult('passed', 'RLS Policies', `RLS enabled on table ${tableName}`);
        } else if (data && data.length > 0) {
          this.addResult('failed', 'RLS Policies', `RLS not properly configured on table ${tableName} - data accessible without auth`);
        } else {
          this.addResult('warning', 'RLS Policies', `RLS status unclear for table ${tableName}`);
        }
      } catch (error) {
        this.addResult('warning', 'RLS Policies', `Error checking RLS for table ${tableName}: ${error.message}`);
      }
    }
  }

  // Check multi-tenant setup
  async checkMultiTenantSetup() {
    this.log('🔍 Checking multi-tenant setup...', 'info');
    
    const multiTenantTables = [
      'user_profiles',
      'employees',
      'departments',
      'attendance_records',
      'leave_requests',
      'payroll_records'
    ];
    
    for (const tableName of multiTenantTables) {
      try {
        // Check if table has company_id column
        const { data, error } = await this.supabase
          .from(tableName)
          .select('company_id')
          .limit(1);
        
        if (error && error.message.includes('column "company_id" does not exist')) {
          this.addResult('failed', 'Multi-tenant', `Table ${tableName} missing company_id column`);
        } else if (error) {
          this.addResult('warning', 'Multi-tenant', `Error checking company_id in ${tableName}: ${error.message}`);
        } else {
          this.addResult('passed', 'Multi-tenant', `Table ${tableName} has company_id column`);
        }
      } catch (error) {
        this.addResult('warning', 'Multi-tenant', `Error checking multi-tenant setup for ${tableName}: ${error.message}`);
      }
    }
  }

  // Check authentication setup
  async checkAuthenticationSetup() {
    this.log('🔍 Checking authentication setup...', 'info');
    
    try {
      // Check if auth.users table is accessible
      const { data, error } = await this.supabase.auth.getUser();
      
      if (error) {
        this.addResult('info', 'Authentication', `Auth check result: ${error.message}`);
      } else {
        this.addResult('passed', 'Authentication', 'Authentication system accessible');
      }
    } catch (error) {
      this.addResult('warning', 'Authentication', `Auth check failed: ${error.message}`);
    }
  }

  // Check user roles and permissions
  async checkUserRoles() {
    this.log('🔍 Checking user roles...', 'info');
    
    try {
      // Check if user_profiles table has role column
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('role')
        .limit(1);
      
      if (error && error.message.includes('column "role" does not exist')) {
        this.addResult('failed', 'User Roles', 'user_profiles table missing role column');
      } else if (error) {
        this.addResult('warning', 'User Roles', `Error checking role column: ${error.message}`);
      } else {
        this.addResult('passed', 'User Roles', 'Role column exists in user_profiles');
      }
    } catch (error) {
      this.addResult('warning', 'User Roles', `Error checking user roles: ${error.message}`);
    }
  }

  // Check data integrity
  async checkDataIntegrity() {
    this.log('🔍 Checking data integrity...', 'info');
    
    try {
      // Check for orphaned records
      const { data: employees, error: empError } = await this.supabase
        .from('employees')
        .select('company_id')
        .limit(10);
      
      if (!empError && employees && employees.length > 0) {
        const companyIds = [...new Set(employees.map(emp => emp.company_id))];
        
        for (const companyId of companyIds) {
          const { data: company, error: compError } = await this.supabase
            .from('companies')
            .select('id')
            .eq('id', companyId)
            .single();
          
          if (compError || !company) {
            this.addResult('failed', 'Data Integrity', `Orphaned employee records found for company_id: ${companyId}`);
          }
        }
        
        this.addResult('passed', 'Data Integrity', 'No orphaned employee records found');
      }
    } catch (error) {
      this.addResult('warning', 'Data Integrity', `Error checking data integrity: ${error.message}`);
    }
  }

  // Generate audit report
  generateReport() {
    this.log('\n📊 Generating Supabase audit report...', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.auditResults.passed.length + this.auditResults.failed.length + this.auditResults.warnings.length + this.auditResults.info.length,
        passed: this.auditResults.passed.length,
        failed: this.auditResults.failed.length,
        warnings: this.auditResults.warnings.length,
        info: this.auditResults.info.length
      },
      results: this.auditResults
    };
    
    // Save report to file
    const reportPath = path.join(this.projectRoot, 'supabase-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}SUPABASE DATABASE AUDIT REPORT${colors.reset}`);
    console.log('='.repeat(60));
    console.log(`Total Checks: ${report.summary.total}`);
    console.log(`${colors.green}✅ Passed: ${report.summary.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${report.summary.failed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Warnings: ${report.summary.warnings}${colors.reset}`);
    console.log(`${colors.blue}ℹ️  Info: ${report.summary.info}${colors.reset}`);
    console.log('='.repeat(60));
    
    // Print failed items
    if (this.auditResults.failed.length > 0) {
      console.log(`\n${colors.red}❌ FAILED CHECKS:${colors.reset}`);
      this.auditResults.failed.forEach(item => {
        console.log(`  • ${item.category}: ${item.message}`);
      });
    }
    
    // Print warnings
    if (this.auditResults.warnings.length > 0) {
      console.log(`\n${colors.yellow}⚠️  WARNINGS:${colors.reset}`);
      this.auditResults.warnings.forEach(item => {
        console.log(`  • ${item.category}: ${item.message}`);
      });
    }
    
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
    return report;
  }

  // Run complete audit
  async runAudit() {
    this.log('🚀 Starting Supabase Database Audit...', 'info');
    
    try {
      await this.initializeSupabase();
      await this.testConnectivity();
      await this.checkTableStructure();
      await this.checkRLSPolicies();
      await this.checkMultiTenantSetup();
      await this.checkAuthenticationSetup();
      await this.checkUserRoles();
      await this.checkDataIntegrity();
      
      const report = this.generateReport();
      
      // Exit with error code if there are failures
      if (report.summary.failed > 0) {
        this.log(`\n${colors.red}Audit completed with ${report.summary.failed} failures. Please address the issues above.${colors.reset}`, 'error');
        process.exit(1);
      } else {
        this.log(`\n${colors.green}✅ Supabase audit completed successfully! All checks passed.${colors.reset}`, 'success');
        process.exit(0);
      }
    } catch (error) {
      this.log(`\n${colors.red}Audit failed: ${error.message}${colors.reset}`, 'error');
      process.exit(1);
    }
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new SupabaseAuditor();
  auditor.runAudit().catch(error => {
    console.error('Supabase audit failed:', error);
    process.exit(1);
  });
}

module.exports = SupabaseAuditor; 