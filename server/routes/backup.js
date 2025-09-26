import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { createBackup, restoreBackup, listBackups, deleteBackup } from '../services/backupService.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const validateBackupRequest = [
  body('type').optional().isIn(['full', 'data-only', 'schema-only']),
  body('description').optional().isLength({ max: 500 })
];

const validateRestoreRequest = [
  body('backupId').isInt({ min: 1 }),
  body('confirm').equals('true').withMessage('Restore confirmation required')
];

// Get all backups (admin only)
router.get('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const backups = await listBackups();
    res.json({
      success: true,
      backups,
      count: backups.length
    });
  } catch (error) {
    console.error('Failed to list backups:', error);
    res.status(500).json({
      error: 'Failed to list backups',
      code: 'BACKUP_LIST_ERROR'
    });
  }
});

// Create backup (admin only)
router.post('/create', authenticateToken, authorize('admin'), validateBackupRequest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { type = 'full', description } = req.body;
    const backup = await createBackup(type, description);
    
    res.status(201).json({
      success: true,
      message: 'Backup created successfully',
      backup
    });
  } catch (error) {
    console.error('Failed to create backup:', error);
    res.status(500).json({
      error: 'Failed to create backup',
      code: 'BACKUP_CREATE_ERROR'
    });
  }
});

// Restore backup (admin only)
router.post('/restore', authenticateToken, authorize('admin'), validateRestoreRequest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { backupId, confirm } = req.body;
    const result = await restoreBackup(backupId);
    
    res.json({
      success: true,
      message: 'Backup restored successfully',
      result
    });
  } catch (error) {
    console.error('Failed to restore backup:', error);
    res.status(500).json({
      error: 'Failed to restore backup',
      code: 'BACKUP_RESTORE_ERROR'
    });
  }
});

// Delete backup (admin only)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteBackup(parseInt(id));
    
    res.json({
      success: true,
      message: 'Backup deleted successfully',
      result
    });
  } catch (error) {
    console.error('Failed to delete backup:', error);
    res.status(500).json({
      error: 'Failed to delete backup',
      code: 'BACKUP_DELETE_ERROR'
    });
  }
});

// Get backup details (admin only)
router.get('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const backup = await getBackupDetails(parseInt(id));
    
    if (!backup) {
      return res.status(404).json({
        error: 'Backup not found',
        code: 'BACKUP_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      backup
    });
  } catch (error) {
    console.error('Failed to get backup details:', error);
    res.status(500).json({
      error: 'Failed to get backup details',
      code: 'BACKUP_DETAILS_ERROR'
    });
  }
});

// Download backup (admin only)
router.get('/:id/download', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const backup = await getBackupDetails(parseInt(id));
    
    if (!backup) {
      return res.status(404).json({
        error: 'Backup not found',
        code: 'BACKUP_NOT_FOUND'
      });
    }
    
    res.download(backup.filePath, backup.filename);
  } catch (error) {
    console.error('Failed to download backup:', error);
    res.status(500).json({
      error: 'Failed to download backup',
      code: 'BACKUP_DOWNLOAD_ERROR'
    });
  }
});

export default router;
