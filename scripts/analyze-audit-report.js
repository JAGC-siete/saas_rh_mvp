#!/usr/bin/env node

/**
 * HR SaaS Audit Report Analyzer
 * 
 * This script analyzes the audit report and provides:
 * - Categorized issues by priority
 * - Actionable recommendations
 * - Fix suggestions
 * - Progress tracking
 */

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

class AuditReportAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.analysis = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      falsePositives: [],
      recommendations: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const color = colors[type === 'error' ? 'red' : type === 'success' ? 'green' : type === 'warning' ? 'yellow' : 'blue'];
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  // Load audit report
  loadAuditReport() {
    const reportPath = path.join(this.projectRoot, 'audit-reports/system-audit-report.json');
    
    if (!fs.existsSync(reportPath)) {
      throw new Error('Audit report not found. Please run npm run audit first.');
    }
    
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  }

  // Categorize issues by priority
  categorizeIssues(failedChecks) {
    this.log('🔍 Categorizing issues by priority...', 'info');
    
    failedChecks.forEach(check => {
      const { category, message } = check;
      
      // Critical issues (security, authentication)
      if (category === 'Security' || category === 'API Protection' || category === 'Route Protection') {
        this.analysis.critical.push(check);
      }
      // High priority (configuration, dependencies)
      else if (category === 'Dependencies' || category === 'Package.json' || category === 'TypeScript') {
        this.analysis.high.push(check);
      }
      // Medium priority (structure, environment)
      else if (category === 'File Structure' || category === 'Environment' || category === 'Supabase Config') {
        this.analysis.medium.push(check);
      }
      // Low priority (warnings, info)
      else {
        this.analysis.low.push(check);
      }
      
      // Identify false positives
      if (this.isFalsePositive(check)) {
        this.analysis.falsePositives.push(check);
      }
    });
  }

  // Identify false positives
  isFalsePositive(check) {
    const { category, message } = check;
    
    // Security false positives (build files, cache)
    if (category === 'Security' && (
      message.includes('.next/') ||
      message.includes('.pack') ||
      message.includes('.gz') ||
      message.includes('.map') ||
      message.includes('.css') ||
      message.includes('.html')
    )) {
      return true;
    }
    
    // API Protection false positives (public APIs)
    if (category === 'API Protection' && (
      message.includes('health.ts') ||
      message.includes('env-check.ts') ||
      message.includes('test-supabase.ts') ||
      message.includes('test.ts')
    )) {
      return true;
    }
    
    // Route Protection false positives (public pages)
    if (category === 'Route Protection' && (
      message.includes('login.tsx') ||
      message.includes('unauthorized.tsx')
    )) {
      return true;
    }
    
    return false;
  }

  // Generate recommendations
  generateRecommendations() {
    this.log('💡 Generating recommendations...', 'info');
    
    // Critical recommendations
    if (this.analysis.critical.length > 0) {
      this.analysis.recommendations.push({
        priority: 'CRITICAL',
        title: 'Fix Security and Authentication Issues',
        description: 'These issues must be addressed immediately as they pose security risks.',
        actions: [
          'Run: npm run audit:fix to automatically fix common issues',
          'Add authentication to unprotected APIs',
          'Add ProtectedRoute to unprotected pages',
          'Review and fix any hardcoded secrets',
          'Test authentication flow thoroughly'
        ],
        count: this.analysis.critical.length
      });
    }
    
    // High priority recommendations
    if (this.analysis.high.length > 0) {
      this.analysis.recommendations.push({
        priority: 'HIGH',
        title: 'Fix Configuration Issues',
        description: 'These issues affect the build and development process.',
        actions: [
          'Fix package.json configuration',
          'Update TypeScript configuration',
          'Install missing dependencies',
          'Verify environment variables'
        ],
        count: this.analysis.high.length
      });
    }
    
    // Medium priority recommendations
    if (this.analysis.medium.length > 0) {
      this.analysis.recommendations.push({
        priority: 'MEDIUM',
        title: 'Improve Project Structure',
        description: 'These issues affect maintainability and organization.',
        actions: [
          'Create missing directories and files',
          'Update project structure',
          'Improve Supabase configuration',
          'Add missing environment templates'
        ],
        count: this.analysis.medium.length
      });
    }
    
    // False positives
    if (this.analysis.falsePositives.length > 0) {
      this.analysis.recommendations.push({
        priority: 'INFO',
        title: 'False Positives Identified',
        description: 'These are not actual issues and can be ignored.',
        actions: [
          'Update audit script to exclude build files',
          'Configure proper exclusions for security checks',
          'Review public API and page configurations'
        ],
        count: this.analysis.falsePositives.length
      });
    }
  }

  // Generate fix commands
  generateFixCommands() {
    const commands = [];
    
    if (this.analysis.critical.length > 0) {
      commands.push('npm run audit:fix');
    }
    
    if (this.analysis.high.some(issue => issue.category === 'Dependencies')) {
      commands.push('npm install');
    }
    
    if (this.analysis.high.some(issue => issue.category === 'TypeScript')) {
      commands.push('npm run lint');
    }
    
    return commands;
  }

  // Print analysis report
  printAnalysis() {
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bright}HR SaaS AUDIT ANALYSIS REPORT${colors.reset}`);
    console.log('='.repeat(80));
    
    // Summary
    const totalIssues = this.analysis.critical.length + this.analysis.high.length + 
                       this.analysis.medium.length + this.analysis.low.length;
    const realIssues = totalIssues - this.analysis.falsePositives.length;
    
    console.log(`\n${colors.cyan}📊 SUMMARY:${colors.reset}`);
    console.log(`Total Issues: ${totalIssues}`);
    console.log(`${colors.red}Critical: ${this.analysis.critical.length}${colors.reset}`);
    console.log(`${colors.yellow}High: ${this.analysis.high.length}${colors.reset}`);
    console.log(`${colors.blue}Medium: ${this.analysis.medium.length}${colors.reset}`);
    console.log(`${colors.green}Low: ${this.analysis.low.length}${colors.reset}`);
    console.log(`${colors.magenta}False Positives: ${this.analysis.falsePositives.length}${colors.reset}`);
    console.log(`${colors.bright}Real Issues: ${realIssues}${colors.reset}`);
    
    // Critical issues
    if (this.analysis.critical.length > 0) {
      console.log(`\n${colors.red}🚨 CRITICAL ISSUES (${this.analysis.critical.length}):${colors.reset}`);
      this.analysis.critical.forEach(issue => {
        console.log(`  • ${issue.category}: ${issue.message}`);
      });
    }
    
    // High priority issues
    if (this.analysis.high.length > 0) {
      console.log(`\n${colors.yellow}⚠️  HIGH PRIORITY ISSUES (${this.analysis.high.length}):${colors.reset}`);
      this.analysis.high.forEach(issue => {
        console.log(`  • ${issue.category}: ${issue.message}`);
      });
    }
    
    // Medium priority issues
    if (this.analysis.medium.length > 0) {
      console.log(`\n${colors.blue}ℹ️  MEDIUM PRIORITY ISSUES (${this.analysis.medium.length}):${colors.reset}`);
      this.analysis.medium.forEach(issue => {
        console.log(`  • ${issue.category}: ${issue.message}`);
      });
    }
    
    // False positives
    if (this.analysis.falsePositives.length > 0) {
      console.log(`\n${colors.magenta}🔍 FALSE POSITIVES (${this.analysis.falsePositives.length}):${colors.reset}`);
      this.analysis.falsePositives.forEach(issue => {
        console.log(`  • ${issue.category}: ${issue.message}`);
      });
    }
    
    // Recommendations
    console.log(`\n${colors.green}💡 RECOMMENDATIONS:${colors.reset}`);
    this.analysis.recommendations.forEach(rec => {
      const priorityColor = rec.priority === 'CRITICAL' ? colors.red : 
                           rec.priority === 'HIGH' ? colors.yellow : 
                           rec.priority === 'MEDIUM' ? colors.blue : colors.magenta;
      
      console.log(`\n${priorityColor}${rec.priority}${colors.reset}: ${rec.title} (${rec.count} issues)`);
      console.log(`  ${rec.description}`);
      console.log(`  Actions:`);
      rec.actions.forEach(action => {
        console.log(`    • ${action}`);
      });
    });
    
    // Quick fix commands
    const fixCommands = this.generateFixCommands();
    if (fixCommands.length > 0) {
      console.log(`\n${colors.cyan}⚡ QUICK FIX COMMANDS:${colors.reset}`);
      fixCommands.forEach(cmd => {
        console.log(`  $ ${cmd}`);
      });
    }
    
    // Next steps
    console.log(`\n${colors.bright}🎯 NEXT STEPS:${colors.reset}`);
    if (realIssues === 0) {
      console.log(`  ✅ No real issues found! Your system is compliant.`);
    } else if (this.analysis.critical.length > 0) {
      console.log(`  1. ${colors.red}URGENT:${colors.reset} Run 'npm run audit:fix' to fix critical issues`);
      console.log(`  2. Review the changes made by the fix script`);
      console.log(`  3. Test the application thoroughly`);
      console.log(`  4. Run 'npm run audit' again to verify fixes`);
    } else {
      console.log(`  1. Address high priority issues first`);
      console.log(`  2. Fix configuration problems`);
      console.log(`  3. Run 'npm run audit' again to verify progress`);
    }
    
    console.log('\n' + '='.repeat(80));
  }

  // Save analysis report
  saveAnalysisReport() {
    const reportPath = path.join(this.projectRoot, 'audit-reports/analysis-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      analysis: this.analysis,
      summary: {
        total: this.analysis.critical.length + this.analysis.high.length + 
               this.analysis.medium.length + this.analysis.low.length,
        critical: this.analysis.critical.length,
        high: this.analysis.high.length,
        medium: this.analysis.medium.length,
        low: this.analysis.low.length,
        falsePositives: this.analysis.falsePositives.length,
        realIssues: (this.analysis.critical.length + this.analysis.high.length + 
                    this.analysis.medium.length + this.analysis.low.length) - 
                    this.analysis.falsePositives.length
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📄 Analysis report saved to: ${reportPath}`, 'info');
  }

  // Run analysis
  async runAnalysis() {
    this.log('🚀 Starting audit report analysis...', 'info');
    
    try {
      const report = this.loadAuditReport();
      const failedChecks = report.results.failed || [];
      
      this.categorizeIssues(failedChecks);
      this.generateRecommendations();
      this.printAnalysis();
      this.saveAnalysisReport();
      
      const realIssues = (this.analysis.critical.length + this.analysis.high.length + 
                         this.analysis.medium.length + this.analysis.low.length) - 
                         this.analysis.falsePositives.length;
      
      if (realIssues === 0) {
        this.log(`\n${colors.green}🎉 Analysis complete! No real issues found.${colors.reset}`, 'success');
        process.exit(0);
      } else if (this.analysis.critical.length > 0) {
        this.log(`\n${colors.red}⚠️  Analysis complete! ${realIssues} real issues found, ${this.analysis.critical.length} are critical.${colors.reset}`, 'warning');
        process.exit(1);
      } else {
        this.log(`\n${colors.yellow}⚠️  Analysis complete! ${realIssues} real issues found.${colors.reset}`, 'warning');
        process.exit(0);
      }
    } catch (error) {
      this.log(`\n${colors.red}❌ Analysis failed: ${error.message}${colors.reset}`, 'error');
      process.exit(1);
    }
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new AuditReportAnalyzer();
  analyzer.runAnalysis().catch(error => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = AuditReportAnalyzer; 