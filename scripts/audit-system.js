#!/usr/bin/env node

/**
 * HR SaaS System Audit Script
 * 
 * This script performs a comprehensive audit of the HR SaaS system to validate:
 * - Multi-tenant architecture
 * - Security and authentication
 * - RLS policies
 * - API protection
 * - Route protection
 * - Database structure
 * - Environment configuration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

class SystemAuditor {
  constructor() {
    this.auditResults = {
      passed: [],
      failed: [],
      warnings: [],
      info: []
    };
    this.projectRoot = process.cwd();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const color = colors[type === 'error' ? 'red' : type === 'success' ? 'green' : type === 'warning' ? 'yellow' : 'blue'];
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  addResult(type, category, message, details = null) {
    if (!this.auditResults || !this.auditResults[type] || !Array.isArray(this.auditResults[type])) {
      console.error('Error: auditResults not properly initialized');
      return;
    }
    
    this.auditResults[type].push({
      category,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // File system checks
  checkFileStructure() {
    this.log('🔍 Checking file structure...', 'info');
    
    const requiredDirs = [
      'pages',
      'pages/api',
      'components',
      'lib',
      'lib/supabase',
      'supabase',
      'supabase/migrations',
      'styles'
    ];

    const requiredFiles = [
      'package.json',
      'next.config.js',
      'tailwind.config.js',
      'tsconfig.json',
      'middleware.ts',
      'lib/supabase/client.ts',
      'lib/supabase/server.ts',
      'components/ProtectedRoute.tsx'
    ];

    // Check directories
    requiredDirs.forEach(dir => {
      if (fs.existsSync(path.join(this.projectRoot, dir))) {
        this.addResult('passed', 'File Structure', `Directory exists: ${dir}`);
      } else {
        this.addResult('failed', 'File Structure', `Missing directory: ${dir}`);
      }
    });

    // Check files
    requiredFiles.forEach(file => {
      if (fs.existsSync(path.join(this.projectRoot, file))) {
        this.addResult('passed', 'File Structure', `File exists: ${file}`);
      } else {
        this.addResult('failed', 'File Structure', `Missing file: ${file}`);
      }
    });
  }

  // Environment variables check
  checkEnvironmentVariables() {
    this.log('🔍 Checking environment variables...', 'info');
    
    const envFile = path.join(this.projectRoot, '.env.local');
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      
      requiredVars.forEach(varName => {
        if (envContent.includes(varName)) {
          this.addResult('passed', 'Environment', `Environment variable found: ${varName}`);
        } else {
          this.addResult('failed', 'Environment', `Missing environment variable: ${varName}`);
        }
      });
    } else {
      this.addResult('warning', 'Environment', 'No .env.local file found');
    }
  }

  // Package.json analysis
  checkPackageJson() {
    this.log('🔍 Checking package.json...', 'info');
    
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        this.addResult('failed', 'Package.json', 'package.json file not found');
        return;
      }
      
      const fileContent = fs.readFileSync(packageJsonPath, 'utf8');
      if (!fileContent || fileContent.trim() === '') {
        this.addResult('failed', 'Package.json', 'package.json is empty');
        return;
      }
      
      const packageJson = JSON.parse(fileContent);
      
      if (!packageJson || typeof packageJson !== 'object') {
        this.addResult('failed', 'Package.json', 'package.json is invalid JSON');
        return;
      }
      
      // Check required dependencies
      const requiredDeps = ['next', 'react', '@supabase/supabase-js'];
      const requiredDevDeps = ['@types/node', '@types/react', 'tailwindcss'];
      
      requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          this.addResult('passed', 'Dependencies', `Required dependency found: ${dep}`);
        } else {
          this.addResult('failed', 'Dependencies', `Missing required dependency: ${dep}`);
        }
      });

      requiredDevDeps.forEach(dep => {
        if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
          this.addResult('passed', 'Dependencies', `Required dev dependency found: ${dep}`);
        } else {
          this.addResult('warning', 'Dependencies', `Missing dev dependency: ${dep}`);
        }
      });

      // Check scripts
      const requiredScripts = ['dev', 'build', 'start', 'lint'];
      requiredScripts.forEach(script => {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.addResult('passed', 'Scripts', `Required script found: ${script}`);
        } else {
          this.addResult('failed', 'Scripts', `Missing required script: ${script}`);
        }
      });

    } catch (error) {
      this.addResult('failed', 'Package.json', `Error reading package.json: ${error.message}`);
    }
  }

  // API protection check
  checkApiProtection() {
    this.log('🔍 Checking API protection...', 'info');
    
    const apiDir = path.join(this.projectRoot, 'pages/api');
    if (!fs.existsSync(apiDir)) {
      this.addResult('failed', 'API Protection', 'API directory not found');
      return;
    }

    const apiFiles = this.getFilesRecursively(apiDir, '.ts');
    const publicApis = [
      '/api/attendance/register', 
      '/api/attendance/debug',
      '/api/attendance/health',
      '/api/health',
      '/api/env-check',
      '/api/test-supabase',
      '/api/test',
      '/api/auth/login',
      '/api/auth/login-supabase'
    ];
    
    apiFiles.forEach(file => {
      const relativePath = path.relative(this.projectRoot, file);
      const content = fs.readFileSync(file, 'utf8');
      
      // Check if it's a public API
      const isPublicApi = publicApis.some(publicApi => 
        relativePath.includes(publicApi.replace('/api/', ''))
      );
      
      if (isPublicApi) {
        this.addResult('info', 'API Protection', `Public API detected: ${relativePath}`);
      } else {
        // Check for authentication in private APIs
        const hasAuthCheck = content.includes('supabase.auth.getUser') || 
                           content.includes('getUser') ||
                           content.includes('Unauthorized');
        
        if (hasAuthCheck) {
          this.addResult('passed', 'API Protection', `Authentication check found in: ${relativePath}`);
        } else {
          this.addResult('failed', 'API Protection', `No authentication check in private API: ${relativePath}`);
        }
      }
    });
  }

  // Route protection check
  checkRouteProtection() {
    this.log('🔍 Checking route protection...', 'info');
    
    const pagesDir = path.join(this.projectRoot, 'pages');
    if (!fs.existsSync(pagesDir)) {
      this.addResult('failed', 'Route Protection', 'Pages directory not found');
      return;
    }

    const pageFiles = this.getFilesRecursively(pagesDir, '.tsx').filter(file => 
      !file.includes('_app.tsx') && !file.includes('_document.tsx')
    );
    
    const publicPages = [
      '/registrodeasistencia',
      '/login',
      '/unauthorized'
    ];
    
    pageFiles.forEach(file => {
      const relativePath = path.relative(this.projectRoot, file);
      const content = fs.readFileSync(file, 'utf8');
      
      // Check if it's a public page
      const isPublicPage = publicPages.some(publicPage => 
        relativePath.includes(publicPage.replace('/', ''))
      );
      
      if (isPublicPage) {
        this.addResult('info', 'Route Protection', `Public page detected: ${relativePath}`);
      } else {
        // Check for ProtectedRoute usage
        const hasProtectedRoute = content.includes('ProtectedRoute') ||
                                 content.includes('ProtectedRoute>');
        
        if (hasProtectedRoute) {
          this.addResult('passed', 'Route Protection', `ProtectedRoute found in: ${relativePath}`);
        } else {
          this.addResult('failed', 'Route Protection', `No ProtectedRoute in private page: ${relativePath}`);
        }
      }
    });
  }

  // Supabase configuration check
  checkSupabaseConfig() {
    this.log('🔍 Checking Supabase configuration...', 'info');
    
    const supabaseDir = path.join(this.projectRoot, 'lib/supabase');
    const requiredFiles = ['client.ts', 'server.ts'];
    
    requiredFiles.forEach(file => {
      const filePath = path.join(supabaseDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for proper Supabase client configuration
        const hasClientConfig = content.includes('createClient') || 
                               content.includes('supabase');
        
        if (hasClientConfig) {
          this.addResult('passed', 'Supabase Config', `Proper Supabase configuration in: ${file}`);
        } else {
          this.addResult('failed', 'Supabase Config', `Incomplete Supabase configuration in: ${file}`);
        }
      } else {
        this.addResult('failed', 'Supabase Config', `Missing Supabase file: ${file}`);
      }
    });
  }

  // Database migrations check
  checkDatabaseMigrations() {
    this.log('🔍 Checking database migrations...', 'info');
    
    const migrationsDir = path.join(this.projectRoot, 'supabase/migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
      
      if (migrationFiles.length > 0) {
        this.addResult('passed', 'Database Migrations', `Found ${migrationFiles.length} migration files`);
        
        // Check for RLS policies
        migrationFiles.forEach(file => {
          const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          if (content.includes('RLS') || content.includes('row level security')) {
            this.addResult('passed', 'Database Migrations', `RLS policies found in: ${file}`);
          }
        });
      } else {
        this.addResult('warning', 'Database Migrations', 'No migration files found');
      }
    } else {
      this.addResult('failed', 'Database Migrations', 'Migrations directory not found');
    }
  }

  // Multi-tenant architecture check
  checkMultiTenantArchitecture() {
    this.log('🔍 Checking multi-tenant architecture...', 'info');
    
    // Check for company_id usage in components
    const componentsDir = path.join(this.projectRoot, 'components');
    if (fs.existsSync(componentsDir)) {
      const componentFiles = this.getFilesRecursively(componentsDir, '.tsx');
      
      let hasCompanyIdUsage = false;
      componentFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('company_id') || content.includes('companyId')) {
          hasCompanyIdUsage = true;
        }
      });
      
      if (hasCompanyIdUsage) {
        this.addResult('passed', 'Multi-tenant', 'Company ID usage found in components');
      } else {
        this.addResult('warning', 'Multi-tenant', 'No company_id usage found in components');
      }
    }
    
    // Check API files for company_id filtering
    const apiDir = path.join(this.projectRoot, 'pages/api');
    if (fs.existsSync(apiDir)) {
      const apiFiles = this.getFilesRecursively(apiDir, '.ts');
      let hasCompanyFiltering = false;
      
      apiFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('company_id') || content.includes('companyId')) {
          hasCompanyFiltering = true;
        }
      });
      
      if (hasCompanyFiltering) {
        this.addResult('passed', 'Multi-tenant', 'Company ID filtering found in APIs');
      } else {
        this.addResult('warning', 'Multi-tenant', 'No company_id filtering found in APIs');
      }
    }
  }

  // Security patterns check
  checkSecurityPatterns() {
    this.log('🔍 Checking security patterns...', 'info');
    
    // Check for hardcoded credentials
    const searchPatterns = [
      'password.*=.*["\']',
      'secret.*=.*["\']',
      'key.*=.*["\']',
      'token.*=.*["\']'
    ];
    
    const excludePatterns = [
      'node_modules',
      '.git',
      'package-lock.json',
      'yarn.lock',
      '.next',
      '.next/cache',
      '.next/static',
      '.next/server',
      '.next/standalone',
      'audit-reports',
      'test-files',
      '*.pack',
      '*.pack.gz',
      '*.js.map',
      '*.css',
      '*.html',
      '*.md',
      '*.txt',
      '*.log',
      '.env.production',
      '.env.local',
      '.env.example',
      '.swp',
      '.terraform',
      'terraform',
      '*.backup',
      '*.tmp'
    ];
    
    const allFiles = this.getAllFiles(this.projectRoot);
    let hasHardcodedSecrets = false;
    let checkedFiles = 0;
    
    allFiles.forEach(file => {
      // Skip excluded patterns
      if (excludePatterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(file);
        }
        return file.includes(pattern);
      })) return;
      
      // Skip binary files and build artifacts
      if (file.includes('.pack') || file.includes('.gz') || file.includes('.map')) return;
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        checkedFiles++;
        
        searchPatterns.forEach(pattern => {
          if (new RegExp(pattern, 'i').test(content)) {
            // Additional validation to avoid false positives
            const matches = content.match(new RegExp(pattern, 'gi'));
            if (matches) {
              const hasRealSecret = matches.some(match => {
                const value = match.split('=')[1]?.replace(/["']/g, '').trim();
                // More sophisticated validation
                return value && 
                       value.length > 5 && 
                       !value.includes('process.env') && 
                       !value.includes('NEXT_PUBLIC_') &&
                       !value.includes('your-') &&
                       !value.includes('placeholder') &&
                       !value.includes('example') &&
                       !value.includes('test') &&
                       !value.includes('demo') &&
                       !value.includes('sample') &&
                       !value.includes('default') &&
                       !value.includes('localhost') &&
                       !value.includes('127.0.0.1');
              });
              
              if (hasRealSecret) {
                hasHardcodedSecrets = true;
                this.addResult('failed', 'Security', `Potential hardcoded secret in: ${file}`);
              }
            }
          }
        });
      } catch (error) {
        // Skip binary files or files that can't be read
      }
    });
    
    if (!hasHardcodedSecrets) {
      this.addResult('passed', 'Security', `No hardcoded secrets found in ${checkedFiles} checked files`);
    }
  }

  // TypeScript configuration check
  checkTypeScriptConfig() {
    this.log('🔍 Checking TypeScript configuration...', 'info');
    
    const tsConfigPath = path.join(this.projectRoot, 'tsconfig.json');
    if (fs.existsSync(tsConfigPath)) {
      try {
        const tsConfigContent = fs.readFileSync(tsConfigPath, 'utf8');
        
        if (!tsConfigContent || tsConfigContent.trim() === '') {
          this.addResult('failed', 'TypeScript', 'tsconfig.json is empty');
          return;
        }
        
        const tsConfig = JSON.parse(tsConfigContent);
        
        if (!tsConfig || typeof tsConfig !== 'object') {
          this.addResult('failed', 'TypeScript', 'tsconfig.json is invalid JSON');
          return;
        }
        
        if (tsConfig.compilerOptions && tsConfig.compilerOptions.strict) {
          this.addResult('passed', 'TypeScript', 'Strict mode enabled');
        } else {
          this.addResult('warning', 'TypeScript', 'Strict mode not enabled');
        }
        
        if (tsConfig.compilerOptions && tsConfig.compilerOptions.noImplicitAny) {
          this.addResult('passed', 'TypeScript', 'No implicit any enabled');
        } else {
          this.addResult('warning', 'TypeScript', 'No implicit any not enabled');
        }
        
      } catch (error) {
        this.addResult('failed', 'TypeScript', `Error reading tsconfig.json: ${error.message}`);
      }
    } else {
      this.addResult('failed', 'TypeScript', 'tsconfig.json not found');
    }
  }

  // Helper methods
  getFilesRecursively(dir, extension) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath, extension));
      } else if (item.endsWith(extension)) {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  getAllFiles(dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  // Generate audit report
  generateReport() {
    this.log('\n📊 Generating audit report...', 'info');
    
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
    const reportPath = path.join(this.projectRoot, 'audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}HR SaaS SYSTEM AUDIT REPORT${colors.reset}`);
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
    this.log('🚀 Starting HR SaaS System Audit...', 'info');
    
    this.checkFileStructure();
    this.checkEnvironmentVariables();
    this.checkPackageJson();
    this.checkApiProtection();
    this.checkRouteProtection();
    this.checkSupabaseConfig();
    this.checkDatabaseMigrations();
    this.checkMultiTenantArchitecture();
    this.checkSecurityPatterns();
    this.checkTypeScriptConfig();
    
    const report = this.generateReport();
    
    // Exit with error code if there are failures
    if (report.summary.failed > 0) {
      this.log(`\n${colors.red}Audit completed with ${report.summary.failed} failures. Please address the issues above.${colors.reset}`, 'error');
      process.exit(1);
    } else {
      this.log(`\n${colors.green}✅ Audit completed successfully! All checks passed.${colors.reset}`, 'success');
      process.exit(0);
    }
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new SystemAuditor();
  auditor.runAudit().catch(error => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
}

module.exports = SystemAuditor; 