#!/usr/bin/env node

/**
 * CSV to Production Database Participant Comparison Script
 * 
 * Compares CSV participant data with production database, matches by unique first names,
 * identifies pronoun updates needed, and generates comprehensive reports.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load production environment variables
const envPath = path.join(__dirname, '..', '.env.deployment');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.deployment file not found. Please create it with production database credentials.');
  process.exit(1);
}

dotenv.config({ path: envPath });

const { Pool } = pg;

// Database connection configuration for Uberspace production
// We'll use SSH to connect to the Uberspace server and run queries there
const uberspaceConfig = {
  user: process.env.UBERSPACE_USER || 'slam25',
  host: process.env.UBERSPACE_HOST || 'slam25.uber.space',
  projectPath: process.env.PROJECT_NAME || 'slam25'
};

// Role mapping from CSV to database
const ROLE_MAPPING = {
  'Starter*in im Einzelwettbewerb': 'Wettbewerb-Teilnehmer*in',
  'Starter*in im Teamwettbewerb': 'Wettbewerb-Teilnehmer*in',
  'Starter*in im Einzel- und Teamwettbewerb': 'Wettbewerb-Teilnehmer*in',
  'Supporter*in': 'Supporter*in',
  'SLAM MC / Veranstalter*in': 'SLAM-MC',
  'SLAM MC': 'SLAM-MC',
  'ORGA': 'Organisator*in',
  'Awareness': null, // Skip - security/awareness roles
  'Begleitung': null, // Skip - not in database
  'Support': 'SLAM25-Team'
};

// Roles to exclude from database results
const EXCLUDED_DB_ROLES = ['Awareness', 'Security'];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseCSV(csvPath) {
  log('📄 Parsing CSV file...', 'blue');
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Skip header line
  const dataLines = lines.slice(1);
  
  const participants = [];
  
  for (const line of dataLines) {
    // Split by comma, but handle quoted fields
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim()); // Add last field
    
    if (fields.length >= 5) {
      const name = fields[0]?.trim();
      const artistName = fields[1]?.trim(); // Künstlername column
      const pronouns = fields[2]?.trim();
      const role = fields[4]?.trim();
      
      if (name && role && ROLE_MAPPING[role] !== null) {
        participants.push({
          name: name,
          artistName: artistName || null,
          pronouns: pronouns || null,
          role: role,
          mappedRole: ROLE_MAPPING[role]
        });
      }
    }
  }
  
  log(`✅ Parsed ${participants.length} participants from CSV`, 'green');
  return participants;
}

function extractFirstName(fullName) {
  return fullName.split(' ')[0].trim();
}

function extractFirstNameAndLastInitial(fullName) {
  const parts = fullName.split(' ').filter(part => part.trim());
  if (parts.length < 2) return fullName.trim();
  
  const firstName = parts[0].trim();
  const lastInitial = parts[parts.length - 1].charAt(0).toLowerCase();
  return `${firstName} ${lastInitial}`;
}

function createArtistNameVariations(artistName) {
  if (!artistName || artistName.trim() === '') return [];
  
  const variations = [];
  const trimmed = artistName.trim();
  
  // Add the full artist name
  variations.push(trimmed);
  
  // Add first name + last initial variation
  const firstLastInitial = extractFirstNameAndLastInitial(trimmed);
  if (firstLastInitial !== trimmed) {
    variations.push(firstLastInitial);
  }
  
  // Add just first name if it's different
  const firstName = extractFirstName(trimmed);
  if (firstName !== trimmed) {
    variations.push(firstName);
  }
  
  return variations;
}

function findUniqueFirstNames(participants) {
  const firstNameCounts = {};
  
  for (const participant of participants) {
    const firstName = extractFirstName(participant.name);
    firstNameCounts[firstName] = (firstNameCounts[firstName] || 0) + 1;
  }
  
  return Object.keys(firstNameCounts).filter(name => firstNameCounts[name] === 1);
}

function rolesAreCompatible(csvRole, dbRole) {
  // Direct match
  if (csvRole === dbRole) return true;
  
  // Check mapped role
  const mappedRole = ROLE_MAPPING[csvRole];
  if (mappedRole === dbRole) return true;
  
  // Special cases for role compatibility
  const compatibleRoles = {
    'SLAM-MC': ['Organisator*in'],
    'Organisator*in': ['SLAM-MC'],
    'SLAM25-Team': ['Organisator*in', 'SLAM-MC']
  };
  
  if (compatibleRoles[dbRole] && compatibleRoles[dbRole].includes(mappedRole)) {
    return true;
  }
  
  return false;
}

async function fetchDatabaseParticipants() {
  log('🗄️ Fetching participants from production database via SSH...', 'blue');
  
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  const query = `SELECT id, name, role, region, pronouns, instagram, slug FROM participants ORDER BY name`;
  
  // Escape the query for shell execution
  const escapedQuery = query.replace(/'/g, "'\"'\"'");
  
  const sshCommand = `ssh ${uberspaceConfig.user}@${uberspaceConfig.host} "cd ~/${uberspaceConfig.projectPath} && source .env && PGPASSWORD=\\$DB_PASSWORD psql -h localhost -U \\$DB_USER -d \\$DB_NAME -t -c '${escapedQuery}'"`;
  
  try {
    const { stdout, stderr } = await execAsync(sshCommand);
    
    if (stderr && !stderr.includes('Pager')) {
      log(`⚠️ SSH stderr: ${stderr}`, 'yellow');
    }
    
    // Parse the output
    const lines = stdout.trim().split('\n').filter(line => line.trim());
    const participants = [];
    
    for (const line of lines) {
      const fields = line.split('|').map(field => field.trim());
      if (fields.length >= 7) {
        const participant = {
          id: parseInt(fields[0]),
          name: fields[1],
          role: fields[2],
          region: fields[3] || null,
          pronouns: fields[4] || null,
          instagram: fields[5] || null,
          slug: fields[6]
        };
        
        // Filter out excluded roles
        if (!EXCLUDED_DB_ROLES.includes(participant.role)) {
          participants.push(participant);
        }
      }
    }
    
    log(`✅ Fetched ${participants.length} participants from database`, 'green');
    return participants;
    
  } catch (error) {
    log(`❌ SSH command failed: ${error.message}`, 'red');
    throw error;
  }
}

function findMatches(csvParticipants, dbParticipants) {
  log('🔍 Finding matches between CSV and database...', 'blue');
  
  const csvUniqueFirstNames = findUniqueFirstNames(csvParticipants);
  const dbUniqueFirstNames = findUniqueFirstNames(dbParticipants);
  
  log(`📊 CSV unique first names: ${csvUniqueFirstNames.length}`, 'cyan');
  log(`📊 DB unique first names: ${dbUniqueFirstNames.length}`, 'cyan');
  
  const matches = {
    confident: [],
    possible: [],
    exactNameMatches: [], // New category for exact name matches
    notInDb: [],
    notInCsv: []
  };
  
  // Find exact name matches first (regardless of role)
  const matchedCsvNames = new Set();
  const matchedDbIds = new Set();
  
  for (const csvParticipant of csvParticipants) {
    // Check for exact name match first
    const exactMatch = dbParticipants.find(p => 
      p.name.toLowerCase().trim() === csvParticipant.name.toLowerCase().trim()
    );
    
    if (exactMatch) {
      const isCompatible = rolesAreCompatible(csvParticipant.role, exactMatch.role);
      
      const match = {
        csv: csvParticipant,
        db: exactMatch,
        firstName: extractFirstName(csvParticipant.name),
        roleCompatible: isCompatible,
        isExactMatch: true
      };
      
      if (isCompatible) {
        matches.confident.push(match);
      } else {
        matches.exactNameMatches.push(match);
      }
      
      matchedCsvNames.add(csvParticipant.name);
      matchedDbIds.add(exactMatch.id);
    }
  }
  
  // Then find first name + last initial matches for remaining participants
  for (const csvParticipant of csvParticipants) {
    if (matchedCsvNames.has(csvParticipant.name)) continue;
    
    const firstName = extractFirstName(csvParticipant.name);
    const csvFirstLastInitial = extractFirstNameAndLastInitial(csvParticipant.name);
    
    if (csvUniqueFirstNames.includes(firstName)) {
      // Find matching database participant by first name + last initial
      const dbParticipant = dbParticipants.find(p => {
        if (matchedDbIds.has(p.id)) return false;
        
        const dbFirstLastInitial = extractFirstNameAndLastInitial(p.name);
        return dbFirstLastInitial.toLowerCase() === csvFirstLastInitial.toLowerCase();
      });
      
      if (dbParticipant) {
        const isCompatible = rolesAreCompatible(csvParticipant.role, dbParticipant.role);
        
        const match = {
          csv: csvParticipant,
          db: dbParticipant,
          firstName: firstName,
          roleCompatible: isCompatible,
          isExactMatch: false,
          matchType: 'firstNameLastInitial'
        };
        
        if (isCompatible) {
          matches.confident.push(match);
        } else {
          matches.exactNameMatches.push(match);
        }
        
        matchedCsvNames.add(csvParticipant.name);
        matchedDbIds.add(dbParticipant.id);
      }
    }
  }
  
  // Finally, try artist name matching for remaining participants
  for (const csvParticipant of csvParticipants) {
    if (matchedCsvNames.has(csvParticipant.name)) continue;
    
    // Try artist name variations if artist name exists
    let variations = [];
    if (csvParticipant.artistName) {
      variations = createArtistNameVariations(csvParticipant.artistName);
    } else {
      // If no artist name, try variations of the full name
      variations = createArtistNameVariations(csvParticipant.name);
    }
    
    for (const variation of variations) {
      const dbParticipant = dbParticipants.find(p => {
        if (matchedDbIds.has(p.id)) return false;
        
        // Try exact match with variation
        if (p.name.toLowerCase().trim() === variation.toLowerCase().trim()) {
          return true;
        }
        
        // Try first name + last initial match with variation
        const dbFirstLastInitial = extractFirstNameAndLastInitial(p.name);
        const variationFirstLastInitial = extractFirstNameAndLastInitial(variation);
        if (dbFirstLastInitial.toLowerCase() === variationFirstLastInitial.toLowerCase()) {
          return true;
        }
        
        return false;
      });
      
      if (dbParticipant) {
        const isCompatible = rolesAreCompatible(csvParticipant.role, dbParticipant.role);
        
        const match = {
          csv: csvParticipant,
          db: dbParticipant,
          firstName: extractFirstName(csvParticipant.name),
          roleCompatible: isCompatible,
          isExactMatch: false,
          matchType: csvParticipant.artistName ? 'artistName' : 'nameVariation',
          artistName: csvParticipant.artistName,
          matchedVariation: variation
        };
        
        if (isCompatible) {
          matches.confident.push(match);
        } else {
          matches.exactNameMatches.push(match);
        }
        
        matchedCsvNames.add(csvParticipant.name);
        matchedDbIds.add(dbParticipant.id);
        break; // Found a match, move to next CSV participant
      }
    }
  }
  
  // Find CSV participants not in database
  for (const csvParticipant of csvParticipants) {
    if (!matchedCsvNames.has(csvParticipant.name)) {
      matches.notInDb.push(csvParticipant);
    }
  }
  
  // Find database participants not in CSV
  for (const dbParticipant of dbParticipants) {
    if (!matchedDbIds.has(dbParticipant.id)) {
      matches.notInCsv.push(dbParticipant);
    }
  }
  
  log(`✅ Found ${matches.confident.length} confident matches`, 'green');
  log(`⚠️ Found ${matches.possible.length} possible matches (need review)`, 'yellow');
  log(`🎯 Found ${matches.exactNameMatches.length} exact name matches (different roles)`, 'cyan');
  log(`❌ Found ${matches.notInDb.length} CSV entries not in database`, 'red');
  log(`❌ Found ${matches.notInCsv.length} database entries not in CSV`, 'red');
  
  return matches;
}

function generatePronounUpdates(matches) {
  log('📝 Generating pronoun update statements...', 'blue');
  
  const updates = [];
  
  // Include confident matches (Section A)
  for (const match of matches.confident) {
    const { csv, db } = match;
    
    // Check if pronoun update is needed (only if DB has no pronouns and CSV has pronouns)
    const needsUpdate = (
      (!db.pronouns || db.pronouns.trim() === '') && 
      csv.pronouns && 
      csv.pronouns.trim() !== ''
    );
    
    if (needsUpdate) {
      updates.push({
        participant: db,
        newPronouns: csv.pronouns,
        sql: `UPDATE participants SET pronouns = '${csv.pronouns.replace(/'/g, "''")}' WHERE id = ${db.id}; -- ${db.name}`,
        matchType: 'confident'
      });
    }
  }
  
  // Include exact name matches (Section B) - regardless of role compatibility
  for (const match of matches.exactNameMatches) {
    const { csv, db } = match;
    
    // Check if pronoun update is needed
    const needsUpdate = (
      (!db.pronouns || db.pronouns.trim() === '') && 
      csv.pronouns && 
      csv.pronouns.trim() !== ''
    );
    
    if (needsUpdate) {
      updates.push({
        participant: db,
        newPronouns: csv.pronouns,
        sql: `UPDATE participants SET pronouns = '${csv.pronouns.replace(/'/g, "''")}' WHERE id = ${db.id}; -- ${db.name}`,
        matchType: 'exactName'
      });
    }
  }
  
  log(`✅ Generated ${updates.length} pronoun update statements`, 'green');
  return updates;
}

function generateReport(matches, pronounUpdates, csvParticipants, dbParticipants) {
  log('📋 Generating comparison report...', 'blue');
  
  // Filter out matches that don't need updates
  const matchesNeedingUpdates = matches.confident.filter(match => {
    const update = pronounUpdates.find(u => u.participant.id === match.db.id);
    return update !== undefined;
  });
  
  // Filter out excluded roles from not in CSV
  const notInCsvFiltered = matches.notInCsv.filter(participant => 
    !EXCLUDED_DB_ROLES.includes(participant.role)
  );
  
  // Get exact name matches that need updates
  const exactNameMatchesNeedingUpdates = matches.exactNameMatches.filter(match => {
    const update = pronounUpdates.find(u => u.participant.id === match.db.id);
    return update !== undefined;
  });
  
  const report = `# Participant Comparison Report
Generated: ${new Date().toISOString()}

## Summary Statistics

- **Total CSV entries**: ${csvParticipants.length}
- **Total DB participants**: ${dbParticipants.length}
- **Confident matches**: ${matches.confident.length}
- **Exact name matches**: ${matches.exactNameMatches.length}
- **Possible matches**: ${matches.possible.length}
- **Pronoun updates needed**: ${pronounUpdates.length}
- **Not in DB**: ${matches.notInDb.length}
- **Not in CSV**: ${notInCsvFiltered.length}

## A. Confident Matches (with pronoun updates)

${matchesNeedingUpdates.map(match => {
  const update = pronounUpdates.find(u => u.participant.id === match.db.id);
  const artistInfo = match.artistName ? `- **CSV Artist Name**: ${match.artistName}` : '';
  const matchInfo = match.matchType ? `- **Match Type**: ${match.matchType}` : '';
  const variationInfo = match.matchedVariation ? `- **Matched Variation**: ${match.matchedVariation}` : '';
  
  return `### ${match.csv.name} → ${match.db.name} (ID: ${match.db.id})
- **CSV Pronouns**: ${match.csv.pronouns || 'N/A'}
- **DB Pronouns**: ${match.db.pronouns || 'NULL'}
- **CSV Role**: ${match.csv.role} → ${match.csv.mappedRole}
- **DB Role**: ${match.db.role}
- **Role Compatible**: ${match.roleCompatible ? '✅' : '❌'}
${artistInfo}
${matchInfo}
${variationInfo}
- **Pronoun Update**: ✅ Needed
- **SQL**: \`${update.sql}\``;
}).join('\n\n')}

## B. Exact Name Matches (different roles, with pronoun updates)

${exactNameMatchesNeedingUpdates.map(match => {
  const update = pronounUpdates.find(u => u.participant.id === match.db.id);
  const artistInfo = match.artistName ? `- **CSV Artist Name**: ${match.artistName}` : '';
  const matchInfo = match.matchType ? `- **Match Type**: ${match.matchType}` : '';
  const variationInfo = match.matchedVariation ? `- **Matched Variation**: ${match.matchedVariation}` : '';
  
  return `### ${match.csv.name} → ${match.db.name} (ID: ${match.db.id})
- **CSV Pronouns**: ${match.csv.pronouns || 'N/A'}
- **DB Pronouns**: ${match.db.pronouns || 'NULL'}
- **CSV Role**: ${match.csv.role} → ${match.csv.mappedRole}
- **DB Role**: ${match.db.role}
- **Role Compatible**: ${match.roleCompatible ? '✅' : '❌'}
${artistInfo}
${matchInfo}
${variationInfo}
- **Pronoun Update**: ✅ Needed
- **SQL**: \`${update.sql}\``;
}).join('\n\n')}

## C. Possible Matches (needs review)

${matches.possible.map(match => {
  return `### ${match.csv.name} → ${match.db.name} (ID: ${match.db.id})
- **CSV Pronouns**: ${match.csv.pronouns || 'N/A'}
- **DB Pronouns**: ${match.db.pronouns || 'NULL'}
- **CSV Role**: ${match.csv.role} → ${match.csv.mappedRole}
- **DB Role**: ${match.db.role}
- **Role Compatible**: ${match.roleCompatible ? '✅' : '❌'}
- **Review Reason**: Role mismatch or other concerns`;
}).join('\n\n')}

## D. Not in Database

${matches.notInDb.map(participant => {
  return `### ${participant.name}
- **Pronouns**: ${participant.pronouns || 'N/A'}
- **Role**: ${participant.role} → ${participant.mappedRole}`;
}).join('\n\n')}

## E. Not in CSV

${notInCsvFiltered.map(participant => {
  return `### ${participant.name} (ID: ${participant.id})
- **Role**: ${participant.role}
- **Region**: ${participant.region || 'N/A'}
- **Pronouns**: ${participant.pronouns || 'NULL'}
- **Instagram**: ${participant.instagram || 'N/A'}`;
}).join('\n\n')}

## F. Role Mapping Reference

${Object.entries(ROLE_MAPPING).map(([csvRole, dbRole]) => {
  return `- **${csvRole}** → **${dbRole || 'SKIP'}**`;
}).join('\n')}
`;

  return report;
}

function generateSQLFile(pronounUpdates) {
  log('💾 Generating SQL update file...', 'blue');
  
  const sqlContent = `-- Pronoun Updates for SLAM25 Participants
-- Generated: ${new Date().toISOString()}
-- 
-- IMPORTANT: Review all updates before executing!
-- This script updates pronouns for participants matched between CSV and database.

BEGIN;

${pronounUpdates.map(update => update.sql).join('\n')}

COMMIT;

-- Summary:
-- ${pronounUpdates.length} pronoun updates applied
-- Participants updated: ${pronounUpdates.map(u => u.participant.name).join(', ')}
`;

  return sqlContent;
}

async function main() {
  try {
    log('🚀 Starting CSV to Database Participant Comparison', 'magenta');
    log('=' .repeat(60), 'magenta');
    
    // Check if CSV file exists
    const csvPath = path.join(__dirname, '..', 'Mastersheet AKKREDITIERUNG - Tabellenblatt1(1).csv');
    if (!fs.existsSync(csvPath)) {
      log(`❌ CSV file not found: ${csvPath}`, 'red');
      process.exit(1);
    }
    
    // Parse CSV data
    const csvParticipants = parseCSV(csvPath);
    
    // Fetch database participants via SSH
    const dbParticipants = await fetchDatabaseParticipants();
    
    // Find matches
    const matches = findMatches(csvParticipants, dbParticipants);
    
    // Generate pronoun updates
    const pronounUpdates = generatePronounUpdates(matches);
    
    // Generate report
    const report = generateReport(matches, pronounUpdates, csvParticipants, dbParticipants);
    
    // Generate SQL file
    const sqlContent = generateSQLFile(pronounUpdates);
    
    // Write output files
    const reportPath = path.join(__dirname, '..', 'participant-comparison-report.md');
    const sqlPath = path.join(__dirname, '..', 'pronoun-updates.sql');
    
    fs.writeFileSync(reportPath, report);
    fs.writeFileSync(sqlPath, sqlContent);
    
    log('=' .repeat(60), 'magenta');
    log('✅ Comparison completed successfully!', 'green');
    log(`📄 Report saved to: ${reportPath}`, 'cyan');
    log(`💾 SQL file saved to: ${sqlPath}`, 'cyan');
    log('=' .repeat(60), 'magenta');
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
