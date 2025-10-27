#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import { spawn } from 'child_process';

const execAsync = promisify(exec);

/**
 * Complete restart script for SLAM25 application
 * - Checks for available ports around goal ports (±10 ports)
 * - Kills existing processes on server and client ports
 * - Restarts both server and client completely
 */

const SERVER_GOAL_PORT = 3005;
const CLIENT_GOAL_PORT = 5173;
const PORT_RANGE = 10; // Check ±10 ports around goal

async function checkPortAvailability(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    return stdout.trim() === '';
  } catch (error) {
    return true; // Port is available if lsof fails
  }
}

async function findAvailablePorts(basePort, range = PORT_RANGE) {
  const availablePorts = [];
  
  console.log(`🔍 Checking ports around ${basePort} (±${range})...`);
  
  for (let i = basePort - range; i <= basePort + range; i++) {
    if (i < 1024) continue; // Skip system ports
    
    const isAvailable = await checkPortAvailability(i);
    if (isAvailable) {
      availablePorts.push(i);
    }
  }
  
  return availablePorts;
}

async function killProcessOnPort(port) {
  try {
    console.log(`🔍 Checking for processes on port ${port}...`);
    
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
      
      // Wait for port to be released
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log(`✅ Port ${port} is available`);
    }
  } catch (error) {
    console.log(`✅ Port ${port} is available`);
  }
}

async function killAllRelatedProcesses() {
  console.log('🛑 Killing all related processes...');
  
  // Kill server processes
  await killProcessOnPort(SERVER_GOAL_PORT);
  
  // Kill client processes
  await killProcessOnPort(CLIENT_GOAL_PORT);
  
  // Kill any node processes that might be related
  try {
    console.log('🔍 Checking for related Node.js processes...');
    const { stdout } = await execAsync('ps aux | grep -E "(node|npm|vite)" | grep -v grep');
    
    if (stdout.trim()) {
      console.log('🛑 Found related Node.js processes:');
      console.log(stdout);
      
      // Kill processes more gently first
      await execAsync('pkill -f "node.*server.js"');
      await execAsync('pkill -f "vite"');
      await execAsync('pkill -f "npm.*dev"');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force kill if still running
      await execAsync('pkill -9 -f "node.*server.js"');
      await execAsync('pkill -9 -f "vite"');
      await execAsync('pkill -9 -f "npm.*dev"');
    }
  } catch (error) {
    console.log('✅ No related processes found');
  }
}

async function startServer(port = SERVER_GOAL_PORT) {
  try {
    console.log(`🚀 Starting server on port ${port}...`);
    
    const serverProcess = spawn('node', ['server/server.js'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: port.toString() },
      detached: false
    });
    
    serverProcess.on('error', (error) => {
      console.error(`❌ Failed to start server: ${error.message}`);
      process.exit(1);
    });
    
    serverProcess.on('exit', (code) => {
      if (code !== 0) {
        console.log(`🔄 Server exited with code ${code}`);
      }
    });
    
    return serverProcess;
  } catch (error) {
    console.error(`❌ Failed to start server: ${error.message}`);
    throw error;
  }
}

async function startClient(port = CLIENT_GOAL_PORT) {
  try {
    console.log(`🚀 Starting client on port ${port}...`);
    
    const clientProcess = spawn('npm', ['run', 'dev:client'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: port.toString() },
      detached: false
    });
    
    clientProcess.on('error', (error) => {
      console.error(`❌ Failed to start client: ${error.message}`);
      process.exit(1);
    });
    
    clientProcess.on('exit', (code) => {
      if (code !== 0) {
        console.log(`🔄 Client exited with code ${code}`);
      }
    });
    
    return clientProcess;
  } catch (error) {
    console.error(`❌ Failed to start client: ${error.message}`);
    throw error;
  }
}

async function restartComplete() {
  console.log('🔄 Complete restart of SLAM25 application...');
  console.log('=====================================');
  
  // Step 1: Check available ports
  console.log('\n📋 Step 1: Checking available ports...');
  const serverPorts = await findAvailablePorts(SERVER_GOAL_PORT);
  const clientPorts = await findAvailablePorts(CLIENT_GOAL_PORT);
  
  console.log(`✅ Available server ports around ${SERVER_GOAL_PORT}: ${serverPorts.slice(0, 5).join(', ')}`);
  console.log(`✅ Available client ports around ${CLIENT_GOAL_PORT}: ${clientPorts.slice(0, 5).join(', ')}`);
  
  // Step 2: Kill all related processes
  console.log('\n📋 Step 2: Killing existing processes...');
  await killAllRelatedProcesses();
  
  // Step 3: Wait for ports to be released
  console.log('\n📋 Step 3: Waiting for ports to be released...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 4: Start server
  console.log('\n📋 Step 4: Starting server...');
  const serverProcess = await startServer(SERVER_GOAL_PORT);
  
  // Step 5: Wait a moment for server to start
  console.log('\n📋 Step 5: Waiting for server to initialize...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 6: Start client
  console.log('\n📋 Step 6: Starting client...');
  const clientProcess = await startClient(CLIENT_GOAL_PORT);
  
  // Step 7: Setup graceful shutdown
  console.log('\n📋 Step 7: Setting up graceful shutdown...');
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down application...');
    
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    if (clientProcess) {
      clientProcess.kill('SIGTERM');
    }
    
    // Wait for processes to exit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Force kill if still running
    if (serverProcess) {
      serverProcess.kill('SIGKILL');
    }
    if (clientProcess) {
      clientProcess.kill('SIGKILL');
    }
    
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down application...');
    
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    if (clientProcess) {
      clientProcess.kill('SIGTERM');
    }
    
    process.exit(0);
  });
  
  console.log('\n✅ Application restarted successfully!');
  console.log(`🌐 Server: http://localhost:${SERVER_GOAL_PORT}`);
  console.log(`🌐 Client: http://localhost:${CLIENT_GOAL_PORT}`);
  console.log('\nPress Ctrl+C to stop the application');
}

// Main execution
if (process.argv.includes('--restart') || process.argv.includes('-r')) {
  restartComplete();
} else {
  console.log('Usage: node scripts/restart-complete.js [--restart|-r]');
  console.log('  --restart, -r: Complete restart of server and client');
  console.log('\nThis script will:');
  console.log('1. Check for available ports around goal ports (±10)');
  console.log('2. Kill all existing processes');
  console.log('3. Restart both server and client');
  process.exit(1);
}
