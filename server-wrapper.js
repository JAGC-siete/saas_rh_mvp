#!/usr/bin/env node
/**
 * Server wrapper to ensure the Next.js server starts even with errors
 * This prevents the server from crashing silently before listening on the port
 */

const path = require('path');
const fs = require('fs');

// Set working directory
process.chdir(__dirname);

// Log startup attempt
console.log('🚀 Starting server wrapper...');
console.log('📁 Working directory:', __dirname);
console.log('🌐 PORT:', process.env.PORT || '8080');
console.log('🏠 HOSTNAME:', process.env.HOSTNAME || '0.0.0.0');
console.log('📦 NODE_ENV:', process.env.NODE_ENV || 'development');

// Verify server.js exists
const serverPath = path.join(__dirname, 'server.js');
if (!fs.existsSync(serverPath)) {
  console.error('❌ ERROR: server.js not found at', serverPath);
  console.error('📂 Files in directory:', fs.readdirSync(__dirname).join(', '));
  process.exit(1);
}

console.log('✅ server.js found at', serverPath);

// Set up error handlers BEFORE requiring server.js
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  // Don't exit - let the server try to recover
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  // Don't exit - let the server try to recover
});

// Add timeout to detect if server never starts listening
let serverStarted = false;
let logBuffer = [];

const startupTimeout = setTimeout(() => {
  if (!serverStarted) {
    console.error('❌ TIMEOUT: Server did not start listening within 30 seconds');
    console.error('This usually means the server crashed during initialization');
    console.error('');
    console.error('📋 DIAGNOSTIC INFORMATION:');
    console.error('  - Working directory:', __dirname);
    console.error('  - PORT:', process.env.PORT || '8080');
    console.error('  - HOSTNAME:', process.env.HOSTNAME || '0.0.0.0');
    console.error('  - NODE_ENV:', process.env.NODE_ENV || 'development');
    console.error('  - Node version:', process.version);
    console.error('  - Platform:', process.platform);
    console.error('');
    console.error('📝 Last 30 log entries:');
    logBuffer.slice(-30).forEach((entry, i) => {
      console.error(`  ${i + 1}. [${entry.type.toUpperCase()}] ${entry.message.substring(0, 200)}`);
    });
    console.error('');
    console.error('🔍 Checking if port is in use...');
    
    // Try to check if port is available
    const net = require('net');
    const port = parseInt(process.env.PORT || '8080', 10);
    const testServer = net.createServer();
    testServer.listen(port, '0.0.0.0', () => {
      console.error(`  ✅ Port ${port} is available`);
      testServer.close();
    });
    testServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`  ❌ Port ${port} is already in use!`);
      } else {
        console.error(`  ⚠️ Port check error: ${err.message}`);
      }
    });
    
    // Keep process alive for debugging
    console.log('');
    console.log('⚠️ Keeping process alive for 60 seconds to allow log inspection...');
    setTimeout(() => {
      console.log('⏰ Timeout reached, exiting...');
      process.exit(1);
    }, 60000);
  }
}, 30000);

// Try to start the server
try {
  console.log('📦 Loading server.js...');
  console.log('📊 Process memory:', {
    rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
  
  // Intercept console methods to detect server startup
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  let logBuffer = [];
  const maxBufferSize = 100;
  
  // Wrap console methods to capture logs
  console.log = function(...args) {
    const message = args.join(' ');
    logBuffer.push({ type: 'log', message, timestamp: new Date().toISOString() });
    if (logBuffer.length > maxBufferSize) logBuffer.shift();
    
    if (message.includes('Ready on') || message.includes('started server') || message.includes('Local:')) {
      serverStarted = true;
      clearTimeout(startupTimeout);
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.log('✅ SERVER IS LISTENING:', ...args);
      return;
    }
    originalLog.apply(console, args);
  };
  
  console.error = function(...args) {
    const message = args.join(' ');
    logBuffer.push({ type: 'error', message, timestamp: new Date().toISOString() });
    if (logBuffer.length > maxBufferSize) logBuffer.shift();
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.join(' ');
    logBuffer.push({ type: 'warn', message, timestamp: new Date().toISOString() });
    if (logBuffer.length > maxBufferSize) logBuffer.shift();
    originalWarn.apply(console, args);
  };
  
  // Require the server - this will execute the server.js code
  require('./server.js');
  
  // If we get here, server.js loaded successfully
  console.log('✅ server.js loaded successfully (but may not be listening yet)');
  
  // Check if server started after a short delay
  setTimeout(() => {
    if (!serverStarted) {
      console.log('⚠️ Server loaded but not listening yet. Recent logs:');
      logBuffer.slice(-20).forEach(entry => {
        console.log(`  [${entry.type.toUpperCase()}] ${entry.message}`);
      });
    }
  }, 5000);
  
} catch (error) {
  console.error('❌ FATAL ERROR loading server.js:', error);
  console.error('Stack:', error.stack);
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  clearTimeout(startupTimeout);
  
  // Keep process alive for debugging
  console.log('⚠️ Keeping process alive for 60 seconds to allow log inspection...');
  setTimeout(() => {
    console.log('⏰ Timeout reached, exiting...');
    process.exit(1);
  }, 60000);
}

