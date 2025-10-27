#!/usr/bin/env node

/**
 * Script to match participants from CSV with database participants
 * and update pronouns and Instagram handles
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'slam25_db',
  user: process.env.DB_USER || 'slam_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// CSV data parsing
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const participants = [];
  
  // Skip the first line (headers) and start from line 2
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line using a more robust method
    const fields = parseCSVLine(line);
    
    if (fields.length >= 8) {
      const participant = {
        name: fields[0]?.replace(/"/g, '').trim(),
        kunstlername: fields[1]?.replace(/"/g, '').trim(),
        pronomen: fields[2]?.replace(/"/g, '').trim(),
        geburtsdatum: fields[3]?.replace(/"/g, '').trim(),
        rolle: fields[4]?.replace(/"/g, '').trim(),
        email: fields[5]?.replace(/"/g, '').trim(),
        telefon: fields[6]?.replace(/"/g, '').trim(),
        instahandle: fields[7]?.replace(/"/g, '').trim(),
        checkin: fields[8]?.replace(/"/g, '').trim(),
        hotel: fields[9]?.replace(/"/g, '').trim(),
        telegram: fields[10]?.replace(/"/g, '').trim(),
        fotoEinwilligung: fields[11]?.replace(/"/g, '').trim(),
        codeOfConduct: fields[12]?.replace(/"/g, '').trim(),
        buddy: fields[13]?.replace(/"/g, '').trim(),
        schwarzesBrett: fields[14]?.replace(/"/g, '').trim(),
        szenebereich: fields[15]?.replace(/"/g, '').trim(),
        timetable: fields[16]?.replace(/"/g, '').trim(),
        briefings: fields[17]?.replace(/"/g, '').trim(),
        talentshow: fields[18]?.replace(/"/g, '').trim(),
        slammies: fields[19]?.replace(/"/g, '').trim(),
        baendchen: fields[20]?.replace(/"/g, '').trim(),
        goodieBag: fields[21]?.replace(/"/g, '').trim()
      };
      
      // Only include participants with names and valid roles
      if (participant.name && 
          participant.name !== '' && 
          participant.name !== 'undefined' &&
          participant.rolle && 
          participant.rolle !== '' &&
          participant.rolle !== 'undefined') {
        participants.push(participant);
      }
    }
  }
  
  return participants;
}

// Helper function to parse CSV line with proper quote handling
function parseCSVLine(line) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        currentField += '"';
        i += 2;
      } else {
        // Start or end of quoted field
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(currentField);
      currentField = '';
      i++;
    } else {
      // Regular character
      currentField += char;
      i++;
    }
  }
  
  // Add the last field
  fields.push(currentField);
  
  return fields;
}

// Name matching function
function normalizeName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    .replace(/[ä]/g, 'ae')
    .replace(/[ö]/g, 'oe')
    .replace(/[ü]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findBestMatch(csvParticipant, dbParticipants) {
  const csvName = normalizeName(csvParticipant.name);
  const csvKunstlername = normalizeName(csvParticipant.kunstlername);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const dbParticipant of dbParticipants) {
    const dbName = normalizeName(dbParticipant.name);
    
    // Exact match
    if (csvName === dbName) {
      return { participant: dbParticipant, score: 100, reason: 'exact_name' };
    }
    
    // Kunstlername match
    if (csvKunstlername && csvKunstlername === dbName) {
      return { participant: dbParticipant, score: 95, reason: 'kunstlername_match' };
    }
    
    // Check if CSV name contains DB name or vice versa (for cases like "Aidin Halimi Asl" vs "Aidin Halimi")
    if (csvName.includes(dbName) || dbName.includes(csvName)) {
      const score = Math.min(csvName.length, dbName.length) / Math.max(csvName.length, dbName.length) * 90;
      if (score > bestScore && score >= 60) {
        bestScore = score;
        bestMatch = { participant: dbParticipant, score, reason: 'name_contains' };
      }
    }
    
    // Partial match scoring
    const nameWords = csvName.split(' ');
    const dbWords = dbName.split(' ');
    
    let score = 0;
    let matchedWords = 0;
    
    for (const nameWord of nameWords) {
      if (nameWord.length < 2) continue; // Skip short words
      
      for (const dbWord of dbWords) {
        if (nameWord === dbWord) {
          score += 25;
          matchedWords++;
          break;
        } else if (nameWord.includes(dbWord) || dbWord.includes(nameWord)) {
          score += 15;
          matchedWords++;
          break;
        }
      }
    }
    
    // Bonus for matching all words
    if (matchedWords === nameWords.length && nameWords.length > 1) {
      score += 30;
    }
    
    // Bonus for matching most words
    if (matchedWords >= nameWords.length * 0.7) {
      score += 20;
    }
    
    if (score > bestScore && score >= 40) {
      bestScore = score;
      bestMatch = { participant: dbParticipant, score, reason: 'partial_match' };
    }
  }
  
  return bestMatch;
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting participant matching process...\n');
    
    // Read CSV file
    const csvPath = path.join(__dirname, '..', 'Mastersheet AKKREDITIERUNG - Tabellenblatt1.csv');
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found:', csvPath);
      process.exit(1);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvParticipants = parseCSV(csvContent);
    
    console.log(`📊 Found ${csvParticipants.length} participants in CSV`);
    
    // Fetch database participants
    const dbResult = await pool.query('SELECT id, name, role, region, pronouns, instagram FROM participants ORDER BY name');
    const dbParticipants = dbResult.rows;
    
    console.log(`📊 Found ${dbParticipants.length} participants in database\n`);
    
    // Match participants
    const matches = [];
    const unmatchedCSV = [];
    const unmatchedDB = [...dbParticipants];
    
    console.log('🔍 Matching participants...\n');
    
    for (const csvParticipant of csvParticipants) {
      const match = findBestMatch(csvParticipant, unmatchedDB);
      
      if (match && match.score >= 40) {
        matches.push({
          csv: csvParticipant,
          db: match.participant,
          score: match.score,
          reason: match.reason
        });
        
        // Remove matched participant from unmatched list
        const index = unmatchedDB.findIndex(p => p.id === match.participant.id);
        if (index !== -1) {
          unmatchedDB.splice(index, 1);
        }
      } else {
        unmatchedCSV.push(csvParticipant);
      }
    }
    
    console.log(`✅ Found ${matches.length} matches`);
    console.log(`❌ ${unmatchedCSV.length} CSV participants could not be matched`);
    console.log(`❌ ${unmatchedDB.length} database participants could not be matched\n`);
    
    // Display matches
    console.log('🎯 MATCHES FOUND:');
    console.log('================');
    matches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.csv.name} → ${match.db.name} (${match.score}% - ${match.reason})`);
      console.log(`   CSV: "${match.csv.pronomen}" | "${match.csv.instahandle}"`);
      console.log(`   DB:  "${match.db.pronouns || 'NULL'}" | "${match.db.instagram || 'NULL'}"`);
      console.log('');
    });
    
    // Display unmatched CSV participants
    if (unmatchedCSV.length > 0) {
      console.log('❌ UNMATCHED CSV PARTICIPANTS:');
      console.log('==============================');
      unmatchedCSV.forEach((participant, index) => {
        console.log(`${index + 1}. ${participant.name} (${participant.kunstlername || 'no kunstlername'})`);
        console.log(`   Role: ${participant.rolle}`);
        console.log(`   Pronouns: "${participant.pronomen}"`);
        console.log(`   Instagram: "${participant.instahandle}"`);
        console.log('');
      });
    }
    
    // Display unmatched database participants
    if (unmatchedDB.length > 0) {
      console.log('❌ UNMATCHED DATABASE PARTICIPANTS:');
      console.log('===================================');
      unmatchedDB.forEach((participant, index) => {
        console.log(`${index + 1}. ${participant.name}`);
        console.log(`   Role: ${participant.role}`);
        console.log(`   Region: ${participant.region || 'NULL'}`);
        console.log(`   Pronouns: "${participant.pronouns || 'NULL'}"`);
        console.log(`   Instagram: "${participant.instagram || 'NULL'}"`);
        console.log('');
      });
    }
    
    // Proceed with database updates
    if (matches.length > 0) {
      console.log('🔄 Ready to update database with pronouns and Instagram handles...');
      console.log('Proceeding with database updates...\n');
        
        console.log('\n🔄 Updating database...\n');
        
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const match of matches) {
          try {
            const updates = [];
            const values = [];
            let paramIndex = 1;
            
            // Check if pronouns need updating
            if (match.csv.pronomen && match.csv.pronomen.trim() !== '') {
              updates.push(`pronouns = $${paramIndex}`);
              values.push(match.csv.pronomen.trim());
              paramIndex++;
            }
            
            // Check if Instagram needs updating
            if (match.csv.instahandle && match.csv.instahandle.trim() !== '') {
              let instagramHandle = match.csv.instahandle.trim();
              // Remove @ if present
              if (instagramHandle.startsWith('@')) {
                instagramHandle = instagramHandle.substring(1);
              }
              updates.push(`instagram = $${paramIndex}`);
              values.push(instagramHandle);
              paramIndex++;
            }
            
            if (updates.length > 0) {
              values.push(match.db.id);
              const query = `UPDATE participants SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`;
              
              await pool.query(query, values);
              updatedCount++;
              
              console.log(`✅ Updated ${match.db.name} (ID: ${match.db.id})`);
            } else {
              console.log(`⏭️  Skipped ${match.db.name} - no updates needed`);
            }
          } catch (error) {
            console.error(`❌ Error updating ${match.db.name}:`, error.message);
            errorCount++;
          }
        }
        
        console.log(`\n🎉 Update complete!`);
        console.log(`✅ Updated: ${updatedCount} participants`);
        console.log(`❌ Errors: ${errorCount} participants`);
        
        await pool.end();
        process.exit(0);
    } else {
      console.log('ℹ️  No matches found to update.');
      await pool.end();
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n👋 Process interrupted by user');
  await pool.end();
  process.exit(0);
});

// Run the script
main();
