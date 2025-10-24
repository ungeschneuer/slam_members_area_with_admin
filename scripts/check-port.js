#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check what's running on port 3005
 */

const PORT = process.env.PORT || 3005;

async function checkPort() {
  try {
    console.log(`🔍 Checking port ${PORT}...`);
    
    const { stdout } = await execAsync(`lsof -i :${PORT}`);
    
    if (stdout.trim()) {
      console.log(`📋 Processes using port ${PORT}:`);
      console.log(stdout);
    } else {
      console.log(`✅ Port ${PORT} is available`);
    }
  } catch (error) {
    console.log(`✅ Port ${PORT} is available`);
  }
}

checkPort();
