import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBulkOperations } from './useBulkOperations.js';
import { parseParticipantExcel, checkForDuplicates } from '../services/excelService.js';
import { normalizeInstagramInput } from '../utils/instagramUtils.js';
import { API_URL } from '../config/api.js';
import authService from '../services/authService.js';

/**
 * Hook for bulk importing participants from Excel files
 * Handles file parsing, validation, duplicate detection, and import
 */
export function useBulkImportParticipants() {
  const [importState, setImportState] = useState({
    isProcessing: false,
    parsedData: null,
    validationResults: null,
    importResults: null
  });

  const queryClient = useQueryClient();
  const { useBulkCreate } = useBulkOperations();
  
  // Use the bulk create mutation
  const bulkCreateMutation = useBulkCreate('participants', ['participants']);

  /**
   * Parse Excel file and validate data
   */
  const parseExcelFile = async (file) => {
    // Prevent multiple simultaneous parsing operations
    if (importState.isProcessing) {
      throw new Error('Ein Import-Vorgang läuft bereits');
    }
    
    setImportState(prev => ({ ...prev, isProcessing: true, parsedData: null, validationResults: null }));
    
    try {
      const parsedData = await parseParticipantExcel(file);
      
      setImportState(prev => ({
        ...prev,
        isProcessing: false,
        parsedData,
        validationResults: {
          totalRows: parsedData.totalRows,
          validRows: parsedData.validRows.length,
          errors: parsedData.errors,
          errorCount: parsedData.errors.length
        }
      }));
      
      return parsedData;
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        isProcessing: false,
        parsedData: null,
        validationResults: null
      }));
      throw error;
    }
  };

  /**
   * Check for duplicates against existing participants
   */
  const checkDuplicates = async (newParticipants) => {
    try {
      // Fetch existing participants to check for duplicates
      const response = await authService.authenticatedRequest(`${API_URL}/participants`);
      const existingParticipants = await response.json();
      
      const duplicateCheck = checkForDuplicates(newParticipants, existingParticipants.data || []);
      
      return duplicateCheck;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      // If we can't check duplicates, proceed with import but log the issue
      return {
        duplicates: [],
        uniqueParticipants: newParticipants,
        duplicateCount: 0
      };
    }
  };

  /**
   * Import validated participants
   */
  const importParticipants = async (participants) => {
    if (!participants || participants.length === 0) {
      throw new Error('Keine Teilnehmer zum Importieren gefunden');
    }

    // Normalize Instagram URLs for all participants
    const normalizedParticipants = participants.map(participant => ({
      ...participant,
      instagram: participant.instagram ? normalizeInstagramInput(participant.instagram) : ''
    }));

    try {
      const result = await bulkCreateMutation.mutateAsync(normalizedParticipants);
      
      setImportState(prev => ({
        ...prev,
        importResults: {
          success: true,
          importedCount: result.length,
          errors: []
        }
      }));
      
      return result;
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        importResults: {
          success: false,
          importedCount: 0,
          errors: [error.message]
        }
      }));
      throw error;
    }
  };

  /**
   * Complete import process: parse, validate, check duplicates, and import
   */
  const performBulkImport = async (file, existingParticipants = []) => {
    // Prevent multiple simultaneous imports
    if (importState.isProcessing) {
      throw new Error('Ein Import-Vorgang läuft bereits');
    }
    
    setImportState(prev => ({ ...prev, isProcessing: true, importResults: null }));
    
    try {
      // Step 1: Parse Excel file
      const parsedData = await parseExcelFile(file);
      
      if (parsedData.errors.length > 0) {
        throw new Error(`Validierungsfehler gefunden: ${parsedData.errors.length} Fehler`);
      }
      
      if (parsedData.validRows.length === 0) {
        throw new Error('Keine gültigen Teilnehmerdaten gefunden');
      }
      
      // Step 2: Check for duplicates
      const duplicateCheck = await checkDuplicates(parsedData.validRows);
      
      // Step 3: Import unique participants
      let importResults = {
        totalRows: parsedData.totalRows,
        validRows: parsedData.validRows.length,
        duplicates: duplicateCheck.duplicates,
        duplicateCount: duplicateCheck.duplicateCount,
        importedCount: 0,
        errors: [],
        success: false
      };
      
      if (duplicateCheck.uniqueParticipants.length > 0) {
        const importedParticipants = await importParticipants(duplicateCheck.uniqueParticipants);
        importResults.importedCount = importedParticipants.length;
        importResults.success = true;
      } else {
        importResults.errors.push('Alle Teilnehmer sind bereits vorhanden (Duplikate)');
      }
      
      setImportState(prev => ({
        ...prev,
        isProcessing: false,
        importResults
      }));
      
      return importResults;
      
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        isProcessing: false,
        importResults: {
          success: false,
          importedCount: 0,
          errors: [error.message],
          totalRows: 0,
          validRows: 0,
          duplicates: [],
          duplicateCount: 0
        }
      }));
      throw error;
    }
  };

  /**
   * Reset import state
   */
  const resetImport = () => {
    setImportState({
      isProcessing: false,
      parsedData: null,
      validationResults: null,
      importResults: null
    });
  };

  /**
   * Get import progress status
   */
  const getImportStatus = () => {
    if (importState.isProcessing) {
      return 'Verarbeitung läuft...';
    }
    
    if (importState.validationResults) {
      const { totalRows, validRows, errorCount } = importState.validationResults;
      return `${validRows} von ${totalRows} Zeilen gültig${errorCount > 0 ? `, ${errorCount} Fehler` : ''}`;
    }
    
    if (importState.importResults) {
      const { importedCount, duplicateCount } = importState.importResults;
      return `${importedCount} Teilnehmer importiert${duplicateCount > 0 ? `, ${duplicateCount} Duplikate übersprungen` : ''}`;
    }
    
    return 'Bereit für Import';
  };

  return {
    // State
    importState,
    isProcessing: importState.isProcessing,
    validationResults: importState.validationResults,
    importResults: importState.importResults,
    
    // Actions
    parseExcelFile,
    checkDuplicates,
    importParticipants,
    performBulkImport,
    resetImport,
    
    // Utilities
    getImportStatus,
    
    // Mutation state
    isImporting: bulkCreateMutation.isPending,
    importError: bulkCreateMutation.error
  };
}
