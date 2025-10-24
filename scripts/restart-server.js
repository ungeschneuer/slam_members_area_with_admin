#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Server restart script that handles port conflicts gracefully
 * This script will:
 * 1. Kill any existing processes on port 3005
 * 2. Start the server with proper error handling
 * 3. Provide restart functionality instead of starting new instances
 */

const PORT = process.env.PORT || 3005;

async function killProcessOnPort(port) {
  try {
    console.log(`🔍 Checking for processes on port ${port}...`);
    
    // Find processes using the port
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n');
      console.log(`🛑 Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);
      
      for (const pid of pids) {
        try {
          console.log(`🔪 Killing process ${pid}...`);
          await execAsync(`kill -9 ${pid}`);
          console.log(`✅ Process ${pid} terminated`);
        } catch (error) {
          console.log(`⚠️  Could not kill process ${pid}: ${error.message}`);
        }
      }
      
      // Wait a moment for the port to be released
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log(`✅ Port ${port} is available`);
    }
  } catch (error) {
    // No processes found on the port - this is fine
    console.log(`✅ Port ${port} is available`);
  }
}

async function startServer() {
  try {
    console.log(`🚀 Starting server on port ${PORT}...`);
    
    const { spawn } = await import('child_process');
    
    const serverProcess = spawn('node', ['server/server.js'], {
      stdio: 'inherit',
      env: { ...process.env, PORT }
    });
    
    serverProcess.on('error', (error) => {
      console.error(`❌ Failed to start server: ${error.message}`);
      process.exit(1);
    });
    
    serverProcess.on('exit', (code) => {
      if (code !== 0) {
        console.log(`🔄 Server exited with code ${code}. Use 'npm run restart' to restart.`);
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      serverProcess.kill('SIGTERM');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down server...');
      serverProcess.kill('SIGTERM');
      process.exit(0);
    });
    
  } catch (error) {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

async function restartServer() {
  console.log('🔄 Restarting SLAM25 server...');
  
  // Kill any existing processes
  await killProcessOnPort(PORT);
  
  // Start the server
  await startServer();
}

// Main execution
if (process.argv.includes('--restart') || process.argv.includes('-r')) {
  restartServer();
} else {
  console.log('Usage: node scripts/restart-server.js [--restart|-r]');
  console.log('  --restart, -r: Kill existing processes and restart server');
  process.exit(1);
}
