import * as XLSX from 'xlsx';
import { z } from 'zod';
import { generateSlug, generateUniqueSlug } from '../utils/slugUtils.js';

// Column indices for Excel/CSV templates
const TEMPLATE_COLUMNS = {
  NAME: 0,
  ROLE: 1,
  REGION: 2,
  PRONOUNS: 3,
  INSTAGRAM: 4
};

// Validation schema for participant data
const participantSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  slug: z.string().min(1, 'Slug ist erforderlich'),
  role: z.string().min(1, 'Rolle ist erforderlich'),
  region: z.string().optional(),
  pronouns: z.string().optional(),
  instagram: z.string().optional()
});

// Allowed roles and regions (matching AdminParticipants.jsx)
const allowedRoles = ['Teilnehmer*in', 'Supporter*in', 'Crew', 'SLAM-MC'];
const allowedRegions = [
  'Bayern',
  'Baden-Württemberg',
  'Berlin-Brandenburg',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen/Bremen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
  'Liechtenstein',
  'Luxemburg',
  'Österreich',
  'Ostbelgien',
  'Schweiz',
  'Südtirol',
  'Slam Alphas',
  'BiPOC/Migra',
  'i,Slam',
  'TINte',
  'U20',
  'Chemnitz'
];

/**
 * Generates an Excel template for participant import with data validation
 * @returns {Blob} Excel file as Blob
 */
