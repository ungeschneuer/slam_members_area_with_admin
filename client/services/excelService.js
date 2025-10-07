import * as XLSX from 'xlsx';
import { z } from 'zod';
import { generateSlug } from '../utils/slugUtils.js';

// Validation schema for participant data
const participantSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  slug: z.string().min(1, 'Slug ist erforderlich'),
  role: z.string().min(1, 'Rolle ist erforderlich'),
  region: z.string().min(1, 'Region ist erforderlich'),
  pronouns: z.string().optional(),
  instagram: z.string().optional()
});

// Allowed roles and regions (matching AdminParticipants.jsx)
const allowedRoles = ['Teilnehmer*in', 'Supporter*in', 'Crew', 'SLAM-MC'];
const allowedRegions = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
  'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
  'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
  'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen',
  'Österreich', 'Schweiz', 'Belgien', 'Luxemburg', 'Südtirol'
];

/**
 * Generates an Excel template for participant import
 * @returns {Blob} Excel file as Blob
 */
export function generateParticipantTemplate() {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Define headers
  const headers = ['Name', 'Slug', 'Rolle', 'Region', 'Pronomen', 'Instagram'];
  
  // Create sample data row
  const sampleData = [
    'Max Mustermann',
    'max-mustermann',
    'Teilnehmer*in',
    'Berlin',
    'er/ihm',
    '@max_mustermann'
  ];
  
  // Create instructions row
  const instructions = [
    'ANLEITUNG: Füllen Sie die Zeilen mit Teilnehmerdaten aus. Erste Zeile ist ein Beispiel.',
    'Slug wird automatisch aus Name generiert, kann aber manuell angepasst werden',
    'Erlaubte Rollen: Teilnehmer*in, Supporter*in, Crew, SLAM-MC',
    'Erlaubte Regionen: Baden-Württemberg, Bayern, Berlin, Brandenburg, Bremen, Hamburg, Hessen, Mecklenburg-Vorpommern, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland, Sachsen, Sachsen-Anhalt, Schleswig-Holstein, Thüringen, Österreich, Schweiz, Belgien, Luxemburg, Südtirol',
    'Pronomen und Instagram sind optional',
    'Löschen Sie diese Anweisungszeile vor dem Import'
  ];
  
  // Create worksheet data
  const wsData = [
    headers,
    sampleData,
    instructions
  ];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Name
    { wch: 20 }, // Slug
    { wch: 15 }, // Rolle
    { wch: 20 }, // Region
    { wch: 15 }, // Pronomen
    { wch: 20 }  // Instagram
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Teilnehmer');
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Downloads the participant template
 */
export function downloadParticipantTemplate() {
  const template = generateParticipantTemplate();
  const url = URL.createObjectURL(template);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Teilnehmer_Vorlage.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// File size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 1000; // Maximum number of rows to process

/**
 * Parses an Excel file and extracts participant data
 * @param {File} file - Excel file to parse
 * @returns {Promise<Object>} Parsed data with valid rows and errors
 */
export async function parseParticipantExcel(file) {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Datei ist zu groß. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  
  // Check file type
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.ms-excel.sheet.macroEnabled.12' // .xlsm
  ];
  
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
    throw new Error('Nur Excel-Dateien (.xlsx, .xls) sind erlaubt');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Skip empty rows and find data rows (skip header and instruction rows)
        const dataRows = jsonData.filter((row, index) => {
          // Skip first row (headers) and instruction rows
          if (index === 0) return false;
          if (Array.isArray(row) && row.length > 0 && typeof row[0] === 'string' && row[0].includes('ANLEITUNG')) return false;
          if (Array.isArray(row) && row.length > 0 && typeof row[0] === 'string' && row[0].includes('Erlaubte')) return false;
          if (Array.isArray(row) && row.length > 0 && typeof row[0] === 'string' && row[0].includes('Pronomen')) return false;
          if (Array.isArray(row) && row.length > 0 && typeof row[0] === 'string' && row[0].includes('Löschen')) return false;
          // Include rows that have at least a name
          return Array.isArray(row) && row.length > 0 && row[0] && typeof row[0] === 'string' && row[0].trim() !== '';
        });
        
        // Check row limit
        if (dataRows.length > MAX_ROWS) {
          throw new Error(`Zu viele Zeilen. Maximum: ${MAX_ROWS} Zeilen`);
        }
        
        // Parse and validate each row
        const validRows = [];
        const errors = [];
        
        dataRows.forEach((row, index) => {
          const rowNumber = index + 2; // +2 because we skip header row and arrays are 0-indexed
          
          try {
            // Map array to object
            const name = row[0]?.toString().trim() || '';
            const slug = row[1]?.toString().trim() || '';
            const participantData = {
              name,
              slug: slug || generateSlug(name), // Auto-generate slug if empty
              role: row[2]?.toString().trim() || '',
              region: row[3]?.toString().trim() || '',
              pronouns: row[4]?.toString().trim() || '',
              instagram: row[5]?.toString().trim() || ''
            };
            
            // Validate with Zod schema
            const validationResult = participantSchema.safeParse(participantData);
            
            if (validationResult.success) {
              // Additional validation for role and region
              const roleValid = allowedRoles.includes(participantData.role);
              const regionValid = allowedRegions.includes(participantData.region);
              
              if (!roleValid) {
                errors.push({
                  row: rowNumber,
                  field: 'Rolle',
                  value: participantData.role,
                  message: `Ungültige Rolle. Erlaubte Werte: ${allowedRoles.join(', ')}`
                });
                return;
              }
              
              if (!regionValid) {
                errors.push({
                  row: rowNumber,
                  field: 'Region',
                  value: participantData.region,
                  message: `Ungültige Region. Erlaubte Werte: ${allowedRegions.join(', ')}`
                });
                return;
              }
              
              validRows.push(participantData);
            } else {
              // Handle Zod validation errors
              validationResult.error.errors.forEach(error => {
                errors.push({
                  row: rowNumber,
                  field: error.path[0],
                  value: participantData[error.path[0]],
                  message: error.message
                });
              });
            }
          } catch (error) {
            errors.push({
              row: rowNumber,
              field: 'Allgemein',
              value: '',
              message: `Fehler beim Parsen der Zeile: ${error.message}`
            });
          }
        });
        
        resolve({
          validRows,
          errors,
          totalRows: dataRows.length
        });
        
      } catch (error) {
        reject(new Error(`Fehler beim Lesen der Excel-Datei: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Fehler beim Lesen der Datei'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validates a single participant row
 * @param {Object} row - Participant data object
 * @param {number} index - Row index for error reporting
 * @returns {Object} Validation result with errors
 */
export function validateParticipantRow(row, index) {
  const validationResult = participantSchema.safeParse(row);
  
  if (validationResult.success) {
    // Additional validation for role and region
    const roleValid = allowedRoles.includes(row.role);
    const regionValid = allowedRegions.includes(row.region);
    
    const errors = [];
    
    if (!roleValid) {
      errors.push({
        row: index + 1,
        field: 'Rolle',
        value: row.role,
        message: `Ungültige Rolle. Erlaubte Werte: ${allowedRoles.join(', ')}`
      });
    }
    
    if (!regionValid) {
      errors.push({
        row: index + 1,
        field: 'Region',
        value: row.region,
        message: `Ungültige Region. Erlaubte Werte: ${allowedRegions.join(', ')}`
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } else {
    return {
      isValid: false,
      errors: validationResult.error.errors.map(error => ({
        row: index + 1,
        field: error.path[0],
        value: row[error.path[0]],
        message: error.message
      }))
    };
  }
}

/**
 * Checks for duplicate participants based on name and region
 * @param {Array} newParticipants - Array of new participant data
 * @param {Array} existingParticipants - Array of existing participants
 * @returns {Object} Duplicate information
 */
export function checkForDuplicates(newParticipants, existingParticipants) {
  const duplicates = [];
  const uniqueParticipants = [];
  
  newParticipants.forEach(participant => {
    const isDuplicate = existingParticipants.some(existing => 
      existing.name.toLowerCase().trim() === participant.name.toLowerCase().trim() &&
      existing.region.toLowerCase().trim() === participant.region.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      duplicates.push({
        name: participant.name,
        region: participant.region,
        reason: 'Teilnehmer mit diesem Namen und dieser Region existiert bereits'
      });
    } else {
      uniqueParticipants.push(participant);
    }
  });
  
  return {
    duplicates,
    uniqueParticipants,
    duplicateCount: duplicates.length
  };
}
