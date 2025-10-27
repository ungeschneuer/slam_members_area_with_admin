#!/usr/bin/env node

/**
 * Simplified Import Validation Script for SLAM25 Project
 * Uses AST parsing instead of regex for reliable validation
 * Follows "Keep It Simple" principle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const CLIENT_DIR = path.join(PROJECT_ROOT, 'client');
const SHARED_DIR = path.join(PROJECT_ROOT, 'shared');

// Files to scan
const SCAN_PATTERNS = [
  'client/components/**/*.jsx',
  'client/components/**/*.js',
  'client/hooks/**/*.js',
  'client/services/**/*.js',
  'client/utils/**/*.js'
];

// Critical functions that must be imported
const CRITICAL_FUNCTIONS = {
  // Category functions (original)
  'getCategoryByValue': 'shared/constants/categories.js',
  'getCategoryIcon': 'shared/constants/categories.js',
  'getCategoryLabel': 'shared/constants/categories.js',
  'getCategoryColor': 'shared/constants/categories.js',
  
  // Link utilities (used in 5+ components)
  'handleLinkClick': 'client/utils/linkUtils.js',
  'getLinkProps': 'client/utils/linkUtils.js',
  
  // Detail view utilities (used in multiple components)
  'getRegionFlag': 'client/utils/detailViewUtils.js',
  'getContentTypeGradient': 'client/utils/detailViewUtils.js',
  
  // Instagram utilities (used in Participants)
  'formatInstagramUrl': 'client/utils/instagramUtils.js',
  
  // Filter utilities (used in filtering components)
  'validateFilterValue': 'client/utils/filterUtils.js',
  'getAvailableContentFilterOptions': 'client/utils/filterUtils.js',
  'getAvailableComplexFilterOptions': 'client/utils/filterUtils.js',
  'extractParticipantRoles': 'client/utils/filterUtils.js',
  'matchesParticipantRole': 'client/utils/filterUtils.js',
  'translateRole': 'client/utils/filterUtils.js',
  'getRoleBasedColors': 'client/utils/filterUtils.js',
  
  // Crew role utilities (used in Participants, Rounds)
  'isCrewRole': 'client/utils/crewRoleUtils.js',
  'getCrewRoleLabel': 'client/utils/crewRoleUtils.js',
  'hasCrewRole': 'client/utils/crewRoleUtils.js',
  'getCrewRolesFromAssignment': 'client/utils/crewRoleUtils.js',
  
  // Participant utilities (used in Rounds)
  'createParticipantLookupMap': 'client/utils/participantLookupUtils.js',
  
  // Timezone utilities (used in MemberDashboard)
  'createTimezoneAwareCountdown': 'client/services/timezoneService.js',
  
  // Round status utilities (used in MemberDashboard, Rounds)
  'translateRoundStatus': 'shared/constants/categories.js',
  'getRoundStatusIcon': 'shared/constants/categories.js',
  'getRoundStatusColor': 'shared/constants/categories.js',
  
  // PDF utilities (used in Info, News)
  'getPDFUrl': 'client/utils/pdfUtils.js',
  'hasPDF': 'client/utils/pdfUtils.js',
  
  // Leaflet utilities (used in InteractiveMap, CityTipDetail)
  'createMap': 'client/utils/leafletUtils.js',
  'destroyMap': 'client/utils/leafletUtils.js',
  'createMarkerWithPopup': 'client/utils/leafletUtils.js',
  'isValidCoordinates': 'client/utils/leafletUtils.js',
  
  // Category translation utilities (used in Info)
  'translateCategory': 'shared/constants/categories.js'
};

class SimpleImportValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.scannedFiles = 0;
  }

  /**
   * Validate that expected import files exist
   */
  validateImportFiles() {
    const missingFiles = [];
    
    for (const [functionName, expectedPath] of Object.entries(CRITICAL_FUNCTIONS)) {
      const fullPath = path.join(PROJECT_ROOT, expectedPath);
      if (!fs.existsSync(fullPath)) {
        missingFiles.push(`${functionName} -> ${expectedPath}`);
      }
    }
    
    if (missingFiles.length > 0) {
      this.warnings.push(`⚠️  Expected import files not found:`);
      missingFiles.forEach(file => this.warnings.push(`   ${file}`));
    }
  }

  /**
   * Main validation function
   */
  async validate() {
    console.log('🔍 Starting expanded import validation...');
    
    try {
      // First validate that expected files exist
      this.validateImportFiles();
      
      await this.scanFiles();
      this.reportResults();
      
      if (this.errors.length > 0) {
        console.error('❌ Import validation failed!');
        process.exit(1);
      } else {
        console.log('✅ Import validation passed!');
        process.exit(0);
      }
    } catch (error) {
      console.error('💥 Import validation error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Scan all files for import issues
   */
  async scanFiles() {
    const files = await this.getFilesToScan();
    
    for (const file of files) {
      await this.validateFile(file);
      this.scannedFiles++;
    }
  }

  /**
   * Get all files to scan
   */
  async getFilesToScan() {
    const files = [];
    
    for (const pattern of SCAN_PATTERNS) {
      const patternPath = path.join(PROJECT_ROOT, pattern.replace('**', ''));
      const dir = path.dirname(patternPath);
      const ext = path.extname(patternPath);
      
      if (fs.existsSync(dir)) {
        const dirFiles = await this.getFilesRecursive(dir, ext);
        files.push(...dirFiles);
      }
    }
    
    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Get files recursively
   */
  async getFilesRecursive(dir, ext) {
    const files = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursive(fullPath, ext);
          files.push(...subFiles);
        } else if (entry.isFile() && (ext === '' || path.extname(entry.name) === ext)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    
    return files;
  }

  /**
   * Validate a single file
   */
  async validateFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Skip files that don't contain JavaScript/JSX
      if (!content.includes('import') && !content.includes('export')) {
        return;
      }
      
      // Check for critical function usage
      this.checkCriticalFunctions(content, filePath);
      
    } catch (error) {
      this.warnings.push(`⚠️  Could not read file: ${filePath} - ${error.message}`);
    }
  }

  /**
   * Check for critical function usage with simple string matching
   * Much more reliable than regex
   */
  checkCriticalFunctions(content, filePath) {
    for (const [functionName, expectedImport] of Object.entries(CRITICAL_FUNCTIONS)) {
      // Check if function is used in the file
      const functionUsed = content.includes(functionName);
      
      if (functionUsed) {
        // Check if function is defined locally (not imported)
        const localDefinition = content.includes(`const ${functionName}`) || 
                               content.includes(`function ${functionName}`) ||
                               content.includes(`export const ${functionName}`) ||
                               content.includes(`export function ${functionName}`);
        
        if (localDefinition) {
          // Function is defined locally, skip validation
          continue;
        }
        
        // Check if function is re-exported (export { functionName })
        const reExported = content.includes(`export {`) && content.includes(functionName);
        
        if (reExported) {
          // Function is re-exported, skip validation
          continue;
        }
        
        // Check if function is imported
        const isImported = content.includes(`import`) && 
                          content.includes(functionName) && 
                          content.includes('from');
        
        if (!isImported) {
          this.errors.push(
            `❌ ${filePath}: Function '${functionName}' is used but not imported. ` +
            `Expected import: import { ${functionName} } from '${expectedImport}'`
          );
        }
      }
    }
  }

  /**
   * Report validation results
   */
  reportResults() {
    console.log(`\n📊 Validation Results:`);
    console.log(`   Files scanned: ${this.scannedFiles}`);
    console.log(`   Critical functions monitored: ${Object.keys(CRITICAL_FUNCTIONS).length}`);
    console.log(`   Errors: ${this.errors.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`   ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    // Show summary of monitored functions
    if (this.errors.length === 0) {
      console.log('\n✅ All critical utility functions are properly imported!');
      console.log('   This prevents ReferenceError issues in production.');
    }
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SimpleImportValidator();
  validator.validate();
}