export function generateParticipantTemplate() {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Define headers
  const headers = ['Name', 'Rolle', 'Region', 'Pronomen', 'Instagram'];
  
  // Create sample data row
  const sampleData = [
    'Max Mustermann',
    'Teilnehmer*in',
    'Berlin',
    'er/ihm',
    '@max_mustermann'
  ];
  
  // Create instructions row
  const instructions = [
    'ANLEITUNG: Füllen Sie die Zeilen mit Teilnehmerdaten aus. Erste Zeile ist ein Beispiel.',
    'Rolle: Verwenden Sie die Dropdown-Liste für gültige Werte',
    'Region: Verwenden Sie die Dropdown-Liste für gültige Werte',
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
    { wch: 15 }, // Rolle
    { wch: 20 }, // Region
    { wch: 15 }, // Pronomen
    { wch: 20 }  // Instagram
  ];
  
  // Add data validation for Role column (column C, index 2)
  const roleValidation = {
    type: 'list',
    allowBlank: false,
    formula1: `"${allowedRoles.join(',')}"`,
    showErrorMessage: true,
    errorTitle: 'Ungültige Rolle',
    error: 'Bitte wählen Sie eine gültige Rolle aus der Liste aus.',
    showInputMessage: true,
    promptTitle: 'Rolle auswählen',
    prompt: 'Wählen Sie eine Rolle aus der Dropdown-Liste aus.'
  };
  
  // Add data validation for Region column (column D, index 3)
  const regionValidation = {
    type: 'list',
    allowBlank: true,
    formula1: `"${allowedRegions.join(',')}"`,
    showErrorMessage: true,
    errorTitle: 'Ungültige Region',
    error: 'Bitte wählen Sie eine gültige Region aus der Liste aus.',
    showInputMessage: true,
    promptTitle: 'Region auswählen',
    prompt: 'Wählen Sie eine Region aus der Dropdown-Liste aus (optional).'
  };
  
  // Apply validation to all data rows (starting from row 3, excluding header and sample)
  // We'll apply to a reasonable range (rows 3-1000)
  for (let row = 3; row <= 1000; row++) {
    // Role validation (column B, index 1)
    const roleCell = XLSX.utils.encode_cell({ r: row - 1, c: TEMPLATE_COLUMNS.ROLE });
    if (!ws[roleCell]) {
      ws[roleCell] = { t: 's', v: '' };
    }
    ws[roleCell].dv = roleValidation;
    
    // Region validation (column C, index 2)
    const regionCell = XLSX.utils.encode_cell({ r: row - 1, c: TEMPLATE_COLUMNS.REGION });
    if (!ws[regionCell]) {
      ws[regionCell] = { t: 's', v: '' };
    }
    ws[regionCell].dv = regionValidation;
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Teilnehmer');
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Downloads the participant template as Excel
 */
export function downloadParticipantTemplate() {
  try {
    const template = generateParticipantTemplate();
    const url = URL.createObjectURL(template);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Teilnehmer_Vorlage.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating Excel template:', error);
    // Fallback to CSV if Excel generation fails
    downloadParticipantTemplateCSV();
  }
}

/**
 * Downloads the participant template as CSV
 */
export function downloadParticipantTemplateCSV() {
  const headers = ['Name', 'Rolle', 'Region', 'Pronomen', 'Instagram'];
  const sampleData = [
    'Max Mustermann',
    'Teilnehmer*in',
    'Berlin',
    'er/ihm',
    '@max_mustermann'
  ];
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    sampleData.join(','),
    '',
    'ANLEITUNG:',
    'Füllen Sie die Zeilen mit Teilnehmerdaten aus. Erste Zeile ist ein Beispiel.',
    'Rolle: Verwenden Sie einen der erlaubten Werte',
    'Region: Verwenden Sie eine der erlaubten Regionen',
    'Pronomen und Instagram sind optional',
    'Löschen Sie diese Anweisungszeile vor dem Import',
    '',
    'Erlaubte Rollen:',
    allowedRoles.join(', '),
    '',
    'Erlaubte Regionen:',
    allowedRegions.join(', ')
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Teilnehmer_Vorlage.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// File size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 1000; // Maximum number of rows to process

/**
 * Parses a CSV file and extracts participant data
 * @param {File} file - CSV file to parse
 * @returns {Promise<Object>} Parsed data with valid rows and errors
 */
export async function parseParticipantCSV(file) {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Datei ist zu groß. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  
  // Check file type
  if (!file.type.includes('text/csv') && !file.name.match(/\.csv$/i)) {
    throw new Error('Nur CSV-Dateien (.csv) sind erlaubt');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        // Skip instruction lines
        const dataLines = lines.filter(line => 
          !line.includes('ANLEITUNG:') && 
          !line.includes('Erlaubte Rollen:') && 
          !line.includes('Erlaubte Regionen:') &&
          !line.includes('Füllen Sie die Zeilen') &&
          !line.includes('Slug wird automatisch') &&
          !line.includes('Rolle: Verwenden Sie') &&
          !line.includes('Region: Verwenden Sie') &&
          !line.includes('Pronomen und Instagram') &&
          !line.includes('Löschen Sie diese')
        );
        
        // Check row limit
        if (dataLines.length > MAX_ROWS) {
          throw new Error(`Zu viele Zeilen. Maximum: ${MAX_ROWS} Zeilen`);
        }
        
        // Parse CSV data
        const validRows = [];
        const errors = [];
        const batchSlugs = []; // Track slugs within this batch
        
        dataLines.forEach((line, index) => {
          if (index === 0) return; // Skip header
          
          const rowNumber = index + 1;
          const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
          
          if (columns.length < 4) return; // Skip incomplete rows
          
          try {
            const name = columns[TEMPLATE_COLUMNS.NAME] || '';
            
            // Generate unique slug considering already parsed slugs
            let slug;
            try {
              slug = generateUniqueSlug(name, batchSlugs);
              batchSlugs.push(slug); // Track for next rows
            } catch (slugError) {
              errors.push({
                row: rowNumber,
                field: 'Name',
                value: name,
                message: slugError.message
              });
              return;
            }
            
            const participantData = {
              name,
              slug,
              role: columns[TEMPLATE_COLUMNS.ROLE] || '',
              region: columns[TEMPLATE_COLUMNS.REGION] || '',
              pronouns: columns[TEMPLATE_COLUMNS.PRONOUNS] || '',
              instagram: columns[TEMPLATE_COLUMNS.INSTAGRAM] || ''
            };
            
            // Validate with Zod schema
            const validationResult = participantSchema.safeParse(participantData);
            
            if (validationResult.success) {
              // Additional validation for role and region
              const roleValid = allowedRoles.includes(participantData.role);
              const regionValid = !participantData.region || allowedRegions.includes(participantData.region);
              
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
          totalRows: dataLines.length
        });
        
      } catch (error) {
        reject(new Error(`Fehler beim Lesen der CSV-Datei: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Fehler beim Lesen der Datei'));
    };
    
    reader.readAsText(file);
  });
}

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
        const batchSlugs = []; // Track slugs within this batch
        
        dataRows.forEach((row, index) => {
          const rowNumber = index + 2; // +2 because we skip header row and arrays are 0-indexed
          
          try {
            const name = row[TEMPLATE_COLUMNS.NAME]?.toString().trim() || '';
            
            // Generate unique slug considering already parsed slugs
            let slug;
            try {
              slug = generateUniqueSlug(name, batchSlugs);
              batchSlugs.push(slug); // Track for next rows
            } catch (slugError) {
              errors.push({
                row: rowNumber,
                field: 'Name',
                value: name,
                message: slugError.message
              });
              return;
            }
            
            const participantData = {
              name,
              slug,
              role: row[TEMPLATE_COLUMNS.ROLE]?.toString().trim() || '',
              region: row[TEMPLATE_COLUMNS.REGION]?.toString().trim() || '',
              pronouns: row[TEMPLATE_COLUMNS.PRONOUNS]?.toString().trim() || '',
              instagram: row[TEMPLATE_COLUMNS.INSTAGRAM]?.toString().trim() || ''
            };
            
            // Validate with Zod schema
            const validationResult = participantSchema.safeParse(participantData);
            
            if (validationResult.success) {
              // Additional validation for role and region
              const roleValid = allowedRoles.includes(participantData.role);
              const regionValid = !participantData.region || allowedRegions.includes(participantData.region);
              
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
    const regionValid = !row.region || allowedRegions.includes(row.region);
    
    const errors = [];
    
    if (!roleValid) {
      errors.push({
        row: index + 1,
        field: 'Rolle',
        value: row.role,
        message: `Ungültige Rolle. Erlaubte Werte: ${allowedRoles.join(', ')}`
      });
    }
    
    if (!regionValid && row.region) {
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
 * Universal file parser that handles both Excel and CSV files
 * @param {File} file - File to parse (Excel or CSV)
 * @returns {Promise<Object>} Parsed data with valid rows and errors
 */
export async function parseParticipantFile(file) {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.csv')) {
    return await parseParticipantCSV(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return await parseParticipantExcel(file);
  } else {
    throw new Error('Nur Excel (.xlsx, .xls) und CSV (.csv) Dateien sind erlaubt');
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
