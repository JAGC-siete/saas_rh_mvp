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
const startupTimeout = setTimeout(() => {
  if (!serverStarted) {
    console.error('❌ TIMEOUT: Server did not start listening within 30 seconds');
    console.error('This usually means the server crashed during initialization');
    // Keep process alive for debugging
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
  
  // Require the server - this will execute the server.js code
  require('./server.js');
  
  // If we get here, server.js loaded successfully
  console.log('✅ server.js loaded successfully');
  
  // Monitor for server listening (Next.js logs "Ready on http://...")
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('Ready on') || message.includes('started server')) {
      serverStarted = true;
      clearTimeout(startupTimeout);
      console.log = originalLog; // Restore original
      console.log('✅ SERVER IS LISTENING:', ...args);
    }
    originalLog.apply(console, args);
  };
  
} catch (error) {
  console.error('❌ FATAL ERROR loading server.js:', error);
  console.error('Stack:', error.stack);
  clearTimeout(startupTimeout);
  
  // Keep process alive for debugging
  console.log('⚠️ Keeping process alive for 60 seconds to allow log inspection...');
  setTimeout(() => {
    console.log('⏰ Timeout reached, exiting...');
    process.exit(1);
  }, 60000);
}

